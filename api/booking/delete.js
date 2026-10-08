const { handler, send, body, isAuth, loadData, saveData, publicData } = require('../../lib/common');
module.exports = handler(['POST'], async (req, res) => {
  if (!isAuth(req)) return send(res, 401, { error: 'Belum login' });
  const d = await loadData();
  d.jadwal = d.jadwal.filter(x => x.id !== body(req).id);
  await saveData(d);
  send(res, 200, await publicData());
});
