'use strict';
const L = require('./_lib');
/* Diagnostic : la page d accueil s en sert pour savoir si le paiement est pret. */
module.exports = async (req, res) => {
  const out = {
    stripe: !!process.env.STRIPE_SECRET_KEY,
    webhook: !!process.env.STRIPE_WEBHOOK_SECRET,
    signature: !!(process.env.LICENSE_PRIVATE_KEY || (() => { try { return require('./_keys').LICENSE_PRIVATE_KEY; } catch (e) { return ''; } })()),
    telechargement: !!(process.env.DOWNLOAD_MAC || process.env.DOWNLOAD_WIN),
    version: process.env.APP_VERSION || '0.4.0',
    amis: L.friendCodes().length
  };
  if (out.stripe) {
    try { const s = L.stripe(); const a = await s.accounts.retrieve(); out.compte = a.id; out.paiements = !!a.charges_enabled; }
    catch (e) { out.erreur = e.message; }
  }
  out.pret = out.stripe && out.signature;
  out.pretAmis = out.signature && out.amis > 0;
  L.json(res, 200, out);
};
