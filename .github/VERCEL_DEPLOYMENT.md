# Configuration du déploiement Vercel

## 📋 Prérequis

Pour que le déploiement automatique sur Vercel fonctionne, vous devez configurer les secrets GitHub suivants :

### 1. Obtenir le token Vercel

1. Allez sur [Vercel Tokens](https://vercel.com/account/tokens)
2. Créez un nouveau token
3. Copiez le token généré

### 2. Configurer les secrets GitHub

Allez dans les paramètres de votre repository GitHub :
`Settings` > `Secrets and variables` > `Actions` > `New repository secret`

Ajoutez le secret suivant :

- **`VERCEL_TOKEN`** : Votre token Vercel

## 🚀 Workflows disponibles

### 1. Automated Release (`automated-release.yml`)

**Déclenchement :** Manuel via GitHub Actions

**Objectif :** Créer une nouvelle version du frontend et une PR vers `main`

**Utilisation :**
1. Allez dans `Actions` > `Automated Release Frontend`
2. Cliquez sur `Run workflow`
3. Sélectionnez le type de release (patch/minor/major)
4. Le workflow va :
   - Incrémenter la version dans `frontend/package.json`
   - Créer une branche `release/x.x.x`
   - Créer une PR vers `master`

### 2. Deploy to Vercel (`deploy-vercel.yml`)

**Déclenchement :** Automatique lors d'un push sur `master` (dossier `frontend/**`)

**Objectif :** Déployer le frontend sur Vercel

**Flux de travail :**
1. Une PR de release est mergée dans `master`
2. Le workflow détecte les changements dans `frontend/`
3. Déploiement automatique sur Vercel en production

## 🔄 Processus complet de release

```bash
# 1. Développement sur une feature branch
git checkout develop
git pull origin develop
git checkout -b feature/ma-nouvelle-feature

# 2. Développement et commit
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin feature/ma-nouvelle-feature

# 3. Créer une PR vers develop et merger

# 4. Lancer le workflow de release (via l'interface GitHub)
# Actions > Automated Release Frontend > Run workflow

# 5. Valider et merger la PR de release vers main

# 6. Le déploiement Vercel se fait automatiquement
```

## 📁 Structure du frontend

```
frontend/
├── app/              # Code source de l'application
├── build/            # Dossier de build (généré)
│   └── client/       # Output utilisé par Vercel
├── public/           # Assets statiques
├── package.json      # Contient la version
└── vercel.json       # Configuration Vercel
```

## 🛠️ Commandes utiles

```bash
# Développement local
cd frontend
npm run dev

# Build local
npm run build

# Déployer manuellement depuis la CLI
vercel --prod
```

## ⚠️ Notes importantes

- La branche `main` doit être protégée (require PR reviews)
- Les secrets Vercel ne doivent **JAMAIS** être commités
- Le déploiement ne se fait que depuis la branche `main`
- La version est automatiquement gérée par le workflow

## 🐛 Dépannage

### Le workflow échoue avec "version not found"

Vérifiez que `frontend/package.json` contient bien un champ `version` :
```json
{
  "name": "frontend",
  "version": "0.1.0",
  ...
}
```

### Le déploiement Vercel échoue

1. Vérifiez que le secret `VERCEL_TOKEN` est bien configuré
2. Vérifiez que le token Vercel est valide et non expiré
3. Assurez-vous que le token a les bonnes permissions sur le projet

### La PR n'est pas créée automatiquement

Vérifiez que :
- La branche `develop` existe
- La branche `main` existe
- Vous avez les permissions nécessaires
