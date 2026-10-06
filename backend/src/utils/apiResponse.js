function sendSuccess(res, data, statusCode = 200, extra = {}) {
  return res.status(statusCode).json({ success: true, data, ...extra });
}

function sendPaginated(res, { data, pagination }) {
  return sendSuccess(res, data, 200, { pagination });
}

module.exports = { sendSuccess, sendPaginated };
