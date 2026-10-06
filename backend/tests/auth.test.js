const jwt = require('jsonwebtoken');
const { api, db, ADMIN, resetDatabase, loginAs } = require('./helpers');
const { jwt: jwtConfig } = require('../src/config/env');

beforeAll(resetDatabase);
afterAll(() => db.close());

describe('POST /api/auth/login', () => {
  it('returns a token and the user without the password hash', async () => {
    const response = await api().post('/api/auth/login').send(ADMIN);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(response.body.data.user).toMatchObject({ email: ADMIN.email, role: 'admin', fullName: 'Admin ClinicFlow' });
    expect(JSON.stringify(response.body)).not.toMatch(/password/i);
  });

  it('normalises the email before looking the user up', async () => {
    const response = await api().post('/api/auth/login').send({ ...ADMIN, email: '  ADMIN@ClinicFlow.com ' });
    expect(response.status).toBe(200);
  });

  it('rejects a wrong password with 401', async () => {
    const response = await api().post('/api/auth/login').send({ ...ADMIN, password: 'Wrong123!' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ success: false, message: 'Invalid email or password', error: 'INVALID_CREDENTIALS' });
  });

  it('rejects an unknown email with the same 401 response', async () => {
    const response = await api().post('/api/auth/login').send({ email: 'nobody@clinicflow.com', password: 'Admin123!' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('INVALID_CREDENTIALS');
  });

  it('rejects an invalid body with 400', async () => {
    const response = await api().post('/api/auth/login').send({ email: 'not-an-email' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('VALIDATION_ERROR');
  });
});

describe('authMiddleware (GET /api/auth/me)', () => {
  it('returns the current user with a valid token', async () => {
    const token = await loginAs(ADMIN);
    const response = await api().get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ email: ADMIN.email, role: 'admin' });
    expect(response.body.data.passwordHash).toBeUndefined();
  });

  it('returns 401 when the token is missing', async () => {
    const response = await api().get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('TOKEN_MISSING');
  });

  it('returns 401 for a token signed with another secret', async () => {
    const forged = jwt.sign({ role: 'admin' }, 'another-secret-another-secret-another', { subject: 'x' });
    const response = await api().get('/api/auth/me').set('Authorization', `Bearer ${forged}`);

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('INVALID_TOKEN');
  });

  it('returns 401 for an expired token', async () => {
    const expired = jwt.sign({ role: 'admin', exp: Math.floor(Date.now() / 1000) - 60 }, jwtConfig.secret, {
      subject: '00000000-0000-4000-8000-000000000000',
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });
    const response = await api().get('/api/auth/me').set('Authorization', `Bearer ${expired}`);

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('TOKEN_EXPIRED');
  });

  it('protects every business route', async () => {
    for (const path of ['/api/patients', '/api/appointments', '/api/dashboard/stats']) {
      const response = await api().get(path);
      expect(response.status).toBe(401);
    }
  });
});
