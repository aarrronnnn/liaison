'use strict';
/* ============================================================
   Liaison — noyau du serveur de licences.
   Pas de base de donnees : Stripe est la source de verite.
   La cle de licence vit dans les metadonnees du client Stripe,
   l'abonnement decide de l'acces.
   ============================================================ */
const crypto = require('crypto');
let BAKED = {};
try { BAKED = require('./_keys'); } catch (e) {}
const conf = k => process.env[k] || BAKED[k] || '';

const PLANS = {
  pass:       { label: 'Pass soiree',  amount:  900, recurring: null,      seats: 1, hours: 14 },
  resident:   { label: 'Resident',     amount: 1900, recurring: 'month',   seats: 2, trialDays: 14 },
  collectif:  { label: 'Collectif',    amount: 4900, recurring: 'month',   seats: 5, trialDays: 14 },
  ami:        { label: 'Ami',          amount:    0, recurring: null,      seats: 20, days: 120 }
};

/* ============================================================
   Codes amis : acces complet, sans paiement, sans carte.
   Ils ne passent pas par Stripe : il suffit de la cle de
   signature pour qu'ils fonctionnent.
   ============================================================ */
function friendCodes() {
  return String(process.env.FRIEND_CODES || conf('FRIEND_CODE'))
    .split(/[,;\s]+/).map(c => c.trim().toUpperCase()).filter(Boolean);
}
function isFriendCode(key) {
  const k = String(key || '').trim().toUpperCase();
  return k.length >= 8 && friendCodes().includes(k);
}
function friendDays() {
  const d = parseInt(process.env.FRIEND_DAYS || '', 10);
  return isFinite(d) && d > 0 ? d : PLANS.ami.days;
}
function friendEntitlement() {
  return {
    plan: 'ami',
    seats: parseInt(process.env.FRIEND_SEATS || '', 10) || PLANS.ami.seats,
    active: true,
    until: Date.now() + friendDays() * 24 * 3600 * 1000,
    status: 'ami'
  };
}

/* Trace facultative des machines amies : uniquement si Stripe est configure.
   Permet de voir qui teste, sans jamais bloquer l'activation. */
async function noteFriendDevice(code, device, name) {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  try {
    const s = stripe();
    const found = await s.customers.search({ query: "metadata['liaison_key']:'" + code + "'", limit: 1 });
    let c = found.data[0];
    if (!c) {
      c = await s.customers.create({
        name: 'Liaison - Amis (' + code + ')',
        description: 'Acces amis, sans paiement',
        metadata: { liaison_key: code, liaison_plan: 'ami', liaison_devices: '[]' }
      });
    }
    let devices = readDevices(c);
    if (!devices.find(d => d.id === device)) {
      devices.push({ id: device, name: name, at: Date.now() });
      await writeDevices(c, devices);
    }
    return devices.length;
  } catch (e) { return null; }
}

function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY absente — ajoute-la dans les variables Vercel.');
  const Stripe = require('stripe');
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

/* ---------- catalogue : cree les produits au premier besoin ---------- */
const cache = {};
async function priceFor(planId) {
  if (cache[planId]) return cache[planId];
  const s = stripe();
  const plan = PLANS[planId];
  if (!plan) throw new Error('Plan inconnu : ' + planId);

  const found = await s.products.search({ query: "metadata['liaison_plan']:'" + planId + "'", limit: 1 });
  let product = found.data[0];
  if (!product) {
    product = await s.products.create({
      name: 'Liaison — ' + plan.label,
      description: descriptionFor(planId),
      metadata: { liaison_plan: planId, liaison_seats: String(plan.seats) }
    });
  }
  const prices = await s.prices.list({ product: product.id, active: true, limit: 10 });
  let price = prices.data.find(p =>
    p.currency === 'eur' && p.unit_amount === plan.amount &&
    (plan.recurring ? (p.recurring && p.recurring.interval === plan.recurring) : !p.recurring));
  if (!price) {
    price = await s.prices.create({
      product: product.id, currency: 'eur', unit_amount: plan.amount,
      recurring: plan.recurring ? { interval: plan.recurring } : undefined
    });
  }
  cache[planId] = price.id;
  return price.id;
}

function descriptionFor(planId) {
  if (planId === 'pass') return 'Une nuit complete de 14 h. Widget et moteur complets, une session, une machine.';
  if (planId === 'resident') return 'Licence mensuelle : bibliotheque illimitee, sessions illimitees, courbe de soiree, memoire de cabine, rejeu de set, 2 machines.';
  return 'Jusqu a 5 DJs, bibliotheques partagees, mode B2B, sessions clients brandees, facturation unique.';
}

/* ---------- cle de licence ---------- */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // sans I, O, 0, 1
function newKey() {
  const b = crypto.randomBytes(12);
  let out = '';
  for (let i = 0; i < 12; i++) out += ALPHABET[b[i] % ALPHABET.length];
  return 'LSN-' + out.slice(0, 4) + '-' + out.slice(4, 8) + '-' + out.slice(8, 12);
}

/* ---------- signature de la licence (Ed25519) ---------- */
function signPayload(payload) {
  const pem = conf('LICENSE_PRIVATE_KEY');
  if (!pem) throw new Error('Cle de signature absente.');
  const key = crypto.createPrivateKey(pem.replace(/\\n/g, '\n'));
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  const sig = crypto.sign(null, body, key);
  return body.toString('base64url') + '.' + sig.toString('base64url');
}

/* ---------- recherche d'un client par cle ---------- */
async function customerByKey(key) {
  const s = stripe();
  const r = await s.customers.search({ query: "metadata['liaison_key']:'" + String(key).replace(/'/g, '') + "'", limit: 1 });
  return r.data[0] || null;
}

/** Etat du droit d'usage : le plan, la date de fin, l'etat de l'abonnement. */
async function entitlement(customer) {
  const plan = customer.metadata.liaison_plan || 'resident';
  const cfg = PLANS[plan] || PLANS.resident;

  if (!cfg.recurring) {                                   // pass a duree fixe
    const until = Number(customer.metadata.liaison_expires || 0);
    return { plan, seats: cfg.seats, active: Date.now() < until, until, status: Date.now() < until ? 'pass' : 'expire' };
  }
  const s = stripe();
  const subs = await s.subscriptions.list({ customer: customer.id, status: 'all', limit: 10 });
  const live = subs.data.find(x => ['active', 'trialing', 'past_due'].includes(x.status));
  if (!live) return { plan, seats: cfg.seats, active: false, until: 0, status: 'aucun abonnement' };
  const until = (live.current_period_end || 0) * 1000;
  return {
    plan, seats: cfg.seats,
    active: live.status === 'active' || live.status === 'trialing',
    until, status: live.status, subscription: live.id
  };
}

/* ---------- sieges (machines) ---------- */
function readDevices(customer) {
  try { return JSON.parse(customer.metadata.liaison_devices || '[]'); } catch (e) { return []; }
}
async function writeDevices(customer, devices) {
  const s = stripe();
  await s.customers.update(customer.id, {
    metadata: Object.assign({}, customer.metadata, { liaison_devices: JSON.stringify(devices).slice(0, 480) })
  });
}

/* ---------- utilitaires HTTP ---------- */
function json(res, code, body) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(body));
}
async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(raw || '{}'); } catch (e) { return {}; }
}
function baseUrl(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return 'https://' + host;
}

module.exports = { PLANS, stripe, priceFor, newKey, signPayload, customerByKey,
                   entitlement, readDevices, writeDevices, json, readBody, baseUrl,
                   isFriendCode, friendEntitlement, friendCodes, noteFriendDevice };
