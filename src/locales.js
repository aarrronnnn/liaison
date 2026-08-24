'use strict';
/* ============================================================
   Packs de contexte — un club parisien et un mariage americain
   ne se jouent pas pareil. Chaque pack pondere l'ADN, la courbe
   d'energie, les horaires et les moments obliges.
   ============================================================ */

const PACKS = [
  {
    id: 'fr-club', label: 'France — club', short: 'FR club',
    hours: ['23h','00h','01h','02h','03h','04h','05h','06h'],
    arc: [5,6,7,8,9,10,8,6],
    dna: { 'house':92,'tech house':90,'techno':84,'french touch':78,'club':86,'edit':70,
           'disco':56,'garage':52,'afro house':60,'hip-hop':30,'variete':8 },
    langBias: { fr:0.9, en:1.0, es:0.5 },
    decades: { '2020':1.0,'2010':0.9,'2000':0.6,'1990':0.55,'1980':0.4 },
    moments: [
      { at: 0, label: 'Ouverture', brief: 'Deep et groove, on laisse la salle se remplir.' },
      { at: 4, label: 'Pic', brief: 'Le gros du set, energie 9-10, pas de variete.' },
      { at: 6, label: 'Descente', brief: 'On relache, on garde les derniers.' }
    ],
    avoid: ['variete', 'eurodance', 'mariage'],
    tips: "Peu de vocals connus avant 1h. Les edits maison marchent mieux que les originaux."
  },
  {
    id: 'fr-mariage', label: 'France — mariage', short: 'FR mariage',
    hours: ['19h','20h','21h','22h','23h','00h','01h','02h','03h'],
    arc: [3,3,4,6,8,9,8,6,4],
    dna: { 'variete':88,'hymne':92,'disco':82,'french touch':70,'pop':74,'house 90s':58,
           'eurodance':62,'funk':60,'rap fr':56,'slow':50,'club':44 },
    langBias: { fr:1.0, en:0.9, es:0.5 },
    decades: { '2020':0.8,'2010':0.9,'2000':0.95,'1990':0.95,'1980':0.9,'1970':0.8 },
    moments: [
      { at: 0, label: 'Vin d\'honneur', brief: 'Jazz, bossa, soul douce. On parle par-dessus.' },
      { at: 2, label: 'Diner', brief: 'Volume bas, rien de dansant, pas de refrain connu.' },
      { at: 4, label: 'Ouverture de bal', brief: 'Le slow choisi par les maries, puis on enchaine vite.' },
      { at: 5, label: 'Pic', brief: 'Hymnes, generations melangees, personne ne s\'assoit.' },
      { at: 8, label: 'Fin de nuit', brief: 'Les 20 derniers, plus club.' }
    ],
    avoid: ['techno', 'drill'],
    tips: "La table des 60+ decroche apres 1h : place les classiques avant minuit."
  },
  {
    id: 'us-wedding', label: 'United States — wedding', short: 'US wedding',
    hours: ['5pm','6pm','7pm','8pm','9pm','10pm','11pm','12am'],
    arc: [3,3,4,5,7,9,8,6],
    dna: { 'top 40':88,'motown':80,'country':74,'hip-hop 2000s':78,'pop':86,'line dance':72,
           'r&b':70,'classic rock':64,'disco':66,'edm':58,'house':40 },
    langBias: { en:1.0, es:0.55, fr:0.2 },
    decades: { '2020':0.9,'2010':0.95,'2000':0.95,'1990':0.85,'1980':0.85,'1970':0.7,'1960':0.65 },
    moments: [
      { at: 0, label: 'Cocktail hour', brief: 'Jazz standards, acoustic covers, low volume.' },
      { at: 2, label: 'Grand entrance', brief: 'Un titre bref et fort, choisi par le couple.' },
      { at: 3, label: 'First dance', brief: 'Puis father-daughter et mother-son, dans la foulee.' },
      { at: 4, label: 'Dinner', brief: 'Motown et soft rock, volume conversation.' },
      { at: 5, label: 'Open floor', brief: 'Line dances obligatoires : Cupid Shuffle, Wobble, Cha Cha Slide.' },
      { at: 6, label: 'Cake / bouquet', brief: 'Deux pauses courtes, on repart tout de suite apres.' },
      { at: 7, label: 'Last call', brief: 'Souvent coupure a minuit : le dernier titre se prepare.' }
    ],
    avoid: ['techno', 'drill', 'hardstyle'],
    tips: "Les line dances ne sont pas negociables. Le couple fournit souvent une do-not-play list ecrite."
  },
  {
    id: 'uk-club', label: 'United Kingdom — club', short: 'UK club',
    hours: ['22h','23h','00h','01h','02h','03h'],
    arc: [5,6,8,9,9,7],
    dna: { 'uk garage':88,'bassline':78,'drum & bass':84,'house':80,'breaks':76,'grime':64,'club':86 },
    langBias: { en:1.0 },
    decades: { '2020':1.0,'2010':0.9,'2000':0.8,'1990':0.7 },
    moments: [
      { at: 0, label: 'Warm up', brief: 'Garage et house, on installe le swing.' },
      { at: 3, label: 'Peak', brief: 'Bascule D&B possible : le public suit si le pont est propre.' }
    ],
    avoid: ['variete'],
    tips: "Fermeture souvent 3h : le pic doit arriver plus tot qu'en France."
  },
  {
    id: 'es-fiesta', label: 'España — fiesta', short: 'ES fiesta',
    hours: ['00h','01h','02h','03h','04h','05h','06h'],
    arc: [5,6,7,9,10,9,7],
    dna: { 'reggaeton':92,'latin house':82,'pop latino':86,'flamenco pop':64,'techno':60,'hip-hop':56 },
    langBias: { es:1.0, en:0.8, fr:0.2 },
    decades: { '2020':1.0,'2010':0.9,'2000':0.75,'1990':0.6 },
    moments: [
      { at: 0, label: 'Apertura', brief: 'La salle arrive vraiment vers 1h30.' },
      { at: 4, label: 'Punto alto', brief: 'Reggaeton et perreo, le pic tient longtemps.' }
    ],
    avoid: [],
    tips: "Tout se decale de deux heures par rapport a la France."
  },
  {
    id: 'de-club', label: 'Deutschland — club', short: 'DE club',
    hours: ['01h','02h','03h','04h','05h','06h','07h','08h'],
    arc: [6,7,8,9,9,9,8,7],
    dna: { 'techno':94,'minimal':84,'hard groove':78,'trance':62,'house':66,'club':90 },
    langBias: { en:1.0, de:0.7 },
    decades: { '2020':1.0,'2010':0.85,'2000':0.6 },
    moments: [
      { at: 0, label: 'Aufwärmen', brief: 'Long, patient, pas de gros drop avant 3h.' },
      { at: 4, label: 'Peak', brief: 'Le plateau dure des heures : varier la texture, pas l\'energie.' }
    ],
    avoid: ['variete', 'pop', 'hymne'],
    tips: "Un set trop rapide grille la salle : la montee se compte en heures, pas en morceaux."
  }
];

const byId = id => PACKS.find(p => p.id === id) || PACKS[0];

/** Fusionne le pack de contexte avec l'ADN issu des playlists invites. */
function blendDNA(pack, guestDNA, weight) {
  weight = weight == null ? 0.5 : weight;  // 0 = pack seul, 1 = invites seuls
  const out = {};
  for (const k of Object.keys(pack.dna)) out[k] = pack.dna[k] * (1 - weight);
  for (const k of Object.keys(guestDNA || {})) out[k] = (out[k] || 0) + guestDNA[k] * weight;
  return out;
}

module.exports = { PACKS, byId, blendDNA };
