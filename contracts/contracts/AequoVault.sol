// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AequoVault
 * @notice Vault permettant aux utilisateurs de déposer des tokens qui génèrent des intérêts via Aave
 * @dev Les intérêts générés sont automatiquement partagés entre l'utilisateur et une association caritative
 *
 * Fonctionnement principal :
 * - Les utilisateurs déposent des tokens (ex: USDC) dans le vault
 * - Les tokens sont automatiquement investis dans Aave pour générer des intérêts
 * - Les intérêts sont partagés selon un ratio configurable entre l'utilisateur et son association
 * - Seules les associations whitelistées peuvent recevoir des dons
 */
contract AequoVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ══════════════════════════════════════════════════════════════════════════
    // ÉTAT
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Interface vers le pool Aave v3 pour les opérations de prêt/emprunt
    IPool public immutable aavePool;

    /// @notice Token sous-jacent accepté par le vault (ex: USDC, DAI)
    IERC20 public immutable asset;

    /// @notice aToken reçu en échange des dépôts Aave (représente asset + intérêts)
    /// @dev Le solde d'aToken augmente automatiquement avec les intérêts Aave
    IERC20 public immutable aToken;

    /// @notice Somme totale des montants principaux déposés par tous les utilisateurs
    /// @dev Ne comprend PAS les intérêts, sert de référence pour calculer les gains
    uint256 public totalAssets;

    /// @notice Pourcentage par défaut des intérêts reversés aux associations (en basis points)
    /// @dev 1 basis point = 0.01%, donc 2000 = 20%, 500 = 5%, 10000 = 100%
    uint256 public defaultFeesPercentage = 2000; // 20% par défaut

    /// @notice Dénominateur pour les calculs de pourcentage
    /// @dev 10000 basis points = 100%
    uint256 private constant BASIS_POINTS = 10000;

    /// @notice Pourcentage maximum autorisé pour les fees (50%)
    /// @dev Protège contre une configuration trop élevée
    uint256 private constant MAX_FEES = 5000;

    /// @notice Pourcentage minimum autorisé pour les fees (1%)
    /// @dev Assure une contribution minimale aux associations
    uint256 private constant MIN_FEES = 100;

    /**
     * @notice Structure contenant les informations d'un utilisateur du vault
     * @param depositedAmount Montant principal déposé par l'utilisateur (sans les intérêts)
     * @param associatedAsso Adresse de l'association bénéficiaire choisie par l'utilisateur
     * @param feesPercentage Pourcentage personnalisé de donation (0 = utiliser defaultFeesPercentage)
     */
    struct VaultUserInfo {
        uint256 depositedAmount;
        address associatedAsso;
        uint256 feesPercentage;
    }

    /// @notice Mapping des informations de chaque utilisateur du vault
    mapping(address => VaultUserInfo) public vaultUserInfo;

    /// @notice Mapping des associations autorisées à recevoir des dons
    /// @dev Seule l'admin (owner) peut modifier cette whitelist
    mapping(address => bool) public whitelistedAssociations;

    /// @notice Tracking du montant total reçu par chaque association
    /// @dev Permet de suivre l'historique des donations
    mapping(address => uint256) public associationTotalReceived;

    // ══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Émis lors d'un dépôt d'un utilisateur
    /// @param user Adresse de l'utilisateur qui dépose
    /// @param amount Montant déposé
    event Deposit(address indexed user, uint256 amount);

    /// @notice Émis lors d'un retrait incluant le principal et les intérêts
    /// @param user Adresse de l'utilisateur qui retire
    /// @param principal Montant du capital retiré
    /// @param userInterest Part des intérêts revenant à l'utilisateur
    /// @param assoInterest Part des intérêts reversée à l'association
    event Withdraw(address indexed user, uint256 principal, uint256 userInterest, uint256 assoInterest);

    /// @notice Émis quand une association est ajoutée ou retirée de la whitelist
    /// @param assoAddress Adresse de l'association
    /// @param whitelisted true si ajoutée, false si retirée
    event AssociationWhitelistUpdated(address indexed assoAddress, bool whitelisted);

    /// @notice Émis quand un utilisateur choisit son association bénéficiaire
    /// @param user Adresse de l'utilisateur
    /// @param assoAddress Adresse de l'association choisie
    event UserSetAssociatedAsso(address indexed user, address indexed assoAddress);

    /// @notice Émis lors d'une réclamation d'intérêts sans toucher au principal
    /// @param user Adresse de l'utilisateur qui réclame
    /// @param userShare Montant des intérêts revenant à l'utilisateur
    /// @param association Adresse de l'association bénéficiaire
    /// @param assoShare Montant des intérêts reversés à l'association
    event InterestClaimed(
        address indexed user,
        uint256 userShare,
        address indexed association,
        uint256 assoShare
    );

    /// @notice Émis quand le pourcentage de fees par défaut est modifié
    /// @param oldFees Ancien pourcentage
    /// @param newFees Nouveau pourcentage
    event FeesPercentageUpdated(uint256 oldFees, uint256 newFees);

    /// @notice Émis quand un utilisateur personnalise son pourcentage de donation
    /// @param user Adresse de l'utilisateur
    /// @param feesPercentage Nouveau pourcentage personnalisé
    event UserFeesPercentageUpdated(address indexed user, uint256 feesPercentage);

    // ══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Erreur levée quand une adresse fournie est invalide (0x0)
    error InvalidAddress(string message);

    /// @notice Erreur levée quand un montant est invalide (0 ou incorrect)
    error InvalidAmount(
        string message,
        uint256 amount
    );

    /// @notice Erreur levée quand le solde est insuffisant pour l'opération
    error InsufficientBalance(
        string message,
        uint256 currentBalance,
        uint256 amount
    );

    /// @notice Erreur levée quand une association n'est pas dans la whitelist
    error AssociationNotWhitelisted(
        string message,
        address assoAddress
    );

    /// @notice Erreur levée quand un utilisateur n'a pas configuré d'association
    error NoAssociationSet(
        string message
    );

    /// @notice Erreur levée quand il n'y a pas d'intérêts à réclamer
    error NoInterestToClaim();

    /// @notice Erreur levée quand le pourcentage de fees dépasse le maximum autorisé
    error FeesTooHigh(
        string message, uint256 fees, uint256 maxFees
    );

    /// @notice Erreur levée quand le pourcentage de fees est en dessous du minimum
    error FeesTooLow(
        string message, uint256 fees, uint256 minFees
    );

    /// @notice Erreur levée quand une opération ne change rien à l'état actuel
    error NoChange();

    /// @notice Erreur levée quand un retrait depuis Aave échoue
    error WithdrawFailed();

    // ══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Initialise le vault avec les adresses des contrats Aave
     * @param _aavePool Adresse du pool Aave v3
     * @param _asset Adresse du token sous-jacent (ex: USDC)
     * @param _aToken Adresse du aToken correspondant (ex: aUSDC)
     * @dev Les trois adresses doivent être non-nulles
     * @dev Le déployeur devient automatiquement le owner du contrat
     */
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
     * @dev Processus :
     *      1. Transfert des tokens depuis l'utilisateur vers le vault
     *      2. Approbation du pool Aave pour utiliser les tokens
     *      3. Supply des tokens vers Aave (le vault reçoit des aTokens en retour)
     *      4. Mise à jour de la comptabilité interne
     * @dev Protection contre la réentrance via le modifier nonReentrant
     */
    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount({
            message: "Deposit amount must be greater than zero",
            amount: amount
        });

        // Étape 1 : Transfer des tokens de l'utilisateur vers le vault
        asset.safeTransferFrom(msg.sender, address(this), amount);

        // Étape 2 : Autoriser le pool Aave à dépenser nos tokens
        asset.safeIncreaseAllowance(address(aavePool), amount);

        // Étape 3 : Supply vers Aave - les aTokens sont mintés et envoyés au vault
        // Le dernier paramètre (0) est le referral code (non utilisé)
        aavePool.supply(address(asset), amount, address(this), 0);

        // Étape 4 : Mise à jour de la comptabilité interne
        vaultUserInfo[msg.sender].depositedAmount += amount;
        totalAssets += amount;

        emit Deposit(msg.sender, amount);
    }

    /**
     * @notice Retire les fonds + distribue les intérêts à l'utilisateur et son association
     * @param amount Montant du principal à retirer
     * @dev Processus :
     *      1. Vérifications : montant valide, solde suffisant, association configurée
     *      2. Calcul des intérêts accumulés et de leur répartition
     *      3. Mise à jour de l'état (CEI pattern : Checks-Effects-Interactions)
     *      4. Retrait depuis Aave du montant total (principal + intérêts)
     *      5. Distribution du principal + part utilisateur des intérêts
     *      6. Distribution de la part association des intérêts
     * @dev Suit le pattern CEI pour éviter les attaques de réentrance
     * @dev Requiert qu'une association soit configurée pour l'utilisateur
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
        // Retourne : intérêts totaux, part utilisateur, part association
        (
            uint256 totalInterest,
            uint256 userInterestShare,
            uint256 assoInterestShare
        ) = calculateInterest(msg.sender);

        // Montant total à retirer d'Aave = principal + tous les intérêts
        uint256 totalToWithdraw = amount + totalInterest;

        // ⚠️ Mise à jour état AVANT les interactions externes (CEI pattern)
        userInfo.depositedAmount -= amount;
        totalAssets -= amount;

        // Retirer d'Aave : brûle les aTokens et reçoit les assets
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
     * @dev Permet à l'utilisateur de retirer ses gains tout en laissant son capital investi
     * @dev Processus :
     *      1. Vérifications : dépôt existant, association configurée
     *      2. Calcul des intérêts disponibles
     *      3. Retrait des intérêts depuis Aave
     *      4. Distribution à l'utilisateur et à son association
     * @dev Le montant principal (depositedAmount) reste inchangé
     * @dev Note : Réfléchir à l'utilité de cette fonction vs withdraw partiel
     */
    function claimInterest() external nonReentrant {
        VaultUserInfo storage userInfo = vaultUserInfo[msg.sender];

        if (userInfo.depositedAmount == 0) revert InsufficientBalance(
            "No deposited balance to claim interest from",
            userInfo.depositedAmount,
            1
        );

        if (userInfo.associatedAsso == address(0)) revert NoAssociationSet(
            "No associated association set for user"
        );

        // Calculer les intérêts accumulés et leur répartition
        (
            uint256 totalInterest,
            uint256 userShare,
            uint256 assoShare
        ) = calculateInterest(msg.sender);

        if (totalInterest == 0) revert NoInterestToClaim();

        // Retirer uniquement les intérêts d'Aave (pas le principal)
        uint256 withdrawn = aavePool.withdraw(address(asset), totalInterest, address(this));
        if (withdrawn < totalInterest) revert WithdrawFailed();

        // Distribuer la part utilisateur
        if (userShare > 0) {
            asset.safeTransfer(msg.sender, userShare);
        }

        // Distribuer la part association
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

        if(newFeesPercentage < MIN_FEES) revert FeesTooLow(
            "Default fees percentage below minimum",
            newFeesPercentage,
            MIN_FEES
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
     * @dev Formule de calcul :
     *      1. Intérêts globaux = solde aToken actuel - total des dépôts
     *      2. Intérêts utilisateur = (dépôt user / total dépôts) * intérêts globaux
     *      3. Part asso = intérêts user * pourcentage fees
     *      4. Part user = intérêts user - part asso
     * @dev Retourne (0,0,0) si pas de dépôt ou si les intérêts sont négatifs
     * @dev Note : Retravailler le calcul des intérêts pour plus de précision
     */
    function calculateInterest(address user) public view returns (
        uint256 totalInterest,
        uint256 userShare,
        uint256 assoShare
    ) {
        VaultUserInfo storage userInfo = vaultUserInfo[user];

        // Cas de base : pas de dépôt ou vault vide
        if (userInfo.depositedAmount == 0 || totalAssets == 0) {
            return (0, 0, 0);
        }

        // Valeur actuelle du vault en aTokens (augmente automatiquement avec les intérêts Aave)
        uint256 currentVaultValue = aToken.balanceOf(address(this));

        // Si pas de profit, pas d'intérêts à distribuer
        if(currentVaultValue <= totalAssets) {
            return (0, 0, 0);
        }

        // Calcul des intérêts globaux générés par le vault
        uint256 globalInterest = currentVaultValue - totalAssets;

        // Calcul de la part proportionnelle de l'utilisateur
        // Formule : (dépôt_utilisateur * intérêts_globaux) / total_dépôts
        totalInterest = (userInfo.depositedAmount * globalInterest) / totalAssets;

        // Déterminer le pourcentage de fees à appliquer
        // Si l'utilisateur a un pourcentage personnalisé (≠ 0), on l'utilise
        // Sinon, on utilise le pourcentage par défaut
        uint256 feesToApply = userInfo.feesPercentage > 0
            ? userInfo.feesPercentage
            : defaultFeesPercentage;

        // Répartition des intérêts selon le pourcentage
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
     * @dev Le solde d'aToken augmente automatiquement avec les intérêts générés par Aave
     */
    function getTotalVaultValue() external view returns (uint256) {
        return aToken.balanceOf(address(this));
    }

    /**
     * @notice Retourne les intérêts globaux générés par le vault
     * @return Montant des intérêts générés par tous les dépôts combinés
     * @dev Formule : solde aToken actuel - total des dépôts principaux
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
     * @return depositedAmount Montant principal déposé par l'utilisateur
     * @return associatedAsso Adresse de l'association bénéficiaire
     * @return pendingInterest Total des intérêts accumulés
     * @return userInterestShare Part des intérêts qui revient à l'utilisateur
     * @return assoInterestShare Part des intérêts qui sera versée à l'association
     * @return feesPercentage Pourcentage de fees effectivement appliqué (personnalisé ou défaut)
     * @dev Fonction utile pour les frontends pour afficher un dashboard utilisateur
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

        // Calcul des intérêts en temps réel
        (pendingInterest, userInterestShare, assoInterestShare) = calculateInterest(user);

        // Récupération du pourcentage effectif appliqué
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
}
