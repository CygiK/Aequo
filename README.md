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

Créer une passerelle entre la finance décentralisée et l'impact social, permettant aux rendements générés par les protocoles DeFi d'être partiellement redistribués à des projets d'utilité publique.

### Fonctionnalités principales

- ✅ **Dépôt d'actifs** — Déposez vos actifs numériques dans un vault sécurisé
- ✅ **Sélection d'association** — Choisissez l'association bénéficiaire parmi une liste éligible
- ✅ **Génération de rendement** — Vos fonds génèrent des intérêts via un protocole DeFi
- ✅ **Reversement automatique** — Une partie des gains est automatiquement transférée à l'association
- ✅ **Retrait flexible** — Retirez votre capital à tout moment
- ✅ **Transparence totale** — Suivez toutes les transactions via les événements on-chain

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
│   └── public/         # Assets statiques
├── data/               # Configuration et données
│   ├── config.json     # Configuration réseau
│   └── association.json # Liste des associations
└── .github/workflows/  # CI/CD Pipeline
```

---

## 🔗 Composants

### 1. Registre des associations

**Responsabilités :**
- Stocker et gérer les associations éligibles
- Exposer la liste aux utilisateurs via l'interface
- Permettre la sélection d'une association lors du dépôt

### 2. Vault (Coffre-fort)

**Responsabilités :**
- Recevoir et sécuriser les dépôts utilisateurs
- Transférer les fonds vers un protocole DeFi pour générer des rendements
- Suivre les positions de chaque utilisateur
- Calculer et distribuer la part de rendement destinée aux associations
- Gérer les retraits avec mise à jour des soldes

> 💡 **Note :** Le protocole DeFi sous-jacent reste modulaire et sera défini lors de l'implémentation.

### 3. Système de reversement automatique

**Mécanisme :**
- À chaque génération de rendement :
  - Une part reste attribuée à l'utilisateur
  - Une part prédéfinie est automatiquement transférée à l'association sélectionnée

### 4. Événements on-chain

**Avantages :**
- 🔍 Transparence totale des opérations
- 📊 Facilite l'affichage temps réel dans le frontend
- ✅ Permet l'audit complet du flux de fonds

**Événements émis :**
- `Deposited` — Dépôt effectué
- `Withdrawn` — Retrait effectué
- `YieldGenerated` — Rendement généré
- `DonationSent` — Don transféré à l'association

---

## 🌐 Frontend

### Technologies
- **React** avec **Vite** pour des performances optimales
- **React Router** pour la navigation
- **Web3.js** ou **ethers.js** pour l'interaction blockchain

### Pages principales

| Route | Description |
|-------|-------------|
| `/` | Page d'accueil et présentation |
| `/deposit` | Interface de dépôt d'actifs |
| `/withdraw` | Interface de retrait |
| `/associations` | Liste et sélection des associations |
| `/dashboard` | Tableau de bord personnel (soldes, historique, dons) |

### Fonctionnalités
- ✅ Connexion de portefeuille (MetaMask, WalletConnect, etc.)
- ✅ Affichage du solde et des rendements en temps réel
- ✅ Historique des transactions
- ✅ Suivi des dons effectués

---

## 📁 Configuration

### `data/config.json`
Contient la configuration globale du projet :
- Adresses des smart contracts déployés
- Configuration réseau (chainId, RPC URL)
- Paramètres généraux (taux de donation, etc.)

### `data/association.json`
Liste statique des associations éligibles :
- Nom de l'association
- Adresse du portefeuille bénéficiaire
- Description et détails

> 💡 Cette liste est utilisée pour initialiser le registre on-chain et permet de développer le frontend indépendamment.

---

## 💻 Installation

### Prérequis
- Node.js >= 18
- npm ou yarn
- Un portefeuille Ethereum (MetaMask recommandé)

### 1. Installation des smart contracts

```bash
cd contracts
npm install
```

### 2. Installation du frontend

```bash
cd frontend
npm install
```

### 3. Tests des smart contracts

```bash
cd contracts
npx hardhat test
```

### 4. Lancement du frontend en développement

```bash
cd frontend
npm run dev
```

### 5. Déploiement local

Pour tester l'application en local avec une blockchain de développement :

```bash
# Terminal 1 : Démarrer un nœud Hardhat local
cd contracts
npx hardhat node

# Terminal 2 : Déployer les contrats
npx hardhat run scripts/deploy.js --network localhost

# Terminal 3 : Lancer le frontend
cd frontend
npm run dev
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

Le projet utilise **GitHub Actions** pour automatiser la validation du code.

### Étapes automatisées

1. ✅ Installation des dépendances (`npm ci`)
2. ✅ Compilation des smart contracts
3. ✅ Exécution des tests unitaires
4. ✅ Vérification du code (linting)
5. ✅ Rapport de couverture de tests

### Déclencheurs

La pipeline est exécutée automatiquement :

**Sur push vers :**
- `master`
- `develop`
- `feature/*`
- `release/*`
- `hotfix/*`

**Sur Pull Request vers :**
- `master`
- `develop`
- `release/*`

### Blocage d'intégration

⚠️ **Important :** Si les tests échouent, le merge est bloqué jusqu'à correction.

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

## 📧 Contact

Pour toute question ou suggestion, n'hésitez pas à ouvrir une discussion dans l'onglet Issues du projet.

---

<div align="center">
  <strong>Æquo</strong> — Faire le bien tout en générant des rendements 💚
</div>

---