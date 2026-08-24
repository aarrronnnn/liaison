'use strict';
const L = require('./_lib');

/* Verification periodique : renvoie une licence signee fraiche, ou l erreur. */
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return L.json(res, 200, {});
  try {
    const body = await L.readBody(req);
    const key = String(body.key || '').trim().toUpperCase();
    const device = String(body.device || '').slice(0, 64);

    if (L.isFriendCode(key)) {
      const ent = L.friendEntitlement();
      const payload = {
        key: key, plan: 'ami', seats: ent.seats, device: device,
        status: 'ami', until: ent.until,
        exp: Math.min(Date.now() + 30 * 24 * 3600 * 1000, ent.until), iat: Date.now()
      };
      return L.json(res, 200, { license: L.signPayload(payload), payload: payload });
    }

    const customer = await L.customerByKey(key);
    if (!customer) return L.json(res, 404, { error: 'Cle inconnue' });

    const ent = await L.entitlement(customer);
    const devices = L.readDevices(customer);
    if (!devices.find(d => d.id === device))
      return L.json(res, 409, { error: 'Machine non activee' });
    if (!ent.active) return L.json(res, 402, { error: 'Licence inactive', status: ent.status });

    const payload = {
      key: key, plan: ent.plan, seats: ent.seats, device: device,
      status: ent.status, until: ent.until,
      exp: Date.now() + 30 * 24 * 3600 * 1000, iat: Date.now()
    };
    L.json(res, 200, { license: L.signPayload(payload), payload: payload });
  } catch (e) {
    L.json(res, 500, { error: e.message });
  }
};
