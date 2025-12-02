# Analyse juridique – Qualification du token AEQUO

## 1. Objectif
Déterminer la qualification juridique du token AEQUO selon les cadres :
- MiCA (Union Européenne)
- Droit français (AMF)
- Risques de requalification (instrument financier, e-money, security token)
- Impact du design du protocole sur la qualification


## 2. Nature du token envisagé
2.1 Token ERC-4626 (share token du Vault)

Le protocole AEQUO émet, de manière technique et automatique, un token de parts conforme au standard ERC-4626.
Ce token :

représente uniquement la part de l’utilisateur dans le Vault,

n’a aucune fonction de gouvernance,

n’a aucune fonction utilitaire indépendante,

n’est pas destiné à être échangé,

est créé (mint) lors du dépôt d’USDC et détruit (burn) lors du retrait.

Ce token est donc un “token technique interne”, utilisé comme créance sur le Vault, similaire à un LP token mais dans un contexte de stratégie DeFi (vault).

Il ne constitue pas un token projet et n’a aucune autonomie fonctionnelle.


2.2 NFT de preuve de donation (AEQUO NFT)

Le protocole AEQUO émet un NFT de preuve de donation, destiné uniquement à attester qu’un utilisateur a réalisé un don à une association.

Ce NFT :

n’est pas transférable ;

ne peut pas être échangé ;

ne confère aucun droit économique, politique ou financier ;

ne permet pas d’obtenir un rendement ;

contient uniquement un hash on-chain, associé à un justificatif complet stocké off-chain ;

sert de preuve numérique équivalente à un CERFA dans le cadre de la défiscalisation.

Il s’agit d’un “NFT attestataire” (attestation NFT), utilisé comme reçu digital.


## 3. Questions clés pour la qualification juridique

Pour déterminer la nature juridique de ces deux tokens, plusieurs questions importantes doivent être analysées :

Questions relatives au token ERC-4626

Le token donne-t-il accès à un service spécifique ? Non (pur mécanisme technique).

Le token est-il utilisé comme actif spéculatif ?  Non.

Peut-il être transféré ? Techniquement oui, mais ce n’est pas un token destiné à être listé/échangé.

Le token crée-t-il un droit économique autonome ?  Non, il représente une créance interne.

Questions relatives au NFT de donation

Le NFT est-il unique pour chaque donateur ?  Oui.

Le NFT est-il transférable ? Non.

Le NFT confère-t-il des droits financiers ? Non.

Le NFT est-il destiné à la spéculation ? Non.

Le NFT représente-t-il une valeur patrimoniale ? Non.

Le NFT fonctionne-t-il comme un certificat de preuve ? Oui.

Ces réponses guident l’analyse MiCA.

## 4. Analyse MiCA (UE)
4.1 Le token ERC-4626

Le token ERC-4626 :

entre dans la définition générale de “crypto-actif” (MiCA),

mais il n’entre dans aucune catégorie sensible (ART, EMT, utility token),

ne représente pas un actif de réserve,

n’est pas indexé sur une valeur monétaire,

ne sert pas de moyen de paiement,

ne confère aucun droit à son détenteur en dehors du retrait des fonds qu’il a lui-même déposés.

C’est un mécanisme purement technique, exclu de toute réglementation spécifique MiCA.



4.2 Le NFT de preuve de donation

Selon MiCA :

un NFT unique, non fongible, non spéculatif, et utilisé uniquement comme preuve n'entre pas dans la catégorie des crypto-actifs régulés.

MiCA ajoute que si un NFT n’est pas utilisé comme instrument financier, ne représente pas un droit financier, et n'a pas vocation à circuler, il n’est pas concerné.

Le NFT AEQUO n’est pas un utility token, n’est pas un ART, n’est pas un e-money token.


4.3 Risque de requalification en instrument financier

Pour être un instrument financier (type security token), il faudrait que le token :

donne droit à une performance économique,

donne accès à un dividende,

permette une participation à une entreprise,

soit destiné à la spéculation,

représente un actif financier sous-jacent,

soit commercialisé comme investissement.

Or :

ERC-4626 → ne génère aucune performance financière par nature, c’est un mécanisme comptable interne.

NFT → ne contient aucun droit économique et n’est pas transférable.

 Risque de requalification = faible
 

## 5. Conclusion juridique

Le token ERC-4626 est un token technique, assimilable à un reçu numérique pour suivre une créance dans un Vault.
Aucune qualification MiCA spécifique. Aucune qualification financière.

Le NFT AEQUO est un NFT attestataire, utilisé comme preuve de don, non transférable, non spéculatif, et sans droit économique.
Exclu du champ des utility tokens, ART, e-money token et des instruments financiers.

Aucun des deux tokens ne constitue un “token projet” soumis à MiCA.
AEQUO n’émet pas de token d’investissement, ce qui réduit très fortement les risques réglementaires.

