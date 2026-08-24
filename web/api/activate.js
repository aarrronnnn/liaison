'use strict';
const L = require('./_lib');

/* Active une machine et renvoie une licence signee, valable 30 jours hors ligne. */
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return L.json(res, 200, {});
  try {
    const body = await L.readBody(req);
    const key = String(body.key || '').trim().toUpperCase();
    const device = String(body.device || '').slice(0, 64);
    const name = String(body.name || 'Machine').slice(0, 40);
    if (!device) return L.json(res, 400, { error: 'Identifiant machine manquant' });

    /* --- code amis : acces complet, aucun paiement --- */
    if (L.isFriendCode(key)) {
      const ent = L.friendEntitlement();
      const n = await L.noteFriendDevice(key, device, name);
      const payload = {
        key: key, plan: 'ami', seats: ent.seats, device: device,
        status: 'ami', until: ent.until,
        exp: Math.min(Date.now() + 30 * 24 * 3600 * 1000, ent.until),
        iat: Date.now()
      };
      return L.json(res, 200, { license: L.signPayload(payload), payload: payload, amis: n });
    }

    if (/^AMIS/i.test(key))
      return L.json(res, 404, { error: 'Code amis inconnu ou expire. Verifie la saisie, ou demande le code a jour.' });
    if (!/^LSN-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(key))
      return L.json(res, 400, { error: 'Cle mal formee — le format attendu est LSN-XXXX-XXXX-XXXX' });

    const customer = await L.customerByKey(key);
    if (!customer) return L.json(res, 404, { error: 'Cle inconnue' });

    const ent = await L.entitlement(customer);
    if (!ent.active) return L.json(res, 402, { error: 'Licence inactive : ' + ent.status, status: ent.status });

    let devices = L.readDevices(customer);
    const known = devices.find(d => d.id === device);
    if (!known) {
      if (devices.length >= ent.seats)
        return L.json(res, 409, {
          error: 'Toutes les machines sont utilisees (' + ent.seats + ')',
          devices: devices.map(d => ({ name: d.name, at: d.at }))
        });
      devices.push({ id: device, name: name, at: Date.now() });
      await L.writeDevices(customer, devices);
    }

    const payload = {
      key: key, plan: ent.plan, seats: ent.seats, device: device,
      status: ent.status, until: ent.until,
      exp: Date.now() + 30 * 24 * 3600 * 1000,
      iat: Date.now()
    };
    L.json(res, 200, { license: L.signPayload(payload), payload: payload });
  } catch (e) {
    L.json(res, 500, { error: e.message });
  }
};
