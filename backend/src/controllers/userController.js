const userService = require('../services/userService');
const { sendSuccess } = require('../utils/apiResponse');

async function list(req, res) {
  sendSuccess(res, await userService.listUsers());
}

async function create(req, res) {
  sendSuccess(res, await userService.createUser(req.validated.body), 201);
}

module.exports = { list, create };
