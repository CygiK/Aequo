// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AequoVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ══════════════════════════════════════════════════════════════════════════
    // ÉTAT
    // ══════════════════════════════════════════════════════════════════════════

    IPool public immutable aavePool;
    IERC20 public immutable asset;
    IERC20 public immutable aToken; // aToken Aave correspondant à l'asset

    uint256 public totalAssets; // Total des dépôts (sans les intérêts)
    
    // Pourcentage des intérêts reversés aux associations (en basis points)
    // 2000 = 20%, 500 = 5%, 10000 = 100%
    uint256 public defaultFeesPercentage = 2000; // 20% par défaut
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant MAX_FEES = 5000; // 50% maximum
    uint256 private constant MIN_FEES = 100; // 1% minimum

    struct VaultUserInfo {
        uint256 depositedAmount;
        address associatedAsso;
        uint256 feesPercentage; // Pourcentage personnalisé (0 = utiliser default)
    }

    mapping(address => VaultUserInfo) public vaultUserInfo;
    mapping(address => bool) public whitelistedAssociations;
    mapping(address => uint256) public associationTotalReceived; // Tracking des dons par asso

    // ══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ══════════════════════════════════════════════════════════════════════════

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 principal, uint256 userInterest, uint256 assoInterest);
    event AssociationWhitelistUpdated(address indexed assoAddress, bool whitelisted);
    event UserSetAssociatedAsso(address indexed user, address indexed assoAddress);
    event InterestClaimed(
        address indexed user,
        uint256 userShare,
        address indexed association,
        uint256 assoShare
    );
    event FeesPercentageUpdated(uint256 oldFees, uint256 newFees);
    event UserFeesPercentageUpdated(address indexed user, uint256 feesPercentage);

    // ══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ══════════════════════════════════════════════════════════════════════════

    error InvalidAddress(string message);
    error InvalidAmount(
        string message,
        uint256 amount
    );
    error InsufficientBalance(
        string message,
        uint256 currentBalance,
        uint256 amount
    );
    error AssociationNotWhitelisted(
        string message,
        address assoAddress
    );
    error NoAssociationSet(
        string message
    );
    error NoInterestToClaim();
    error FeesTooHigh(
        string message, uint256 fees, uint256 maxFees
    );
    error FeesTooLow(
        string message, uint256 fees, uint256 minFees
    );
    error NoChange();
    error WithdrawFailed();

    // ══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════════════════

    constructor(
        address _aavePool,
        address _asset,
        address _aToken
    ) Ownable(msg.sender) {
        if (_aavePool == address(0)) revert InvalidAddress({
            message: "Aave Pool address cannot be zero"
        });
        if (_asset == address(0)) revert InvalidAddress({
            message: "Asset address cannot be zero"
        });
        if (_aToken == address(0)) revert InvalidAddress({
            message: "aToken address cannot be zero"
        });

        aavePool = IPool(_aavePool);
        asset = IERC20(_asset);
        aToken = IERC20(_aToken);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // FONCTIONS PRINCIPALES
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Dépose des tokens dans le vault et les investit dans Aave
     * @param amount Montant à déposer
     */
    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount({
            message: "Deposit amount must be greater than zero",
            amount: amount
        });

        // Transfer user → vault
        asset.safeTransferFrom(msg.sender, address(this), amount);

        // Approve Aave
        asset.safeIncreaseAllowance(address(aavePool), amount);

        // Supply vers Aave (aTokens mintés vers ce vault)
        aavePool.supply(address(asset), amount, address(this), 0);

        // Mise à jour état
        vaultUserInfo[msg.sender].depositedAmount += amount;
        totalAssets += amount;

        emit Deposit(msg.sender, amount);
    }

    /**
     * @notice Retire les fonds + distribue les intérêts à l'utilisateur et son association
     * @param amount Montant du principal à retirer
     */
    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount(
            "Withdraw amount must be greater than zero",
            amount
        );
        
        VaultUserInfo storage userInfo = vaultUserInfo[msg.sender];

        if(userInfo.depositedAmount == 0) revert InvalidAmount(
            "User has no deposits",
            userInfo.depositedAmount
        );

        if (amount > userInfo.depositedAmount) revert InsufficientBalance(
            "Insufficient deposited balance",
            userInfo.depositedAmount,
            amount
        );

        if(userInfo.associatedAsso == address(0)) revert NoAssociationSet(
            "No associated association set for user"
        );

        // Calculer les intérêts avant de modifier l'état
        (
            uint256 totalInterest,
            uint256 userInterestShare,
            uint256 assoInterestShare
        ) = calculateInterest(msg.sender);

        // Montant total à retirer d'Aave
        uint256 totalToWithdraw = amount + totalInterest;

        // Mise à jour état AVANT les interactions externes 
        userInfo.depositedAmount -= amount;
        totalAssets -= amount;

        // Retirer d'Aave
        uint256 withdrawnAmount = aavePool.withdraw(address(asset), totalToWithdraw, address(this));
        if (withdrawnAmount < totalToWithdraw) revert WithdrawFailed();

        // Distribuer au user (principal + sa part d'intérêts)
        uint256 userTotal = amount + userInterestShare;
        asset.safeTransfer(msg.sender, userTotal);

        // Distribuer à l'association si configurée et s'il y a des intérêts
        if (assoInterestShare > 0 && userInfo.associatedAsso != address(0)) {
            asset.safeTransfer(userInfo.associatedAsso, assoInterestShare);
            associationTotalReceived[userInfo.associatedAsso] += assoInterestShare;
        }

        emit Withdraw(msg.sender, amount, userInterestShare, assoInterestShare);
    }

    /**
     * @notice Réclame uniquement les intérêts sans toucher au principal
     */
    function claimInterest() external nonReentrant { // reflechir a l'utilité de cette function.
        VaultUserInfo storage userInfo = vaultUserInfo[msg.sender];
        
        if (userInfo.depositedAmount == 0) revert InsufficientBalance(
            "No deposited balance to claim interest from",
            userInfo.depositedAmount,
            1
        );

        if (userInfo.associatedAsso == address(0)) revert NoAssociationSet(
            "No associated association set for user"
        );

        // Calculer les intérêts
        (
            uint256 totalInterest,
            uint256 userShare,
            uint256 assoShare
        ) = calculateInterest(msg.sender);

        if (totalInterest == 0) revert NoInterestToClaim();

        // Retirer les intérêts d'Aave
        uint256 withdrawn = aavePool.withdraw(address(asset), totalInterest, address(this));
        if (withdrawn < totalInterest) revert WithdrawFailed();

        // Distribuer
        if (userShare > 0) {
            asset.safeTransfer(msg.sender, userShare);
        }

        if (assoShare > 0) {
            asset.safeTransfer(userInfo.associatedAsso, assoShare);
            associationTotalReceived[userInfo.associatedAsso] += assoShare;
        }

        emit InterestClaimed(msg.sender, userShare, userInfo.associatedAsso, assoShare);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // FONCTIONS ASSOCIATION
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Associe une association whitelistée à l'utilisateur
     * @param assoAddress Adresse de l'association
     */
    function setAssociatedAssoWithUser(address assoAddress) external {
        if (!whitelistedAssociations[assoAddress]) revert AssociationNotWhitelisted({
            message: "Association is not whitelisted",
            assoAddress: assoAddress
        });

        vaultUserInfo[msg.sender].associatedAsso = assoAddress;

        emit UserSetAssociatedAsso(msg.sender, assoAddress);
    }

    /**
     * @notice Permet à l'utilisateur de définir son pourcentage de fees personnalisé
     * @param feesPercentage Pourcentage en basis points (0 = utiliser default)
     */
    function setUserFeesPercentage(uint256 feesPercentage) external {
        if (feesPercentage > MAX_FEES) revert FeesTooHigh(
            "User fees percentage exceeds maximum",
            feesPercentage,
            MAX_FEES
        );

        if (feesPercentage != 0 && feesPercentage < MIN_FEES) revert FeesTooLow(
            "User fees percentage below minimum",
            feesPercentage,
            MIN_FEES
        );

        vaultUserInfo[msg.sender].feesPercentage = feesPercentage;

        emit UserFeesPercentageUpdated(msg.sender, feesPercentage);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // FONCTIONS ADMIN
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Ajoute ou retire une association de la whitelist
     * @param assoAddress Adresse de l'association
     * @param whitelisted Nouveau statut
     */
    function setAssociationWhitelist(address assoAddress, bool whitelisted) external onlyOwner {
        if (assoAddress == address(0)) revert InvalidAddress({
            message: "Association address cannot be zero"
        });
        if (whitelisted == whitelistedAssociations[assoAddress]) revert NoChange();

        whitelistedAssociations[assoAddress] = whitelisted;

        emit AssociationWhitelistUpdated(assoAddress, whitelisted);
    }

    /**
     * @notice Modifie le pourcentage de fees par défaut
     * @param newFeesPercentage Nouveau pourcentage en basis points
     */
    function setDefaultFeesPercentage(uint256 newFeesPercentage) external onlyOwner {
        if (newFeesPercentage > MAX_FEES) revert FeesTooHigh(
            "Default fees percentage exceeds maximum",
            newFeesPercentage,
            MAX_FEES
        );

        uint256 oldFees = defaultFeesPercentage;
        defaultFeesPercentage = newFeesPercentage;

        emit FeesPercentageUpdated(oldFees, newFeesPercentage);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // FONCTIONS DE CALCUL
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Calcule les intérêts d'un utilisateur et leur répartition
     * @param user Adresse de l'utilisateur
     * @return totalInterest Intérêts totaux de l'utilisateur
     * @return userShare Part revenant à l'utilisateur
     * @return assoShare Part revenant à l'association
     */
    function calculateInterest(address user) public view returns ( // retravailler le caclul des interets.
        uint256 totalInterest,
        uint256 userShare,
        uint256 assoShare
    ) {
        VaultUserInfo storage userInfo = vaultUserInfo[user];

        if (userInfo.depositedAmount == 0 || totalAssets == 0) {
            return (0, 0, 0);
        }

        // Valeur actuelle du vault (aTokens = dépôts + intérêts)
        uint256 currentVaultValue = aToken.balanceOf(address(this));

        if(currentVaultValue <= totalAssets) {
            return (0, 0, 0);
        }

        uint256 globalInterest = currentVaultValue - totalAssets;

        // Part proportionnelle de l'utilisateur
        // (son dépôt * total des intérêts ) / total des actifs
        totalInterest = (userInfo.depositedAmount * globalInterest) / totalAssets;

        // Déterminer le pourcentage à appliquer
        uint256 feesToApply = userInfo.feesPercentage > 0 
            ? userInfo.feesPercentage 
            : defaultFeesPercentage;

        // Répartition
        assoShare = (totalInterest * feesToApply) / BASIS_POINTS;
        userShare = totalInterest - assoShare;

        return (totalInterest, userShare, assoShare);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // FONCTIONS DE LECTURE
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Retourne la valeur totale du vault (dépôts + intérêts)
     * @return Valeur en aTokens
     */
    function getTotalVaultValue() external view returns (uint256) {
        return aToken.balanceOf(address(this));
    }

    /**
     * @notice Retourne les intérêts globaux générés par le vault
     * @return Montant des intérêts
     */
    function getGlobalInterest() external view returns (uint256) {
        uint256 currentValue = aToken.balanceOf(address(this));
        
        if (currentValue > totalAssets) {
            return currentValue - totalAssets;
        }

        return 0;
    }

    /**
     * @notice Retourne les informations complètes d'un utilisateur
     * @param user Adresse de l'utilisateur
     * @return depositedAmount Montant déposé
     * @return associatedAsso Association liée
     * @return pendingInterest Intérêts en attente
     * @return userInterestShare Part user des intérêts
     * @return assoInterestShare Part association des intérêts
     * @return feesPercentage Pourcentage de fees appliqué
     */
    function getUserInfo(address user) external view returns (
        uint256 depositedAmount,
        address associatedAsso,
        uint256 pendingInterest,
        uint256 userInterestShare,
        uint256 assoInterestShare,
        uint256 feesPercentage
    ) {
        VaultUserInfo storage userInfo = vaultUserInfo[user];
        
        depositedAmount = userInfo.depositedAmount;
        associatedAsso = userInfo.associatedAsso;
        
        (pendingInterest, userInterestShare, assoInterestShare) = calculateInterest(user);
        
        feesPercentage = userInfo.feesPercentage > 0 
            ? userInfo.feesPercentage 
            : defaultFeesPercentage;

        return (
            depositedAmount,
            associatedAsso,
            pendingInterest,
            userInterestShare,
            assoInterestShare,
            feesPercentage
        );
    }

    /**
     * @notice Retourne le total reçu par une association
     * @param assoAddress Adresse de l'association
     * @return Montant total reçu
     */
    function getAssociationTotalReceived(address assoAddress) external view returns (uint256) {
        return associationTotalReceived[assoAddress];
    }
}
