'use strict';
module.exports = async (req, res) => {
  const ua = String(req.headers['user-agent'] || '');
  const win = /Windows/i.test(ua);
  const url = win
    ? (process.env.DOWNLOAD_WIN || process.env.DOWNLOAD_MAC || '')
    : (process.env.DOWNLOAD_MAC || process.env.DOWNLOAD_WIN || '');
  if (!url) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end('<!doctype html><meta charset="utf-8"><title>Bientot</title>' +
      '<div style="font:16px/1.7 system-ui,-apple-system,sans-serif;max-width:32rem;margin:16vh auto;padding:0 26px;color:#0E1013">' +
      '<div style="width:44px;height:44px;border-radius:10px;background:#1B27D4;display:flex;align-items:center;justify-content:center;margin-bottom:26px">' +
      '<svg viewBox="0 0 44 26" width="26" fill="none"><path d="M5 16.5C5 5 39 5 39 16.5" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>' +
      '<circle cx="5" cy="21.4" r="3" fill="#fff"/><circle cx="39" cy="21.4" r="3" fill="#fff"/></svg></div>' +
      '<h1 style="font-size:27px;letter-spacing:-.035em;margin:0 0 10px">Le fichier arrive</h1>' +
      '<p style="color:#575C63;margin:0 0 22px">La version telechargeable est en cours de publication. Reviens dans un moment.</p>' +
      '<a href="/" style="color:#1B27D4">Retour au site</a></div>');
  }
  res.statusCode = 302;
  res.setHeader('Location', url);
  res.end();
};
