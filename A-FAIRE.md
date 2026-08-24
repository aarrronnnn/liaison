# Une seule chose à faire

Le site est **en ligne et fonctionnel** :
**https://liaison-gamma-five.vercel.app**

L'activation des licences répond, et le code amis `AMIS-CABINE-A8NJ`
est actif — je l'ai intégré au serveur, tu n'as aucune variable à créer
pour que tes amis puissent l'utiliser.

Il manque **le fichier de l'app**. C'est la seule chose que je ne peux
pas faire à ta place : compiler une app macOS exige un Mac, et héberger
un fichier de 100 Mo demande ton compte GitHub.

## La commande

```bash
cd liaison
./publier.sh
```

Elle crée le dépôt, pousse le code, déclenche la construction du `.dmg`
et du `.exe` sur les serveurs de GitHub, et t'affiche les deux adresses à
coller dans Vercel. Prérequis : `brew install gh && gh auth login`.

Dix minutes plus tard, le bouton **Télécharger** du site sert le bon
fichier selon la machine du visiteur.

## Pour les versions suivantes

```bash
npm version patch && ./publier.sh
```

---

## Ce qui marche déjà, maintenant

| | État |
|---|---|
| Site, pages, design | en ligne |
| Écran d'accueil de l'app | prêt |
| Code amis `AMIS-CABINE-A8NJ` | **actif** |
| Activation, signature, cache 30 jours | **actif** |
| Bouton Télécharger | attend `./publier.sh` |
| Paiement par carte | attend ta clé Stripe (voir EN-LIGNE.md) |

Le paiement n'est pas nécessaire pour tes amis : leur code court-circuite
Stripe entièrement.

## Le message à envoyer

> Salut — je te fais tester Liaison, mon app pour DJ.
>
> **https://liaison-gamma-five.vercel.app**
>
> Télécharge, installe, ouvre-la. Elle te demandera un code : mets
> `AMIS-CABINE-A8NJ`. Tout est ouvert, aucune carte, aucun compte.
>
> Au premier lancement le système va râler parce que l'app n'est pas
> encore signée : clic droit sur l'app → Ouvrir (Mac), ou
> « Informations complémentaires » → « Exécuter quand même » (Windows).
