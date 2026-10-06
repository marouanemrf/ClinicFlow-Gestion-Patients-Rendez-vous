const authService = require('../services/authService');
const { sendSuccess } = require('../utils/apiResponse');

async function login(req, res) {
  const result = await authService.login(req.validated.body);
  sendSuccess(res, result);
}

function me(req, res) {
  sendSuccess(res, req.user);
}

module.exports = { login, me };
