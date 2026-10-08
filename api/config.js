const { handler, send, AUTH_REQUIRED } = require('../lib/common');
module.exports = handler(['GET'], async (req, res) => send(res, 200, { auth: AUTH_REQUIRED }));
