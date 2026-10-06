const { resetSchema, runMigrations, runSeed, runScript } = require('./dbScripts');

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to reset the database in production.');
  process.exit(1);
}

runScript(async (pool) => {
  await resetSchema(pool);
  await runMigrations(pool);
  await runSeed(pool);
});
