const app = require('./app');
const config = require('./config/env');
const db = require('./config/database');

const server = app.listen(config.port, () => {
  console.log(`ClinicFlow API listening on port ${config.port} (${config.nodeEnv})`);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  server.close(() => db.close().finally(() => process.exit(0)));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
