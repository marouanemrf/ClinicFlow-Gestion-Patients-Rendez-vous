const fs = require('node:fs');
const { Pool, types } = require('pg');
const config = require('./env');

// Keep DATE columns (birth_date) as 'YYYY-MM-DD' strings instead of shifting them through JS Dates.
const DATE_OID = 1082;
types.setTypeParser(DATE_OID, (value) => value);

function buildSslOptions() {
  if (!config.database.ssl) return false;
  const ssl = { rejectUnauthorized: true };
  if (config.database.caCertPath) ssl.ca = fs.readFileSync(config.database.caCertPath, 'utf8');
  return ssl;
}

function buildConnectionString() {
  // SSL is configured explicitly above; URL ssl parameters would silently override it.
  const url = new URL(config.database.url);
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
  return url.toString();
}

const pool = new Pool({
  connectionString: buildConnectionString(),
  ssl: buildSslOptions(),
  // Every session works in the clinic time zone, so CURRENT_DATE and local date-times
  // such as '2026-10-10T10:00' are interpreted as clinic local time.
  options: `-c TimeZone=${config.clinicTimezone}`,
  max: 10,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error.message);
});

async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  withTransaction,
  close: () => pool.end(),
};
