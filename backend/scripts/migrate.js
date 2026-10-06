const { runMigrations, runScript } = require('./dbScripts');

runScript((pool) => runMigrations(pool));
