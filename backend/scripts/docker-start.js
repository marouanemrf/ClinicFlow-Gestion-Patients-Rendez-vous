const db = require('../src/config/database');
const { runMigrations, runSeed } = require('./dbScripts');

// Container entrypoint: migrate (and optionally seed) before starting the API.
async function start() {
  await runMigrations(db.pool);
  if (process.env.SEED_DEMO_DATA === 'true') await runSeed(db.pool);
  require('../src/server');
}

start().catch((error) => {
  console.error(`Startup failed: ${error.message}`);
  process.exit(1);
});
