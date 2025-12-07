# Æquo 🤝

> **Finance décentralisée au service de l'impact social**

Æquo est une application décentralisée (DApp) qui connecte la DeFi et la solidarité en permettant aux utilisateurs de générer des rendements sur leurs actifs numériques tout en reversant automatiquement une partie des intérêts à des associations caritatives.

---

## 📋 Table des matières

- [Vue d'ensemble](#-vue-densemble)
- [Architecture](#️-architecture)
- [Composants](#-composants)
- [Frontend](#-frontend)
- [Configuration](#-configuration)
- [Installation](#-installation)
- [Workflow Git](#-workflow-git)
- [CI/CD](#-cicd)
- [Roadmap](#-roadmap)
- [Licence](#-licence)

---

## 🎯 Vue d'ensemble

### Objectif

Æquo crée une passerelle entre la finance décentralisée (DeFi) et l'impact social en permettant aux utilisateurs de générer des rendements sur leurs dépôts USDC via **Aave V3** tout en reversant automatiquement 20% des intérêts à des associations caritatives de leur choix.

### Fonctionnalités implémentées

- ✅ **Dépôt d'actifs USDC** — Déposez vos USDC dans un vault sécurisé qui investit automatiquement sur Aave
- ✅ **Sélection d'association** — Choisissez parmi 4 associations whitelistées (Environnement, Tech, Culture, Éducation)
- ✅ **Génération de rendement via Aave V3** — Vos fonds génèrent des intérêts réels sur le protocole Aave
- ✅ **Distribution automatique 80/20** — 80% des intérêts pour vous, 20% pour l'association
- ✅ **Retrait flexible** — Retirez votre capital + vos intérêts à tout moment
- ✅ **Claim d'intérêts** — Réclamez uniquement les intérêts sans toucher au principal
- ✅ **Transparence totale** — Tous les événements sont enregistrés on-chain
- ✅ **Dashboard en temps réel** — Suivez vos dépôts, rendements et dons en direct
- ✅ **Interface moderne** — UI responsive avec shadcn/ui et Tailwind CSS
- ✅ **Multi-wallet** — Support MetaMask, WalletConnect, Coinbase Wallet via RainbowKit

### Statistiques du projet

- **Smart Contract :** AequoVault (Solidity 0.8.28)
- **Tests :** 23 tests unitaires avec couverture complète
- **Frontend :** React 19 + React Router v7 + TypeScript
- **Réseaux :** Ethereum Mainnet (fork), Sepolia Testnet
- **Protocole DeFi :** Aave V3
- **Token supporté :** USDC (6 decimals)

---

## 🛠️ Architecture

Le projet est organisé en trois modules principaux :

```
aequo/
├── contracts/          # Smart contracts Solidity
│   ├── contracts/      # Contrats (Vault, Registre, etc.)
│   ├── scripts/        # Scripts de déploiement
│   ├── test/           # Tests unitaires
│   └── ignition/       # Modules de déploiement
├── frontend/           # Interface utilisateur React
│   ├── app/            # Composants et routes
│   ├── core/           # Configuration Web3 et utilitaires
│   └── public/         # Assets statiques
├── data/               # Données
│   └── association.json # Liste des associations éligibles
└── .github/workflows/  # CI/CD Pipeline
```

---

## 🔗 Composants

### 1. Smart Contract AequoVault

**Implémentation :**
- Contrat Solidity `AequoVault.sol` déployé sur Ethereum Mainnet et Sepolia Testnet
- Intégration **Aave V3** pour la génération de rendements
- Token supporté : **USDC** (6 decimals)
- Architecture sécurisée avec OpenZeppelin (Ownable, ReentrancyGuard, SafeERC20)

**Fonctionnalités principales :**
- `deposit(uint256 amount)` — Dépose des USDC et les investit automatiquement dans Aave
- `withdraw(uint256 amount)` — Retire le principal + distribue les intérêts (80/20)
- `claimInterest()` — Réclame uniquement les intérêts sans toucher au principal
- `setAssociatedAssoWithUser(address)` — Associe une association whitelistée à l'utilisateur
- `setAssociationWhitelist(address, bool)` — Gestion de la whitelist (admin uniquement)
- `calculateInterest(address)` — Calcule les intérêts accumulés sur Aave

**Distribution des rendements :**
- **80%** pour l'utilisateur déposant
- **20%** pour l'association sélectionnée (configurable)
- Frais paramétrables entre 1% et 50% via `defaultFeesPercentage`

### 2. Registre des associations

**Implémentation actuelle (temporaire) :**
- Système de whitelist on-chain via mapping `whitelistedAssociations`
- Fichier JSON statique `data/association.json` pour les métadonnées (nom, description, type)
- Tracking des dons reçus par association via `associationTotalReceived`

**Associations actuelles :**
- DAO Écologie Urbaine (Environnement)
- TechForGood Collective (Technologie)
- Association des Artistes Numériques (Culture)
- Éducation Décentralisée (Éducation)

**🚧 Évolution prévue :**

Le système de registre évoluera vers une solution complète :

1. **Formulaire de soumission** — Interface frontend permettant aux associations de candidater
2. **Base de données persistante** — Stockage des demandes (PostgreSQL/MongoDB)
3. **Workflow de validation** — Panneau admin pour examiner et approuver les candidatures
4. **Intégration on-chain** — Ajout automatique à la whitelist après validation admin
5. **Statuts de candidature** — En attente, approuvée, rejetée avec historique

Cette architecture permettra une gestion décentralisée et transparente du processus d'admission des associations.

### 3. Intégration Aave V3

**Mécanisme de génération de rendement :**
1. L'utilisateur dépose des USDC dans `AequoVault`
2. Le vault approuve et supply les USDC vers le pool Aave
3. Aave minte des aUSDC (aToken) vers le vault
4. Les aUSDC accumulent des intérêts automatiquement
5. Au retrait, le vault calcule la différence entre balance actuelle et dépôts initiaux
6. Les intérêts sont répartis 80/20 entre utilisateur et association

**Adresses des contrats Aave utilisés :**
- Pool Aave V3 : `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2`
- USDC Mainnet : `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- aUSDC : `0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c`

### 4. Événements on-chain

**Événements émis :**
- `Deposit(address user, uint256 amount)` — Dépôt effectué
- `Withdraw(address user, uint256 principal, uint256 userInterest, uint256 assoInterest)` — Retrait avec distribution
- `InterestClaimed(address user, uint256 userShare, address association, uint256 assoShare)` — Réclamation d'intérêts
- `AssociationWhitelistUpdated(address assoAddress, bool whitelisted)` — Modification whitelist
- `UserSetAssociatedAsso(address user, address assoAddress)` — Association sélectionnée
- `FeesPercentageUpdated(uint256 oldFees, uint256 newFees)` — Mise à jour des frais
- `UserFeesPercentageUpdated(address user, uint256 feesPercentage)` — Frais personnalisés

**Avantages :**
- 🔍 Transparence totale et traçabilité complète
- 📊 Indexation facile pour les frontends et explorateurs
- ✅ Audit possible de tous les flux de fonds
- 🔔 Notifications temps réel via logs blockchain

---

## 🌐 Frontend

### Technologies
- **React 19** avec **React Router v7** pour le routing moderne
- **Vite** pour des performances de build optimales
- **Tailwind CSS v4** avec **shadcn/ui** pour l'interface
- **RainbowKit** + **wagmi** pour la connexion Web3
- **viem** pour les interactions blockchain
- **TypeScript** pour la sécurité des types

### Pages principales

| Route | Description |
|-------|-------------|
| `/` | Page d'accueil et présentation du protocole |
| `/dashboard` | Tableau de bord personnel (dépôt, retrait, soldes, intérêts) |
| `/association` | Liste des associations éligibles et formulaire de candidature (🚧 formulaire non fonctionnel) |
| `/admin` | Panneau d'administration - gestion whitelist (🚧 validation candidatures à venir) |

### Fonctionnalités implémentées
- ✅ Connexion de portefeuille multi-wallet (MetaMask, WalletConnect, Coinbase, etc.)
- ✅ Interface de dépôt avec sélection d'association
- ✅ Interface de retrait avec calcul des intérêts en temps réel
- ✅ Affichage des rendements (part utilisateur 80% / association 20%)
- ✅ Suivi des dons effectués par association
- ✅ Gestion des associations whitelistées (admin)
- ✅ Design responsive et moderne avec composants shadcn/ui
- ✅ Navigation active avec indicateurs visuels
- ✅ Animations et transitions fluides

---

## 📁 Configuration

### Configuration Web3

La configuration réseau et les adresses de contrats sont définies dans :
- `frontend/core/web3/contants.ts` — Adresses des contrats AequoVault et USDC par chainId
- `contracts/hardhat.config.ts` — Configuration Hardhat (RPC URLs, networks)
- `contracts/ignition/modules/` — Modules de déploiement avec paramètres Aave V3

### `data/association.json` (temporaire)

⚠️ **Fichier statique temporaire** — Sera remplacé par une base de données

Métadonnées des associations actuellement whitelistées :
```json
{
  "id": "0xaddress",
  "wallet": "0xaddress",
  "nom": "Nom de l'association",
  "description": "Description détaillée",
  "type": "Environnement|Technologie|Culture|Éducation"
}
```

Ce fichier permet le développement du frontend en attendant l'implémentation du système de candidature avec base de données.

### Contrats déployés

**Sepolia Testnet (chainId: 11155111)**
- AequoVault : `0x41B6c0B348406812257e060A7dd42F1aa22c8356`
- Déployé le : 6 décembre 2025
- [Voir sur Etherscan](https://sepolia.etherscan.io/address/0x41B6c0B348406812257e060A7dd42F1aa22c8356)

**Local Fork (Hardhat)**
- AequoVault : `0xAE246E208ea35B3F23dE72b697D47044FC594D5F`
- Fork de Mainnet au bloc 19,000,000

---

## 💻 Installation

### Prérequis
- **Node.js >= 22** (v22 recommandé)
- **npm** ou **pnpm**
- Un portefeuille Ethereum compatible (MetaMask, Coinbase Wallet, WalletConnect)
- **Clé API Infura** pour accès RPC Mainnet/Sepolia

### 1. Cloner le repository

```bash
git clone https://github.com/CygiK/Aequo.git
cd Aequo
```

### 2. Installation des smart contracts

```bash
cd contracts
npm install
```

### 3. Installation du frontend

```bash
cd frontend
npm install
```

### 4. Configuration des variables d'environnement

Créer un fichier `.env` dans le dossier `contracts/` :

```bash
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
SEPOLIA_PRIVATE_KEY=your_private_key_here
```

> ⚠️ **Sécurité :** Ne jamais commiter vos clés privées. Le fichier `.env` est dans `.gitignore`.

### 5. Tests des smart contracts

```bash
cd contracts
npx hardhat test --network hardhatMainnet
```

Pour les tests avec couverture :

```bash
npx hardhat test --network hardhatMainnet --coverage
```

### 6. Déploiement du contrat

**Sur Sepolia Testnet :**

```bash
cd contracts
npx hardhat ignition deploy ignition/modules/AequoVaultSepolia.ts --network sepolia
```

**Sur un fork local de Mainnet :**

```bash
# Terminal 1
npx hardhat node --network hardhatMainnet

# Terminal 2
npx hardhat ignition deploy ignition/modules/AequoVaultMainnet.ts --network localhost
```

### 7. Lancement du frontend en développement

```bash
cd frontend
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

### 8. Build pour la production

```bash
cd frontend
npm run build
npm run start
```

---

## 🔀 Workflow Git

Le projet suit un workflow **Gitflow** pour garantir la stabilité et la qualité du code :

### Branches principales

| Branche | Description | Protection |
|---------|-------------|------------|
| `master` | Version stable en production | ⛔ Pas de commit direct |
| `develop` | Branche d'intégration continue | ⛔ Pas de commit direct |
| `feature/*` | Nouvelles fonctionnalités | ✅ Développement actif |
| `release/*` | Préparation de version | ✅ Tests finaux |
| `hotfix/*` | Correctifs urgents | 🚨 Corrections rapides |

### Conventions

- ✅ Tous les merges se font via **Pull Request**
- ✅ Les tests CI doivent passer avant merge
- ✅ Revue de code obligatoire pour `master` et `develop`
- ✅ Nommage des branches : `feature/nom-fonctionnalite`, `hotfix/description-bug`

### Workflow type

```bash
# Créer une nouvelle fonctionnalité
git checkout develop
git pull origin develop
git checkout -b feature/mon-feature

# Développer et commiter
git add .
git commit -m "feat: description de la fonctionnalité"

# Pousser et créer une PR vers develop
git push origin feature/mon-feature
```

---

## 🧪 CI/CD

### Pipeline d'Intégration Continue

Le projet utilise **GitHub Actions** avec 4 workflows automatisés :

#### 1. Tests Hardhat (`tests.yml`)

**Étapes automatisées :**
1. ✅ Checkout du code
2. ✅ Installation Node.js v22
3. ✅ Installation des dépendances (`npm ci`)
4. ✅ Exécution des tests avec couverture sur fork Mainnet
5. ✅ Rapport de couverture

**Déclencheurs :**
- Push vers `master`, `develop`, `feature/*`, `hotfix/*`, `release/*`
- Pull Request vers `master`, `develop`, `release/*`

#### 2. Déploiement Vercel manuel (`deploy-vercel-manual.yml`)

Permet le déploiement manuel du frontend sur Vercel via workflow dispatch.

#### 3. Déploiement Vercel automatique (`deploy-vercel.yml`)

Déploiement automatique sur Vercel lors des push vers `develop` ou `master`.

#### 4. Release automatique (`automated-release.yml`)

**Workflow de release frontend :**
1. Création automatique de branche `release/vX.X.X`
2. Bump de version (`patch`, `minor`, ou `major`)
3. Génération de changelog
4. Création de Pull Request vers `master`
5. Tag Git après merge

**Déclenchement :** Manuel via GitHub Actions avec choix du type de release

### Protection des branches

- ⛔ `master` : Merge uniquement via PR + tests passés
- ⛔ `develop` : Merge uniquement via PR + tests passés
- ✅ `feature/*`, `hotfix/*`, `release/*` : Développement actif

---

## 📄 Licence

Projet open-source — utilisation libre dans un cadre éducatif ou professionnel.

---

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- Ouvrir une issue pour signaler un bug
- Proposer de nouvelles fonctionnalités
- Soumettre une Pull Request

---

## 🚧 Roadmap

### Phase 1 : MVP ✅ (Actuel)
- ✅ Smart contract AequoVault avec intégration Aave V3
- ✅ Frontend React avec dépôt/retrait USDC
- ✅ Dashboard temps réel avec calcul d'intérêts
- ✅ Système de whitelist on-chain
- ✅ Tests unitaires complets (23 tests)
- ✅ Déploiement Sepolia + CI/CD

### Phase 2 : Système de candidature des associations 🚧
- [ ] Backend API (Node.js/Express ou NestJS)
- [ ] Base de données (PostgreSQL/MongoDB)
- [ ] Endpoints CRUD pour les candidatures
- [ ] Formulaire de soumission fonctionnel
- [ ] Workflow de validation admin
- [ ] Notifications par email
- [ ] Intégration automatique à la whitelist on-chain

### Phase 3 : Améliorations et features avancées 📋
- [ ] Multi-tokens support (DAI, USDT, etc.)
- [ ] Système de réputation pour les associations
- [ ] Statistiques et analytics avancés
- [ ] Export des rapports de dons (PDF)
- [ ] Système de vote communautaire
- [ ] Déploiement Mainnet

### Phase 4 : Gouvernance décentralisée 🔮
- [ ] Token de gouvernance
- [ ] DAO pour la gestion du protocole
- [ ] Propositions de nouvelles associations
- [ ] Mécanisme de staking

---

## 📧 Contact

Pour toute question ou suggestion, n'hésitez pas à ouvrir une discussion dans l'onglet Issues du projet.

---

<div align="center">
  <strong>Æquo</strong> — Faire le bien tout en générant des rendements 💚
</div>

---