'use strict';
const L = require('./_lib');

module.exports = async (req, res) => {
  try {
    const plan = (req.query && req.query.plan) || new URL(req.url, 'http://x').searchParams.get('plan');
    if (!L.PLANS[plan]) return L.json(res, 400, { error: 'Plan inconnu' });

    const s = L.stripe();
    const price = await L.priceFor(plan);
    const cfg = L.PLANS[plan];
    const base = L.baseUrl(req);

    const session = await s.checkout.sessions.create({
      mode: cfg.recurring ? 'subscription' : 'payment',
      line_items: [{ price: price, quantity: 1 }],
      success_url: base + '/merci.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: base + '/#licences',
      allow_promotion_codes: true,
      locale: 'fr',
      customer_creation: cfg.recurring ? undefined : 'always',
      subscription_data: cfg.recurring && cfg.trialDays
        ? { trial_period_days: cfg.trialDays, metadata: { liaison_plan: plan } }
        : undefined,
      metadata: { liaison_plan: plan }
    });

    res.statusCode = 303;
    res.setHeader('Location', session.url);
    res.end();
  } catch (e) {
    L.json(res, 500, { error: e.message });
  }
};
