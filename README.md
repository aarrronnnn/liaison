# Liaison — widget de cabine

Suggestions d'enchaînement en direct pour DJ. Tout tourne en local : ta
bibliothèque, l'analyse audio, le moteur. Rien ne part sur un serveur.

---

## Mettre l'app en telechargement

Voir **METTRE-EN-LIGNE.md** : tu pousses un tag, GitHub construit le
`.dmg` et le `.exe` tout seul et les publie. Tu ne compiles rien.

## En ligne

Site, paiement et serveur de licences : **https://liaison-gamma-five.vercel.app**
Trois variables d'environnement restent à coller dans Vercel — tout est
détaillé dans **EN-LIGNE.md**.

Pour faire tester par des amis sans qu'ils paient : voir **AMIS.md**.

L'app s'installe comme n'importe quelle app, avec son icône dans les
Applications. À la première ouverture elle affiche son écran d'accueil :
**14 jours d'essai**, ou **J'ai un code**. Quand l'essai se termine, elle
propose les formules — le paiement s'ouvre dans le navigateur, la clé
revient dans l'app. La licence est signée en Ed25519 et mise en cache
30 jours, donc une coupure réseau n'interrompt jamais un set.

---

## Ce soir, en 3 minutes

```bash
# Node 18+ requis (node -v)
cd liaison
npm install          # ~2 min, télécharge Electron et ffmpeg
npm start
```

Il n'y a **rien à configurer**. Liaison se met en veille dans la barre de
menus, lit ta bibliothèque tout seul, et le widget apparaît quand tu
lances ton logiciel de mix.

### Ce qui se passe sans que tu fasses quoi que ce soit

**La bibliothèque se lit toute seule.** Liaison cherche la base de ton
logiciel et la lit directement :

| Logiciel | Fichier lu | Ce qu'on y trouve |
|---|---|---|
| Serato DJ Pro | `_Serato_/database V2` | chemin, titre, artiste, BPM, tonalité, genre |
| Traktor Pro | `collection.nml` | idem, tonalité convertie en Camelot |
| VirtualDJ | `database.xml` | idem, BPM reconstruit depuis la période |
| rekordbox | un export `.xml` s'il en existe un | idem, plus l'identifiant de piste |
| aucun des quatre | tes dossiers de musique | tags, puis analyse locale |

Ce qui manque (énergie, timbre, tonalité ou BPM absents) est calculé en
local par ffmpeg. Le résultat est mis en cache. Et si tu ajoutes des
morceaux dans Serato ou Traktor pendant que Liaison tourne, la base est
relue automatiquement.

**Le widget s'ouvre avec ton logiciel.** Liaison surveille les process
toutes les 4 secondes. rekordbox, Serato, Traktor, VirtualDJ, Engine DJ,
djay, Mixxx : dès que l'un d'eux s'ouvre, le widget apparaît, la bonne
source de détection démarre. Dès qu'il se ferme, le widget disparaît.
Entre les deux, Liaison ne coûte rien : une icône dans la barre de menus.

**Le morceau chargé est détecté.** Voir la section suivante — c'est le
point où les logiciels ne sont pas égaux.

---

## Détecter le morceau : ce que chaque logiciel permet vraiment

Il y a une différence que personne n'explique et qui compte :

- **Chargé sur un deck** — le morceau est prêt, pas encore lancé.
- **Joué** — le morceau part en sortie.

Un seul protocole expose le premier.

| Source | Détecte | Latence | Réglage |
|---|---|---|---|
| **Pro DJ Link** (rekordbox mode PERFORMANCE, CDJ) | le morceau **chargé** sur chaque deck | immédiate | aucun, écoute passive du réseau cabine |
| Serato DJ Pro | le morceau **joué** | ~1,5 s | aucun |
| VirtualDJ | le morceau **joué** | ~1,5 s | aucun |
| Traktor Pro | le morceau **joué** | immédiate | Preferences → Broadcasting : `127.0.0.1`, port `8000`, mount `/liaison` |
| Fichier now-playing | selon ton montage | ~1 s | pointe le fichier |
| Bouton loupe du widget | ce que tu déclares | immédiate | marche même en vinyle |

Pro DJ Link est écouté passivement sur le port UDP 50002 : Liaison
n'émet rien sur ton réseau cabine par défaut. Le paquet donne le numéro
de deck, l'identifiant rekordbox du morceau, le BPM et l'état de lecture.
Le **titre** ne circule pas dans ce paquet : Liaison le retrouve en
croisant l'identifiant avec un export `rekordbox.xml`. Sans cet export,
tu verras le deck et l'identifiant, pas le nom.

Cette source est marquée expérimentale : elle est validée sur des paquets
reconstruits, pas encore sur un vrai réseau cabine. Si rien n'arrive,
coche « se déclarer sur le réseau » dans les réglages.

---
## Le reste des réglages

### Contexte de la soirée
Choisis le pack pays / type d'événement (France club, France mariage,
US wedding, UK club, España fiesta, Deutschland club). Il change l'ADN,
la courbe d'énergie, les horaires et les moments obligés — un mariage
américain te demandera des line dances, un club berlinois une montée qui
se compte en heures.

### Demandes des invités
*Ouvrir la session* lance une page sur ton réseau local. Tu obtiens un QR
et un lien partageables par **WhatsApp, SMS, e-mail ou copier-coller**,
et le QR s'enregistre en PNG pour l'imprimer et le poser sur le bar.

### Rejouer un set autrement
Chaque soirée est journalisée. *Reconstruire l'ordre* reprend le vivier
d'une soirée passée, en abandonne la part que tu veux, y ajoute ce que tu
veux, et rebâtit un ordre entièrement différent tout en gardant chaque
enchaînement mixable. L'écran affiche la nouveauté réelle (% de paires
d'enchaînement inédites) et le déplacement moyen des morceaux.

---

## Le chargement dans le deck — ce qui est vrai

Aucun logiciel de mix n'expose de commande publique « charge ce fichier
dans le deck B ». Ni rekordbox, ni Serato. Ceux qui prétendent le
contraire pilotent le clavier en douce et cassent dès la première mise à
jour.

Ce que fait Liaison quand tu cliques **Charger** :

1. le titre part dans le presse-papier ;
2. une playlist `Liaison - Suivant.m3u8` est réécrite avec le fichier ;
3. le morceau devient la nouvelle référence du moteur.

En pratique : `Cmd/Ctrl+F` dans ton logiciel, `Cmd/Ctrl+V`, entrée. Deux
touches. C'est le seul chemin qui marche partout et qui ne casse pas.

Vraies pistes d'automatisation complète, dans l'ordre de faisabilité :
**VirtualDJ** (SDK de plugin natif), **Traktor** (mapping MIDI
« Load Selected » piloté par un port MIDI virtuel), **CDJ + Pro DJ Link**
(protocole réseau reversé, marche avec des platines sur le réseau, pas
avec rekordbox seul sur le portable). Chacune est un chantier à part
entière, pas une case à cocher.

---

## Construire un vrai installeur

```bash
npm run dist:mac     # produit un .dmg dans dist/
npm run dist:win     # produit un .exe dans dist/
```

Le binaire n'est pas signé : au premier lancement sur macOS, clic droit →
Ouvrir. Pour une distribution publique il faut un certificat Apple
Developer (99 $/an) et la notarisation.

---

## Structure

```
src/engine.js       moteur : Camelot, tempo, énergie, timbre, public, tendance
src/analyze.js      décodage ffmpeg + FFT + chroma (tonalité) + descripteurs
src/library.js      import rekordbox.xml / dossier, cache d'analyse
src/locales.js      packs pays et type d'événement
src/setbuilder.js   reconstruction d'un set déjà joué
src/session.js      page invités, QR, partage, journal de set
src/license.js      licence signée, activation, cache 30 jours, portes par plan
src/ui/licence.html écran d'accueil : essai, formules, saisie de code
build/icon.png      icône de l'app (bleu Klein, signe blanc)
src/autolibrary.js  découverte des bases Serato / Traktor / VirtualDJ / rekordbox
src/serato-db.js    lecture du format binaire de la base Serato
src/watcher.js      surveillance des logiciels de mix ouverts
src/sources/        détection du morceau en cours, dont Pro DJ Link
src/ui/             widget et réglages
```

## Limites connues

- L'énergie et le timbre sont des estimations sur 90 s de signal, pas une
  vérité absolue ; elles suffisent à départager, pas à noter un master.
- La détection de tonalité par chroma tombe juste sur la grande majorité
  des morceaux tonals, moins sur les percussions pures.
- Serato est lu par extraction de chaînes dans le fichier de session,
  puis rapprochement flou avec ta bibliothèque. C'est robuste tant que le
  morceau existe dans la bibliothèque importée.
- Les classements de tendance ne sont pas encore branchés sur une API
  réelle : le champ existe et est pondéré, la source reste à connecter.
- Le BPM estimé en interne (quand aucune base ne le fournit) tombe à
  environ 1 à 2 BPM près sur mes tests. Les valeurs de rekordbox, Serato
  ou Traktor sont toujours préférées quand elles existent.
- Pro DJ Link : parseur validé sur paquets reconstruits, pas encore sur
  un vrai réseau cabine.
