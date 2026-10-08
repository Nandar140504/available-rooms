const crypto = require('crypto');
const { handler, send, body, isAuth, validBooking, findClash, loadData, saveData, publicData } = require('../../lib/common');
// Tambah / ubah jadwal
module.exports = handler(['POST'], async (req, res) => {
  if (!isAuth(req)) return send(res, 401, { error: 'Belum login' });
  const b = body(req), v = validBooking(b);
  if (v.err) return send(res, 400, { error: v.err });
  const d = await loadData();
  const id = /^[a-f0-9]{6,20}$/.test(b.id || '') ? b.id : null;
  if (id && !d.jadwal.some(x => x.id === id)) return send(res, 404, { error: 'Jadwal tidak ditemukan' });
  const clash = findClash(d.jadwal, v.item, id);
  if (clash) return send(res, 409, { error: 'Bentrok dengan jadwal lain di ruangan ini: ' + clash.diklat + ' (' + (clash.mulai ? clash.mulai + '–' + clash.selesai : 'sepanjang hari') + ')' });
  const item = Object.assign({ id: id || crypto.randomBytes(5).toString('hex') }, v.item);
  d.jadwal = id ? d.jadwal.map(x => x.id === id ? item : x) : d.jadwal.concat([item]);
  if (d.jadwal.length > 1000) return send(res, 400, { error: 'Jadwal terlalu banyak' });
  await saveData(d);
  send(res, 200, await publicData());
});
