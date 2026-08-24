# Mettre Liaison en vente — 15 minutes

Le site et le serveur de licences sont **déjà déployés** :

**https://liaison-gamma-five.vercel.app**

Il reste trois variables d'environnement à coller dans Vercel, et un
webhook à déclarer dans Stripe. Rien d'autre.

---

## 1 — Les variables Vercel

Va sur **vercel.com → projet `liaison` → Settings → Environment Variables**,
et ajoute ces entrées pour l'environnement **Production** :

### `STRIPE_SECRET_KEY`
Ta clé secrète live, depuis
https://dashboard.stripe.com/acct_1Mek7NDw4CIEog9d/apikeys
Elle commence par `sk_live_`.

### `LICENSE_PRIVATE_KEY`
La clé qui signe les licences. Colle exactement ceci, retours à la ligne compris :

```
-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIBlbtWtasoGxi86xCwfQDRg9TXwAVoFW1gNcqPVBgc8q
-----END PRIVATE KEY-----
```

La clé publique correspondante est déjà embarquée dans l'app
(`src/license.js`). Ne la change pas sans republier l'app : les licences
déjà émises deviendraient invérifiables.

```
-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAQRAhC/3e4spHMGygn36MmBbITPm5K/bXZ/cBPehOYG4=
-----END PUBLIC KEY-----
```

### `FRIEND_CODE` — le code amis
```
AMIS-CABINE-A8NJ
```
Il donne l'accès complet sans paiement. Voir **AMIS.md** pour le détail
et le message à envoyer. Ce code fonctionne même sans Stripe configuré.

### `DOWNLOAD_MAC` et `DOWNLOAD_WIN`
Les adresses de tes binaires, une fois publiés sur GitHub Releases. Par exemple :
```
https://github.com/<toi>/liaison/releases/latest/download/Liaison-0.3.0-arm64.dmg
https://github.com/<toi>/liaison/releases/latest/download/Liaison-Setup-0.3.0.exe
```

Puis **Redeploy** pour que les variables soient prises en compte.

---

## 2 — Le webhook Stripe

https://dashboard.stripe.com/webhooks → **Add endpoint**

- URL : `https://liaison-gamma-five.vercel.app/api/webhook`
- Événement à écouter : `checkout.session.completed`

Stripe affiche ensuite un **signing secret** qui commence par `whsec_`.
Ajoute-le dans Vercel sous `STRIPE_WEBHOOK_SECRET`, et redéploie.

Sans ce secret le webhook fonctionne quand même, mais il accepte
n'importe quel appel : ne reste pas dans cet état en production.

---

## 3 — Les produits Stripe

Tu n'as rien à créer. Au premier clic sur un bouton d'achat, le serveur
cherche le produit par sa métadonnée `liaison_plan` et le crée s'il
n'existe pas, avec le bon prix en euros :

| Plan | Prix | Facturation | Machines |
|---|---|---|---|
| `pass` | 9 € | une fois, valable 14 h | 1 |
| `resident` | 19 € | mensuel, 14 jours d'essai | 2 |
| `collectif` | 49 € | mensuel, 14 jours d'essai | 5 |

Pour changer un prix : modifie `PLANS` dans `api/_lib.js` et redéploie.
Un nouveau prix est créé, l'ancien reste attaché aux abonnements en cours.

---

## 4 — Vérifier que tout est branché

```
https://liaison-gamma-five.vercel.app/api/etat
```

Renvoie l'état de chaque brique. Tu veux voir `"pret": true` et
`"paiements": true`. La page d'accueil affiche un bandeau rouge tant
qu'il manque quelque chose.

---

## 5 — Construire le binaire

```bash
cd liaison
npm install
npm run dist:mac     # produit dist/Liaison-0.3.0-arm64.dmg
npm run dist:win     # produit dist/Liaison Setup 0.3.0.exe
```

Publie-les en GitHub Release, mets les adresses dans `DOWNLOAD_MAC` /
`DOWNLOAD_WIN`, redéploie. Le bouton **Télécharger** sert alors le bon
fichier selon la machine du visiteur.

Le binaire n'est pas signé : au premier lancement sur macOS, clic droit →
Ouvrir. Pour une distribution large il faut un certificat Apple Developer
(99 $/an) et la notarisation.

---

## Comment marche la licence

**Il n'y a pas de base de données.** Stripe est la source de vérité.

1. Le DJ paie. Stripe appelle `/api/webhook`.
2. Le serveur tire une clé `LSN-XXXX-XXXX-XXXX` et l'écrit dans les
   métadonnées du client Stripe, avec le plan et la liste des machines.
3. La page de remerciement affiche la clé.
4. L'app appelle `/api/activate` avec la clé et une empreinte de machine.
   Le serveur vérifie que l'abonnement est actif, ajoute la machine si un
   siège est libre, et renvoie une **licence signée en Ed25519**.
5. L'app vérifie la signature avec la clé publique embarquée et met la
   licence en cache **30 jours**. En cabine, hors ligne, elle tient.
6. Une fois par jour, l'app rappelle `/api/validate` en silence. Si
   l'abonnement est annulé, la licence tombe au prochain appel.

Conséquences pratiques : résilier dans Stripe coupe l'accès sans que tu
touches à quoi que ce soit ; une clé se déplace d'une machine à l'autre
via **Libérer cette machine** ; et une panne de ton serveur n'empêche
jamais un DJ de finir sa nuit.

### Ce que voit un DJ sans licence
- **Essai** : 14 jours, tout ouvert.
- **Essai terminé** : le widget continue, mais une seule suggestion, pas
  de sessions invités, pas de rejeu de set.
