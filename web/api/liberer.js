'use strict';
const L = require('./_lib');

/* Libere un siege : le DJ change de portable, il recupere sa place. */
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return L.json(res, 200, {});
  try {
    const body = await L.readBody(req);
    const key = String(body.key || '').trim().toUpperCase();
    const device = String(body.device || '');
    const customer = await L.customerByKey(key);
    if (!customer) return L.json(res, 404, { error: 'Cle inconnue' });
    const devices = L.readDevices(customer).filter(d => d.id !== device);
    await L.writeDevices(customer, devices);
    L.json(res, 200, { ok: true, restantes: devices.length });
  } catch (e) {
    L.json(res, 500, { error: e.message });
  }
};
