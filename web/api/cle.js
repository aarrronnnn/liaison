'use strict';
const L = require('./_lib');

/* Recupere la cle apres paiement, depuis l identifiant de session Checkout. */
module.exports = async (req, res) => {
  try {
    const id = new URL(req.url, 'http://x').searchParams.get('session_id');
    if (!id) return L.json(res, 400, { error: 'session_id manquant' });
    const s = L.stripe();
    const sess = await s.checkout.sessions.retrieve(id);
    if (sess.payment_status !== 'paid' && sess.status !== 'complete')
      return L.json(res, 202, { pending: true });

    let key = sess.metadata && sess.metadata.liaison_key;
    if (!key && sess.customer) {
      const c = await s.customers.retrieve(sess.customer);
      key = c.metadata && c.metadata.liaison_key;
    }
    if (!key) return L.json(res, 202, { pending: true });

    const plan = (sess.metadata && sess.metadata.liaison_plan) || 'resident';
    L.json(res, 200, { key: key, plan: plan, email: sess.customer_details && sess.customer_details.email });
  } catch (e) {
    L.json(res, 500, { error: e.message });
  }
};
