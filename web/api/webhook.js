'use strict';
const L = require('./_lib');

function rawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const handler = async (req, res) => {
  const s = L.stripe();
  let event;
  try {
    const raw = req.body && Buffer.isBuffer(req.body) ? req.body : await rawBody(req);
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    event = secret
      ? s.webhooks.constructEvent(raw, req.headers['stripe-signature'], secret)
      : JSON.parse(raw.toString('utf8'));
  } catch (e) {
    return L.json(res, 400, { error: 'Signature invalide : ' + e.message });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const sess = event.data.object;
      const plan = (sess.metadata && sess.metadata.liaison_plan) || 'resident';
      const cfg = L.PLANS[plan] || L.PLANS.resident;
      let customerId = sess.customer;

      if (!customerId && sess.customer_details && sess.customer_details.email) {
        const c = await s.customers.create({ email: sess.customer_details.email });
        customerId = c.id;
      }
      if (!customerId) return L.json(res, 200, { ok: true, note: 'aucun client' });

      const customer = await s.customers.retrieve(customerId);
      const existing = customer.metadata && customer.metadata.liaison_key;
      const key = existing || L.newKey();
      const meta = Object.assign({}, customer.metadata, {
        liaison_key: key,
        liaison_plan: plan,
        liaison_devices: customer.metadata.liaison_devices || '[]'
      });
      if (!cfg.recurring) meta.liaison_expires = String(Date.now() + cfg.hours * 3600 * 1000);

      await s.customers.update(customerId, { metadata: meta });
      /* on retient la cle sur la session pour la page de remerciement */
      await s.checkout.sessions.update(sess.id, { metadata: Object.assign({}, sess.metadata, { liaison_key: key }) })
        .catch(() => {});
    }
    L.json(res, 200, { received: true });
  } catch (e) {
    L.json(res, 500, { error: e.message });
  }
};

/* Vercel ne doit pas parser le corps : la signature Stripe porte sur les octets bruts. */
handler.config = { api: { bodyParser: false } };
module.exports = handler;
module.exports.config = handler.config;
