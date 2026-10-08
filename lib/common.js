// Kode bersama untuk semua fungsi API (versi Vercel). Data disimpan di Upstash Redis (REST).
const crypto = require('crypto');

const ROOMS = [
  { nama: 'Education Room',   lantai: 'Lantai 2', kapasitas: '50/60' },
  { nama: 'Learning Room',    lantai: 'Lantai 1', kapasitas: '30/40' },
  { nama: 'Knowledge Room',   lantai: 'Lantai 1', kapasitas: '30/40' },
  { nama: 'Development Room', lantai: 'Lantai 1', kapasitas: '20/25' },
  { nama: 'Podcast',          lantai: 'Lantai 2', kapasitas: '6/10'  },
];
const KEEP_DAYS = 7;
const DEFAULT_TICKER = 'UNIT LEARNING & DEVELOPMENT';
const DATA_KEY = 'rooms:data';

// Password bersifat opsional, tetapi SANGAT disarankan diisi saat dipasang di internet.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const AUTH_REQUIRED = ADMIN_PASSWORD.length > 0;
const SECRET = crypto.createHash('sha256').update('rooms-secret:' + ADMIN_PASSWORD).digest();

// Upstash Redis (Marketplace Vercel menyuntikkan salah satu pasangan variabel ini)
const R_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const R_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(cmd) {
  if (!R_URL || !R_TOKEN) throw new Error('Redis belum terhubung ke proyek ini');
  const r = await fetch(R_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + R_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error('Redis error: ' + (j.error || r.status));
  return j.result;
}

const p2 = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
const toMin = s => { const a = s.split(':'); return +a[0] * 60 + +a[1]; };
const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

async function loadData() {
  let d = {};
  try { const raw = await redis(['GET', DATA_KEY]); if (raw) d = JSON.parse(raw); } catch (e) { if (/Redis/.test(e.message)) throw e; }
  const cut = ymd(new Date(Date.now() - KEEP_DAYS * 86400000));
  const jadwal = (Array.isArray(d.jadwal) ? d.jadwal : []).filter(x => x && x.tanggal >= cut);
  return { jadwal, ticker: clean(d.ticker, 200) || DEFAULT_TICKER };
}
const saveData = d => redis(['SET', DATA_KEY, JSON.stringify(d)]);
async function publicData() { const d = await loadData(); return { rooms: ROOMS, jadwal: d.jadwal, ticker: d.ticker }; }

function validBooking(b) {
  const ruang = clean(b.ruang, 60);
  if (!ROOMS.some(r => r.nama === ruang)) return { err: 'Ruangan tidak dikenal' };
  const tanggal = clean(b.tanggal, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || isNaN(Date.parse(tanggal))) return { err: 'Tanggal tidak valid' };
  const diklat = clean(b.diklat, 120);
  if (!diklat) return { err: 'Diklat / Acara wajib diisi' };
  const m = clean(b.mulai, 5), s = clean(b.selesai, 5), re = /^([01]\d|2[0-3]):[0-5]\d$/;
  if ((m && !re.test(m)) || (s && !re.test(s))) return { err: 'Format jam harus HH:MM' };
  if (!m !== !s) return { err: 'Isi jam mulai dan selesai, atau kosongkan keduanya' };
  if (m && toMin(s) <= toMin(m)) return { err: 'Jam selesai harus setelah jam mulai' };
  return { item: { ruang, tanggal, diklat, instruktur: clean(b.instruktur, 120), materi: clean(b.materi, 120), mulai: m, selesai: s } };
}
function findClash(list, item, ignoreId) {
  return list.find(x => x.id !== ignoreId && x.ruang === item.ruang && x.tanggal === item.tanggal &&
    (!x.mulai || !item.mulai || (toMin(item.mulai) < toMin(x.selesai) && toMin(x.mulai) < toMin(item.selesai))));
}

// Token login tanpa penyimpanan (ditandatangani), berlaku 12 jam
const sign = p => crypto.createHmac('sha256', SECRET).update(p).digest('hex');
function makeToken() { const p = String(Date.now() + 12 * 3600 * 1000); return p + '.' + sign(p); }
function isAuth(req) {
  if (!AUTH_REQUIRED) return true;
  const m = /^Bearer (\d+)\.([a-f0-9]{64})$/.exec(req.headers.authorization || '');
  if (!m || +m[1] < Date.now()) return false;
  return crypto.timingSafeEqual(Buffer.from(sign(m[1])), Buffer.from(m[2]));
}
function safeEqual(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest(), y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

function secHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
}
function send(res, code, obj, cache) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cache || 'no-store');
  res.end(JSON.stringify(obj));
}
function body(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  return b && typeof b === 'object' ? b : {};
}
// Pembungkus: batasi metode HTTP dan tangani error tanpa membocorkan detail
function handler(methods, fn) {
  return async (req, res) => {
    secHeaders(res);
    try {
      if (!methods.includes(req.method)) return send(res, 405, { error: 'Metode tidak didukung' });
      await fn(req, res);
    } catch (e) {
      console.error(e);
      send(res, 500, { error: /Redis/.test(String(e.message)) ? e.message : 'Terjadi kesalahan server' });
    }
  };
}

module.exports = { ROOMS, DEFAULT_TICKER, DATA_KEY, AUTH_REQUIRED, ADMIN_PASSWORD, redis, loadData, saveData, publicData,
  validBooking, findClash, makeToken, isAuth, safeEqual, send, body, handler, clean };
