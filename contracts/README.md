# Æquo Protocol - Smart Contracts

Contrats intelligents Solidity pour Æquo, une plateforme DeFi permettant de générer des rendements sur USDC via Aave V3 tout en reversant automatiquement 20% des intérêts à des associations caritatives.

## 🚀 Technologies

- **Hardhat 3.0** - Framework de développement Ethereum
- **Solidity 0.8.28** - Langage de smart contracts
- **Viem** - Bibliothèque TypeScript pour interactions Ethereum
- **Node:test** - Test runner natif Node.js
- **OpenZeppelin Contracts 5.4** - Bibliothèques sécurisées (Ownable, ReentrancyGuard, SafeERC20)
- **Aave V3** - Protocole de prêt pour génération de rendement
- **Hardhat Ignition** - Système de déploiement déclaratif
- **Hardhat Verify** - Vérification automatique sur Etherscan

## 📁 Structure du projet

```
contracts/
├── contracts/
│   └── AequoVault.sol          # Contrat principal du vault
├── test/
│   └── AequoVault.test.ts      # Suite de tests (23 tests)
├── ignition/
│   ├── modules/
│   │   ├── AequoVaultMainnet.ts   # Module déploiement Mainnet/Fork
│   │   ├── AequoVaultSepolia.ts   # Module déploiement Sepolia
│   │   └── AequoVaultLocalhost.ts # Module déploiement local
│   └── deployments/              # Historique des déploiements
├── scripts/
│   ├── setupLocalFork.ts         # Script setup fork local (whale, associations)
│   └── send-op-tx.ts            # Exemple transaction Optimism
├── artifacts/                    # Artefacts de compilation
├── coverage/                     # Rapports de couverture de tests
├── hardhat.config.ts            # Configuration Hardhat
├── tsconfig.json                # Configuration TypeScript
└── package.json                 # Dépendances du projet
```

## 📜 Contrat AequoVault

### Description

Smart contract permettant aux utilisateurs de :
- Déposer des USDC dans un vault sécurisé
- Générer des rendements automatiquement via Aave V3
- Associer une organisation caritative à leur dépôt
- Distribuer automatiquement 80% des intérêts à l'utilisateur et 20% à l'association
- Retirer le capital et les intérêts à tout moment

### Fonctionnalités principales

| Fonction | Description | Visibilité |
|----------|-------------|------------|
| `deposit(uint256 amount)` | Dépose USDC et investit dans Aave | Public |
| `withdraw(uint256 amount)` | Retire capital + distribue intérêts (80/20) | Public |
| `claimInterest()` | Réclame uniquement les intérêts | Public |
| `setAssociatedAssoWithUser(address)` | Associe une organisation | Public |
| `setAssociationWhitelist(address, bool)` | Gère la whitelist | Owner only |
| `calculateInterest(address)` | Calcule intérêts accumulés | View |
| `getUserInfo(address)` | Récupère infos utilisateur complètes | View |
| `getAssociationTotalReceived(address)` | Total reçu par une association | View |

### Événements

- `Deposit(address user, uint256 amount)` - Émis lors d'un dépôt
- `Withdraw(address user, uint256 principal, uint256 userInterest, uint256 assoInterest)` - Émis lors d'un retrait
- `InterestClaimed(address user, uint256 userShare, address association, uint256 assoShare)` - Émis lors d'un claim
- `AssociationWhitelistUpdated(address assoAddress, bool whitelisted)` - Modification whitelist
- `UserSetAssociatedAsso(address user, address assoAddress)` - Association sélectionnée
- `FeesPercentageUpdated(uint256 oldFees, uint256 newFees)` - Mise à jour frais globaux
- `UserFeesPercentageUpdated(address user, uint256 feesPercentage)` - Frais personnalisés

### Dépendances

- **Aave V3 Pool** - `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2` (Mainnet)
- **USDC** - `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` (Mainnet, 6 decimals)
- **aUSDC** - `0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c` (Mainnet)
- **USDC Sepolia** - `0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8` (Testnet Aave Faucet)

## 🛠️ Installation

### Prérequis

- Node.js >= 22
- npm ou pnpm

### Installation des dépendances

```bash
npm install
```

### Configuration des variables d'environnement

Créer un fichier `.env` ou utiliser `hardhat-keystore` :

```bash
# Méthode 1 : Fichier .env
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
SEPOLIA_PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY

# Méthode 2 : Hardhat Keystore (recommandé)
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
npx hardhat keystore set MAINNET_RPC_URL
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set ETHERSCAN_API_KEY
```

## 🧪 Tests

Le projet utilise **node:test** (test runner natif Node.js) avec **viem** pour les interactions blockchain.

### Exécuter tous les tests

```bash
npx hardhat test
```

### Exécuter les tests avec couverture

```bash
npx hardhat test --coverage
```

### Exécuter les tests sur fork Mainnet

```bash
npx hardhat test --network hardhatMainnet
```

### Suite de tests

**23 tests organisés en 5 catégories :**

1. **Initialization** - Déploiement et configuration
2. **Deposit and Withdrawal** - Opérations core du vault
3. **Interest Calculation** - Distribution Aave (80/20)
4. **Association Management** - Whitelist et configuration fees
5. **Aave Integration** - Validation intégration protocole

## 🚀 Déploiement

### Déploiement sur Sepolia Testnet

```bash
# Avec Hardhat Ignition
npx hardhat ignition deploy ignition/modules/AequoVaultSepolia.ts --network sepolia

# Vérification sur Etherscan
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> \
  "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951" \
  "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8" \
  "0x16dA4541aD1807f4443d92D26044C1147406EB80"
```

**Déploiement actuel :**
- Adresse : `0x41B6c0B348406812257e060A7dd42F1aa22c8356`
- Date : 6 décembre 2025
- [Voir sur Etherscan](https://sepolia.etherscan.io/address/0x41B6c0B348406812257e060A7dd42F1aa22c8356)

### Déploiement sur fork Mainnet local

```bash
# Terminal 1 : Démarrer un nœud Hardhat avec fork
npx hardhat node --network hardhatMainnet

# Terminal 2 : Déployer le contrat
npx hardhat ignition deploy ignition/modules/AequoVaultMainnet.ts --network localhost

# Terminal 3 : Setup du fork (whale USDC + associations)
npx hardhat run scripts/setupLocalFork.ts
```

Le script `setupLocalFork.ts` configure automatiquement :
- Distribution de 50 ETH aux comptes de test
- Distribution de 10,000 USDC par compte (via whale impersonation)
- Ajout des associations du fichier `data/association.json` à la whitelist

### Déploiement sur Mainnet

```bash
# Utiliser le module Mainnet
npx hardhat ignition deploy ignition/modules/AequoVaultMainnet.ts --network mainnet

# Vérification automatique sur Etherscan
npx hardhat verify --network mainnet <CONTRACT_ADDRESS> \
  "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2" \
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" \
  "0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c"
```

## 🌐 Réseaux configurés

| Réseau | Type | Description | ChainId |
|--------|------|-------------|---------|
| `hardhatMainnet` | Fork | Fork Mainnet au bloc 19,000,000 | 31337 |
| `hardhat` | Fork | Fork Mainnet (alias) | 31337 |
| `localhost` | HTTP | Nœud local Hardhat | 31337 |
| `sepolia` | HTTP | Sepolia Testnet | 11155111 |
| `hardhatOp` | Fork | Fork Optimism Mainnet | - |

## 📊 Couverture de tests

Génération du rapport de couverture :

```bash
npx hardhat test --coverage
```

Le rapport est généré dans `coverage/lcov.info` et peut être visualisé avec des outils comme Coverage Gutters (VS Code).

## 🔧 Scripts utiles

### Compilation

```bash
# Compiler les contrats
npx hardhat compile

# Nettoyer les artefacts
npx hardhat clean
```

### Console Hardhat

```bash
# Console interactive sur fork local
npx hardhat console --network hardhatMainnet

# Console sur Sepolia
npx hardhat console --network sepolia
```

### Vérification de contrat

```bash
npx hardhat verify --network <NETWORK> <ADDRESS> <CONSTRUCTOR_ARGS>
```

## 📝 Modules Ignition

### AequoVaultMainnet

Déploiement sur Mainnet ou fork Mainnet :
- Aave Pool : `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2`
- USDC : `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- aUSDC : `0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c`

### AequoVaultSepolia

Déploiement sur Sepolia Testnet :
- Aave Pool : `0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951`
- USDC : `0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8` (Faucet Aave)
- aUSDC : `0x16dA4541aD1807f4443d92D26044C1147406EB80`

## 🔐 Sécurité

### Audits et bonnes pratiques

- ✅ OpenZeppelin Contracts v5.4 (audités)
- ✅ ReentrancyGuard sur toutes les fonctions sensibles
- ✅ SafeERC20 pour transferts sécurisés
- ✅ Checks-Effects-Interactions pattern
- ✅ Custom errors pour économie de gas
- ✅ Immutable pour adresses critiques
- ⚠️ **Non audité** - Ne pas utiliser en production sans audit professionnel

### Limites de sécurité

- Frais paramétrables entre 1% (`MIN_FEES`) et 50% (`MAX_FEES`)
- Ownership centralisé (possibilité de passer à une gouvernance DAO)
- Dépendance au protocole Aave V3

## 🐛 Débogage

### Activer les logs détaillés

```bash
# Mode verbose
npx hardhat test --verbose

# Afficher les stack traces complètes
npx hardhat test --show-stack-traces
```

### Fork block debugging

Pour déboguer à un bloc spécifique, modifier `hardhat.config.ts` :

```typescript
forking: {
  url: configVariable("MAINNET_RPC_URL"),
  blockNumber: 19500000, // Bloc spécifique
}
```

## 🔗 Ressources

- [Documentation Hardhat 3](https://hardhat.org/docs/getting-started#getting-started-with-hardhat-3)
- [Documentation Aave V3](https://docs.aave.com/developers/getting-started/readme)
- [Documentation Viem](https://viem.sh/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/5.x/)
- [Hardhat Ignition](https://hardhat.org/ignition/docs/getting-started)

---

Développé avec ❤️ pour Æquo Protocol | [Documentation principale](../README.md)
