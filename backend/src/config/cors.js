const cors = require('cors');
const { clientOrigins } = require('./env');

module.exports = cors({
  origin(origin, callback) {
    // Requests without an Origin header (curl, Postman, server-to-server) are not CORS requests.
    callback(null, !origin || clientOrigins.includes(origin));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
});
