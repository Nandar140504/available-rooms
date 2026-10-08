const { handler, send, body, isAuth, loadData, saveData, publicData, clean, DEFAULT_TICKER } = require('../lib/common');
module.exports = handler(['POST'], async (req, res) => {
  if (!isAuth(req)) return send(res, 401, { error: 'Belum login' });
  const d = await loadData();
  d.ticker = clean(body(req).ticker, 200) || DEFAULT_TICKER;
  await saveData(d);
  send(res, 200, await publicData());
});
