const fs = require('node:fs');
const path = require('node:path');

const DATABASE_DIR = process.env.DATABASE_DIR || path.resolve(__dirname, '../../database');
const MIGRATIONS_DIR = path.join(DATABASE_DIR, 'migrations');
const SEED_FILE = path.join(DATABASE_DIR, 'seed.sql');
// Arbitrary constant: prevents two processes from migrating at the same time.
const MIGRATION_LOCK_ID = 73194621;

async function runMigrations(pool, log = console.log) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((row) => row.name));
    const files = fs.readdirSync(MIGRATIONS_DIR).filter((name) => /^\d{3}_.+\.sql$/.test(name)).sort();

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      await client.query(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      log(`Applied migration ${file}`);
      count += 1;
    }

    await client.query('COMMIT');
    log(count ? `${count} migration(s) applied.` : 'Database is up to date.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function runSeed(pool, log = console.log) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(fs.readFileSync(SEED_FILE, 'utf8'));
    await client.query('COMMIT');
    log('Demo data inserted.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function resetSchema(pool) {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
}

async function runScript(task) {
  const db = require('../src/config/database');
  try {
    await task(db.pool);
  } catch (error) {
    console.error(`Failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}

module.exports = { runMigrations, runSeed, resetSchema, runScript };
