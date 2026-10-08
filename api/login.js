const { handler, send, body, AUTH_REQUIRED, ADMIN_PASSWORD, safeEqual, makeToken, redis } = require('../lib/common');
module.exports = handler(['POST'], async (req, res) => {
  if (!AUTH_REQUIRED) return send(res, 200, { token: '' });
  const ip = String(req.headers['x-forwarded-for'] || 'x').split(',')[0].trim();
  const key = 'rooms:fail:' + ip;
  let fails = 0;
  try { fails = +(await redis(['GET', key])) || 0; } catch (e) { /* jika Redis bermasalah, lewati pembatasan */ }
  if (fails >= 5) return send(res, 429, { error: 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' });
  const b = body(req);
  if (safeEqual(b.password || '', ADMIN_PASSWORD)) {
    try { await redis(['DEL', key]); } catch (e) {}
    return send(res, 200, { token: makeToken() });
  }
  try { const n = await redis(['INCR', key]); if (n === 1) await redis(['EXPIRE', key, 900]); } catch (e) {}
  await new Promise(r => setTimeout(r, 700));
  send(res, 401, { error: 'Password salah' });
});
