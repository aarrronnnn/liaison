# Mettre l'app en téléchargement — une seule fois

Tu n'as **pas besoin de construire quoi que ce soit toi-même**. GitHub
s'en charge : il compile le `.dmg` sur un Mac et le `.exe` sur un Windows,
et publie les deux. Toi, tu pousses un tag.

## 1 — Publier le dépôt (une fois)

```bash
cd liaison
git init
git add -A
git commit -m "Liaison 0.4.0"
gh repo create liaison --private --source=. --push
```

## 2 — Déclencher la construction

```bash
git tag v0.4.0
git push --tags
```

GitHub construit les deux binaires et crée la release. Compte 8 à 10
minutes. Tu suis ça dans l'onglet **Actions** du dépôt.

## 3 — Brancher le bouton du site

Dans **Vercel → projet `liaison` → Settings → Environment Variables** :

```
DOWNLOAD_MAC = https://github.com/<toi>/liaison/releases/latest/download/Liaison-0.4.0-arm64.dmg
DOWNLOAD_WIN = https://github.com/<toi>/liaison/releases/latest/download/Liaison-Setup-0.4.0.exe
APP_VERSION  = 0.4.0
```

`latest/download/` pointe toujours sur la dernière release : pour les
versions suivantes tu ne toucheras plus à Vercel, seulement au numéro
dans le nom de fichier.

Redéploie. Le bouton **Télécharger** du site sert alors le bon fichier
selon la machine du visiteur, sans qu'il ait à choisir.

## Les versions suivantes

```bash
npm version patch      # passe en 0.4.1 et crée le tag
git push --follow-tags
```

C'est tout. GitHub reconstruit, la release se met à jour, le lien
`latest/download` suit.

## Ce que voit la personne qui télécharge

1. Elle clique **Télécharger** sur ton site.
2. Elle installe. Le système affiche une alerte une seule fois, parce que
   l'app n'est pas signée — clic droit → Ouvrir sur Mac, « Exécuter quand
   même » sur Windows.
3. **L'icône Liaison apparaît dans ses Applications**, comme n'importe
   quelle app.
4. À la première ouverture, l'app affiche son écran d'accueil : essai de
   14 jours, ou **J'ai un code**.
5. Quand l'essai se termine, l'app propose les formules — le paiement
   s'ouvre dans le navigateur, la clé revient dans l'app.

Aucune ligne de commande pour eux, aucune page de documentation à lire.
