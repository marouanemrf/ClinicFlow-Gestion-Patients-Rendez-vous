const dashboardService = require('../services/dashboardService');
const { sendSuccess } = require('../utils/apiResponse');

async function getStats(req, res) {
  sendSuccess(res, await dashboardService.getStats());
}

module.exports = { getStats };
