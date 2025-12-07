# Æquo Protocol - Frontend

Interface utilisateur moderne pour Æquo, une plateforme DeFi permettant de générer des rendements sur USDC via Aave V3 tout en reversant automatiquement 20% des intérêts à des associations caritatives.

## 🚀 Technologies

- **React 19** - Bibliothèque UI moderne
- **React Router v7** - Routing avec support SSR/SPA
- **TypeScript** - Typage statique
- **Vite** - Build tool ultra-rapide
- **Tailwind CSS v4** - Styling utility-first
- **shadcn/ui** - Composants UI réutilisables
- **RainbowKit** - Connexion multi-wallet (MetaMask, WalletConnect, Coinbase, etc.)
- **wagmi v2** - React hooks pour Ethereum
- **viem** - Interactions blockchain TypeScript-first
- **TanStack Query** - Gestion du state asynchrone

## 📁 Structure du projet

```
frontend/
├── app/                          # Code source React Router
│   ├── routes/                   # Routes de l'application
│   │   ├── _layout.tsx          # Layout principal avec navigation
│   │   ├── home.tsx             # Page d'accueil
│   │   ├── dashboard.tsx        # Dashboard utilisateur (dépôt/retrait)
│   │   ├── association.tsx      # Liste et candidature associations
│   │   └── admin.tsx            # Panneau admin (whitelist)
│   ├── components/              # Composants réutilisables
│   │   ├── ui/                  # Composants shadcn/ui
│   │   ├── shared/              # Composants partagés (DashboardCard)
│   │   └── provider/            # Providers (RainbowKit/Wagmi)
│   ├── lib/                     # Utilitaires et hooks
│   │   ├── hooks/               # Custom hooks (useVaultTransaction, etc.)
│   │   └── utils.ts             # Fonctions utilitaires
│   ├── routes.ts                # Configuration des routes
│   ├── root.tsx                 # Composant racine
│   └── app.css                  # Styles globaux Tailwind
├── core/                        # Configuration Web3
│   └── web3/
│       ├── abi/                 # ABIs des smart contracts
│       ├── contants.ts          # Adresses contrats et constantes
│       ├── client.ts            # Clients Viem (publicClient)
│       └── utils.ts             # Utilitaires Web3
├── public/                      # Assets statiques
├── components.json              # Configuration shadcn/ui
├── vite.config.ts              # Configuration Vite
├── react-router.config.ts      # Configuration React Router (SPA mode)
├── tsconfig.json               # Configuration TypeScript
└── vercel.json                 # Configuration déploiement Vercel
```

## 🎯 Fonctionnalités

### Pages implémentées

| Route | Description | État |
|-------|-------------|------|
| `/` | Page d'accueil et présentation | ✅ |
| `/dashboard` | Dépôt/retrait USDC + calcul intérêts temps réel | ✅ |
| `/association` | Liste associations + formulaire candidature | ✅ (formulaire non fonctionnel) |
| `/admin` | Gestion whitelist associations | ✅ (réservé au owner) |

### Custom Hooks

- `useVaultTransaction` - Gestion dépôts/retraits avec états de transaction
- `useGetUserData` - Récupération données utilisateur (solde, intérêts, association)
- `useAssoManagement` - Gestion associations (whitelist, association utilisateur)
- `useGetAssoBalance` - Balance d'une association
- `useGetVaultInfo` - Informations globales du vault
- `userIsOwner` - Vérification droits admin

### Composants clés

- **DashboardCard** - Cartes métriques avec icônes Radix UI
- **NavigationMenu** - Menu desktop avec états actifs
- **MobileMenu** - Menu mobile responsive
- **RainbowkitAndWagmiProvider** - Configuration Web3 multi-réseau

## 🛠️ Installation

### Prérequis

- Node.js >= 22
- npm ou pnpm

### Installation des dépendances

```bash
npm install
```

## 💻 Développement

### Démarrage du serveur de développement

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

### Vérification des types TypeScript

```bash
npm run typecheck
```

## 🏗️ Build Production

### Créer un build optimisé

```bash
npm run build
```

Génère les dossiers :
- `build/client/` - Assets statiques
- `build/server/` - Code serveur (si SSR activé)

### Démarrer le serveur de production

```bash
npm run start
```

## 🌐 Configuration réseau

Le frontend supporte plusieurs réseaux :

### Mode Production
- **Sepolia Testnet** (chainId: 11155111)
- Contrat AequoVault : `0x41B6c0B348406812257e060A7dd42F1aa22c8356`
- USDC : `0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8`

### Mode Développement
- **Hardhat Fork Mainnet** (chainId: 31337)
- Contrat AequoVault : `0xAE246E208ea35B3F23dE72b697D47044FC594D5F`
- USDC Mainnet : `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`

La configuration se fait automatiquement selon `NODE_ENV` via `core/web3/contants.ts`

## 🚀 Déploiement

### Déploiement Vercel (recommandé)

Le projet est configuré pour Vercel avec :
- SPA mode activé (`ssr: false`)
- Preset Vercel React Router
- Configuration dans `vercel.json`

```bash
# Déploiement automatique via GitHub
git push origin develop
```

### Déploiement Docker

```bash
# Build de l'image
docker build -t aequo-frontend .

# Lancement du container
docker run -p 3000:3000 aequo-frontend
```

Compatible avec :
- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean
- Fly.io
- Railway

## 🎨 Styling

### Tailwind CSS v4

Configuration dans `app/app.css` avec :
- Thème personnalisé (colors, radius, etc.)
- Support dark mode
- Plugin `tw-animate-css` pour animations

### shadcn/ui

Composants installés :
- Button, Card, Badge, Label, Input, Textarea
- Select, Checkbox, InputGroup
- NavigationMenu, DropdownMenu
- Separator, Slot

Ajout d'un composant :
```bash
npx shadcx@latest add [component-name]
```

## 🔗 Intégration Smart Contract

### ABI et Adresses

Les ABIs et adresses sont centralisés dans `core/web3/` :

```typescript
import { AEQUO_ABI, CONTRACT_ADDRESS_MAP, USDC_ADDRESS_MAP } from '~/core/web3/contants';
```

### Interaction avec les contrats

Utiliser les hooks wagmi :

```typescript
import { useWriteContract, useReadContract } from 'wagmi';

// Lecture
const { data } = useReadContract({
  address: contractAddress,
  abi: AEQUO_ABI,
  functionName: 'getUserInfo',
  args: [userAddress]
});

// Écriture
const { writeContract } = useWriteContract();
writeContract({
  address: contractAddress,
  abi: AEQUO_ABI,
  functionName: 'deposit',
  args: [amount]
});
```

## 📝 Scripts disponibles

| Script | Description |
|--------|-------------|
| `npm run dev` | Démarrage serveur dev avec HMR |
| `npm run build` | Build production optimisé |
| `npm run start` | Démarrage serveur production |
| `npm run typecheck` | Vérification types TypeScript |

## 🐛 Débogage

### Variables d'environnement

Créer un fichier `.env.local` (ignoré par git) :

```bash
NODE_ENV=development
VITE_ENABLE_DEVTOOLS=true
```

### React Router DevTools

En mode développement, accès aux DevTools React Router pour :
- Inspection des routes
- État de navigation
- Loaders/Actions

## 🔮 Roadmap

### Phase 2 : Backend et BDD
- [ ] Intégration API REST/GraphQL
- [ ] Soumission formulaire association fonctionnelle
- [ ] Système d'authentification
- [ ] Notifications temps réel

### Phase 3 : Améliorations UI/UX
- [ ] Mode sombre complet
- [ ] Animations avancées (Framer Motion)
- [ ] Charts et graphiques (Recharts)
- [ ] Export PDF des rapports

---

Built with ❤️ using React Router v7 | [Documentation principale](../README.md)
