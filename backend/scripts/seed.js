const { runSeed, runScript } = require('./dbScripts');

runScript((pool) => runSeed(pool));
