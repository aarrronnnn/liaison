'use strict';
/* ============================================================
   Liaison — analyse audio locale.
   ffmpeg decode -> mono 22050 Hz float32 -> descripteurs.
   Rien ne sort de la machine.
   ============================================================ */
const { spawn } = require('child_process');
const path = require('path');

function ffmpegPath() {
  try {
    let p = require('ffmpeg-static');
    if (p && p.path) p = p.path;
    if (p) return p.replace('app.asar', 'app.asar.unpacked');
  } catch (e) { /* fallback */ }
  return 'ffmpeg';
}

const SR = 22050, N = 2048, HOP = 1024;

/* ---------- FFT radix-2 en place ---------- */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

const HANN = new Float32Array(N);
for (let i = 0; i < N; i++) HANN[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));

/* ---------- profils Krumhansl-Schmuckler ---------- */
const MAJ = [6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88];
const MIN = [6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
/* pitch class -> code Camelot (0 = do) */
const CAM_MAJ = ['8B','3B','10B','5B','12B','7B','2B','9B','4B','11B','6B','1B'];
const CAM_MIN = ['5A','12A','7A','2A','9A','4A','11A','6A','1A','8A','3A','10A'];

function corr(a, b) {
  const ma = a.reduce((x, y) => x + y, 0) / 12, mb = b.reduce((x, y) => x + y, 0) / 12;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < 12; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

function decode(file, seconds) {
  return new Promise((resolve, reject) => {
    const args = ['-v', 'error', '-ss', '20', '-t', String(seconds), '-i', file,
                  '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'];
    const p = spawn(ffmpegPath(), args);
    const chunks = [];
    let bytes = 0;
    p.stdout.on('data', d => { chunks.push(d); bytes += d.length; });
    p.stderr.on('data', () => {});
    p.on('error', reject);
    p.on('close', code => {
      if (!bytes) return reject(new Error('ffmpeg: aucun echantillon (' + path.basename(file) + ')'));
      const buf = Buffer.concat(chunks, bytes - (bytes % 4));
      resolve(new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4));
    });
  });
}

/**
 * Analyse un fichier audio.
 * @returns {Promise<{energy:number, timbre:[number,number,number], key:string, vocalish:number}>}
 */
async function analyze(file, opts) {
  opts = opts || {};
  const pcm = await decode(file, opts.seconds || 120);
  const frames = Math.max(1, Math.floor((pcm.length - N) / HOP));
  const re = new Float64Array(N), im = new Float64Array(N);
  const prevMag = new Float64Array(N / 2);
  const chroma = new Float64Array(12);

  const rms = [], centroid = [], flux = [], lowRatio = [], highRatio = [];

  for (let f = 0; f < frames; f++) {
    const off = f * HOP;
    let sum = 0;
    for (let i = 0; i < N; i++) {
      const s = pcm[off + i] || 0;
      sum += s * s;
      re[i] = s * HANN[i]; im[i] = 0;
    }
    rms.push(Math.sqrt(sum / N));
    fft(re, im);

    let magSum = 0, freqSum = 0, low = 0, high = 0, fl = 0;
    for (let k = 1; k < N / 2; k++) {
      const mag = Math.hypot(re[k], im[k]);
      const hz = (k * SR) / N;
      magSum += mag; freqSum += mag * hz;
      if (hz < 250) low += mag;
      if (hz > 4000) high += mag;
      const d = mag - prevMag[k];
      if (d > 0) fl += d;
      prevMag[k] = mag;
      if (hz > 60 && hz < 2000 && mag > 0) {
        const midi = 69 + 12 * Math.log2(hz / 440);
        chroma[((Math.round(midi) % 12) + 12) % 12] += mag;
      }
    }
    if (magSum > 0) {
      centroid.push(freqSum / magSum);
      lowRatio.push(low / magSum);
      highRatio.push(high / magSum);
    }
    flux.push(fl);
  }

  const pct = (arr, p) => {
    if (!arr.length) return 0;
    const s = arr.slice().sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(p * s.length))];
  };
  const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* energie 1..10 : niveau soutenu + densite d'attaques */
  const loud = pct(rms, 0.9);
  const db = 20 * Math.log10(loud || 1e-6);              // ~ -30 .. -6 dBFS
  const level = clamp((db + 30) / 24, 0, 1);
  const density = clamp(mean(flux) / (pct(flux, 0.98) || 1), 0, 1);
  const energy = clamp(Math.round((level * 0.62 + density * 0.38) * 9 + 1), 1, 10);

  /* timbre [brillance, densite, chaleur] sur 10 */
  const cen = mean(centroid);
  const brightness = clamp(Math.round(((Math.log2((cen || 500) / 250)) / 4) * 10), 0, 10);
  const dens = clamp(Math.round(density * 10 + (pct(flux, 0.6) > 0 ? 1 : 0)), 0, 10);
  const warmth = clamp(Math.round(mean(lowRatio) * 26), 0, 10);

  /* tonalite */
  const chr = Array.from(chroma);
  let bestScore = -2, bestKey = null;
  for (let r = 0; r < 12; r++) {
    const rot = chr.slice(r).concat(chr.slice(0, r));
    const cM = corr(rot, MAJ), cm = corr(rot, MIN);
    if (cM > bestScore) { bestScore = cM; bestKey = CAM_MAJ[r]; }
    if (cm > bestScore) { bestScore = cm; bestKey = CAM_MIN[r]; }
  }

  /* tempo : autocorrelation de l'enveloppe d'attaques */
  const bpm = estimateBPM(flux, SR / HOP);

  /* indice de presence vocale : energie 300-3400 Hz + variabilite du centroide */
  const vocalish = clamp(Math.round((mean(highRatio) * 12 + (1 - mean(lowRatio)) * 4)), 0, 10);

  return {
    bpm: bpm,
    energy: energy,
    timbre: [brightness, dens, warmth],
    key: bestKey,
    keyConfidence: Math.round(Math.max(0, bestScore) * 100) / 100,
    vocalish: vocalish
  };
}

/* ---------- estimation de tempo ---------- */
function estimateBPM(flux, frameRate) {
  if (!flux || flux.length < 64) return 0;
  const n = flux.length;
  const m = flux.reduce((a, b) => a + b, 0) / n;
  const env = flux.map(v => Math.max(0, v - m));

  const lagFor = bpm => Math.round((60 / bpm) * frameRate);
  const loLag = lagFor(200), hiLag = Math.min(n - 2, lagFor(60));
  let best = 0, bestLag = 0;
  const scores = [];
  for (let lag = loLag; lag <= hiLag; lag++) {
    let s = 0;
    for (let i = 0; i + lag < n; i++) s += env[i] * env[i + lag];
    s /= (n - lag);
    scores.push([lag, s]);
    if (s > best) { best = s; bestLag = lag; }
  }
  if (!bestLag) return 0;

  /* on renforce les lags dont les multiples resonnent aussi */
  const at = lag => { const f = scores.find(x => x[0] === lag); return f ? f[1] : 0; };
  let bestComb = -1, chosen = bestLag;
  for (const [lag, s] of scores) {
    const comb = s + 0.6 * at(lag * 2) + 0.35 * at(Math.round(lag / 2));
    if (comb > bestComb) { bestComb = comb; chosen = lag; }
  }

  /* interpolation parabolique : le pic tombe rarement pile sur un entier */
  const y0 = at(chosen - 1), y1 = at(chosen), y2 = at(chosen + 1);
  const den = y0 - 2 * y1 + y2;
  const delta = den ? Math.max(-0.5, Math.min(0.5, 0.5 * (y0 - y2) / den)) : 0;

  let bpm = (60 * frameRate) / (chosen + delta);
  while (bpm < 82) bpm *= 2;
  while (bpm > 178) bpm /= 2;
  return Math.round(bpm * 10) / 10;
}

module.exports = { analyze, ffmpegPath, estimateBPM };
