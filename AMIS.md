# Faire tester Liaison à tes amis

## 1 — Ce que tu ajoutes dans Vercel

Deux variables suffisent pour que les codes amis marchent. **Stripe n'est
même pas nécessaire** : les codes amis ne passent pas par le paiement.

| Variable | Valeur |
|---|---|
| `LICENSE_PRIVATE_KEY` | la clé de signature (voir EN-LIGNE.md) |
| `FRIEND_CODE` | `AMIS-CABINE-A8NJ` |

Puis **Redeploy**. Vérifie sur `/api/etat` que `"pretAmis": true`.

Variables facultatives :

| Variable | Défaut | Effet |
|---|---|---|
| `FRIEND_CODES` | — | plusieurs codes séparés par des virgules, un par groupe d'amis |
| `FRIEND_DAYS` | 120 | durée de validité, en jours |
| `FRIEND_SEATS` | 20 | nombre de machines par code |

## 2 — Ce que tu envoies à tes amis

> Salut — je te fais tester Liaison, mon app pour DJ.
>
> **Télécharger** : https://liaison-gamma-five.vercel.app
> **Comment l'ouvrir la première fois** : https://liaison-gamma-five.vercel.app/premiere-ouverture.html
>
> Une fois installée, clique l'icône Liaison dans la barre de menus →
> **Réglages** → colle ce code dans **Licence** → **Activer cette machine** :
>
> `AMIS-CABINE-A8NJ`
>
> Tout est ouvert, aucune carte bancaire, aucun compte à créer.
> Lance ton logiciel de mix, le widget apparaît tout seul.

## 3 — Ce que ça leur donne

Le niveau **Ami** ouvre tout, au-delà même du plan Résident :
7 suggestions au lieu de 5, sessions invités, courbe de soirée, rejeu de
set réarrangé, tendances, jusqu'à 20 machines sur le même code.

## 4 — Voir qui teste

Si `STRIPE_SECRET_KEY` est configurée, chaque activation amie est notée
dans un client Stripe nommé `Liaison - Amis (AMIS-CABINE-A8NJ)`. Tu y vois la liste
des machines et la date d'activation. Si Stripe n'est pas configuré, les
codes marchent quand même — tu n'as simplement pas la liste.

## 5 — Couper l'accès

Change `FRIEND_CODE` dans Vercel et redéploie. Les licences déjà émises
restent valides jusqu'à **30 jours** au maximum (le cache hors ligne),
puis tombent. Pour couper plus vite, baisse aussi `FRIEND_DAYS`.
