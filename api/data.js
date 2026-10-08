const { handler, publicData, send } = require('../lib/common');
// Dicache di CDN Vercel 20 detik agar banyak TV tidak membebani database.
module.exports = handler(['GET'], async (req, res) => {
  send(res, 200, await publicData(), 'public, s-maxage=20, stale-while-revalidate=60');
});
