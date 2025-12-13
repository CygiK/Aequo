// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";
// import "@aave/core-v3/contracts/interfaces/IAaveOracle.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "hardhat/console.sol";

contract AequoVaultV2 is Ownable, ReentrancyGuard, ERC4626 {        
    using SafeERC20 for IERC20;
    // ══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Adresse du pool Aave v3
    IPool public immutable aavePool;

    /// @notice Adresse du aToken correspondant (ex: aUSDC)
    IERC20 public immutable aToken;

    /// @notice Structure pour stocker les informations des utilisateurs dans le vault
    /// @dev Contient les informations sur le montant déposé, l'association associée, la part dans le vault et le pourcentage à donner
    struct VaultUserInfo {
        address associatedAsso;
        uint256 percentageToDonate;
    }

    /// @notice Mapping des informations des utilisateurs dans le vault
    mapping(address => VaultUserInfo) public vaultUserInfo;

    /// @notice Mapping des associations whitelistées
    mapping(address => bool) public whitelistedAssociations;

    uint256 public constant DONATION_PERCENTAGE = 3_000; // 30% de chaque récolte est distribué aux associations
    uint256 internal lastHarvestTimestamp;
    uint256 public harvestInterval = 1 days;
    uint256 public lastHarvestAmount;
    uint256 internal totalAssetLastCheckpoint;

    // ══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Erreur levée lorsqu'une adresse fournie est invalide (adresse nulle)
    error InvalidAddress(string message);

    /// @notice Erreur levée lorsqu'un utilisateur tente d'effectuer une opération non autorisée
    error WrongAmountValue(string message, uint256 value);

    /// @notice Erreur levée lorsqu'une association n'est pas dans la whitelist
    error AssociationNotWhitelisted(string message, address assoAddress);

    /// @notice Erreur levée lorsqu'il n'y a pas de changement dans une opération
    error NoChange();

    // // =═════════════════════════════════════════════════════════════════════════
    // // EVENTS
    // // ══════════════════════════════════════════════════════════════════════════

    /// @notice Événement émis lorsqu'un utilisateur associe une association à son compte
    event UserSetAssociatedAsso(address indexed user, address indexed assoAddress);

    /// @notice Événement émis lorsqu'une association est ajoutée ou retirée de la whitelist
    event AssociationWhitelistUpdated(address indexed assoAddress, bool whitelisted);

    /// @notice Événement émis lorsqu'un utilisateur dépose des fonds dans le vault
    event VaultDeposit(address indexed user, address indexed vault, uint256 amount, uint256 shares);

    /// @notice Événement émis lorsqu'un utilisateur retire des fonds du vault
    event VaultWithdraw(address indexed user, address indexed vault, uint256 amount, uint256 shares);

    /// @notice Événement émis lorsqu'un utilisateur approuve le vault à dépenser ses fonds
    event VaultApprove(address indexed user, address indexed vault, uint256 amount);

    /// @notice Événement émis lorsqu'une récolte des intérêts est effectuée
    event HarvestExecuted(uint256 profit, uint256 feeAmount);

    // ══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Initialise le vault avec les adresses des contrats Aave
     * @param _aavePool Adresse du pool Aave v3
     * @param _asset Adresse du token sous-jacent (ex: USDC)
     * @param _aToken Adresse du aToken correspondant (ex: aUSDC)
     * @param _name Nom du token du vault
     * @param _symbol Symbole du token du vault
     * @dev Les trois adresses doivent être non-nulles
     * @dev Le déployeur devient automatiquement le owner du contrat
     */
    constructor(
        address _aavePool,
        address _asset,
        address _aToken,
        string memory _name,
        string memory _symbol
    ) Ownable(msg.sender) ERC4626(IERC20(_asset)) ERC20(_name, _symbol) {
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
        aToken = IERC20(_aToken);
    }


// ══════════════════════════════════════════════════════════════════════════
// MONEY MANAGEMENT FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Dépose des fonds dans le vault et les supply dans Aave
     * @param _amount Montant à déposer
     * @dev L'utilisateur doit avoir approuvé le vault à dépenser ses fonds au préalable
     */
    function depositFundIntoVault(uint256 _amount) external nonReentrant {
        if(_amount <= 0) revert WrongAmountValue({
            message: "Deposit amount must be greater than zero",
            value: _amount
        });

        _checkPoint();

        uint256 shares = deposit(_amount, msg.sender);
        IERC20(asset()).safeIncreaseAllowance(address(aavePool), _amount);

        aavePool.supply(address(asset()), _amount, address(this), 0);

        emit VaultDeposit(msg.sender, address(this), _amount, shares);
    }

    /**
     * @notice Retire des fonds du vault et les withdraw d'Aave
     * @param _amount Montant à retirer
     * @dev Les fonds sont envoyés directement à l'utilisateur
     */
    function withdrawFundFromVault(uint256 _amount) external nonReentrant {
        uint256 currentAsset = totalAssets();
        if(_amount <= 0) revert WrongAmountValue({
            message: "Withdraw amount must be greater than zero",
            value: _amount
        });

        if(currentAsset < _amount) revert WrongAmountValue({
            message: "Insufficient assets in the vault",
            value: _amount
        });

        _checkPoint();
        // uint256 currentValueOfUserShares = convertToAssets(balanceOf(msg.sender));
        // if(currentValueOfUserShares <= _amount) revert WrongAmountValue({
        //     message: "Insufficient shares for the requested withdraw amount",
        //     value: _amount
        // });

        aavePool.withdraw(address(asset()), _amount, address(this));
        uint256 shares = withdraw(_amount, msg.sender, msg.sender);
        emit VaultWithdraw(msg.sender, address(this), _amount, shares);
    }

    /// @notice Récolte les intérêts générés et les distribue aux associations
    /// @dev Cette fonction peut être appelée périodiquement par le propriétaire du contrat ou un tiers
    function harvest() external nonReentrant {
        _checkPoint();
    }

    /// @notice Met à jour le checkpoint pour calculer les profits réalisés depuis le dernier checkpoint
    function _checkPoint() internal {
        uint256 currentAsset = totalAssets();
        uint256 profit = currentAsset - totalAssetLastCheckpoint;

        if (profit > 0) {
            lastHarvestAmount = profit;
            lastHarvestTimestamp = block.timestamp;
            uint256 feeAmount = profit * DONATION_PERCENTAGE / 10_000;
            uint256 feeShares = convertToShares(feeAmount);
            _mint(owner(), feeShares);

            emit HarvestExecuted(profit, feeAmount);
        }
        
        totalAssetLastCheckpoint = currentAsset;
    }

    function totalAssets() public view override returns (uint256) {
        uint256 underlyingOnHand = IERC20(asset()).balanceOf(address(this));
        uint256 aTokenBal = IERC20(aToken).balanceOf(address(this));
        return underlyingOnHand + aTokenBal;
    }

// ══════════════════════════════════════════════════════════════════════════
// ASSO MANAGEMENT FUNCTIONS
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
}