const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');
const { resetSchema, runMigrations, runSeed } = require('../scripts/dbScripts');

const ADMIN = { email: 'admin@clinicflow.com', password: 'Admin123!' };
const STAFF = { email: 'staff1@clinicflow.com', password: 'Staff123!' };

const api = () => request(app);

async function resetDatabase() {
  if (!/_test\b/.test(process.env.DATABASE_URL || '')) {
    throw new Error('Tests must run against a dedicated *_test database');
  }
  const silent = () => {};
  await resetSchema(db.pool);
  await runMigrations(db.pool, silent);
  await runSeed(db.pool, silent);
}

async function loginAs(credentials) {
  const response = await api().post('/api/auth/login').send(credentials);
  return response.body.data.token;
}

async function createPatient(token, overrides = {}) {
  const uniqueDigits = String(Date.now()).slice(-6) + String(Math.floor(Math.random() * 100)).padStart(2, '0');
  const response = await api()
    .post('/api/patients')
    .set('Authorization', `Bearer ${token}`)
    .send({
      fullName: 'Test Patient',
      cin: `TP${uniqueDigits}`,
      phone: '+212 600 000 000',
      birthDate: '1990-05-20',
      ...overrides,
    });
  return response.body.data;
}

/** A date `days` days from now at the given UTC hour/minute, as an ISO string. */
function futureDate(days, hours = 10, minutes = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hours, minutes, 0, 0);
  return date.toISOString();
}

module.exports = { api, db, ADMIN, STAFF, resetDatabase, loginAs, createPatient, futureDate };
