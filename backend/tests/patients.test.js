const { api, db, ADMIN, STAFF, resetDatabase, loginAs, createPatient } = require('./helpers');

let adminToken;
let staffToken;

beforeAll(async () => {
  await resetDatabase();
  adminToken = await loginAs(ADMIN);
  staffToken = await loginAs(STAFF);
});
afterAll(() => db.close());

const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);
const asStaff = (req) => req.set('Authorization', `Bearer ${staffToken}`);

describe('POST /api/patients', () => {
  it('creates a patient and normalises the CIN', async () => {
    const response = await asStaff(api().post('/api/patients')).send({
      fullName: '  Nadia Berrada ',
      cin: 'xy987654',
      phone: '0612345678',
      birthDate: '1993-03-14',
      address: '',
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      fullName: 'Nadia Berrada',
      cin: 'XY987654',
      birthDate: '1993-03-14',
      address: null,
    });
    expect(response.body.data.id).toEqual(expect.any(String));
  });

  it('returns 409 when the CIN already exists', async () => {
    const response = await asStaff(api().post('/api/patients')).send({
      fullName: 'Duplicate',
      cin: 'AB123456',
      phone: '0612345678',
      birthDate: '1990-01-01',
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ message: 'CIN already exists', error: 'CIN_ALREADY_EXISTS' });
  });

  it('returns 400 with field details for invalid data', async () => {
    const response = await asStaff(api().post('/api/patients')).send({
      fullName: '',
      cin: 'AB123456',
      phone: 'abc',
      birthDate: '2999-01-01',
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('VALIDATION_ERROR');
    const fields = response.body.details.map((detail) => detail.field);
    expect(fields).toEqual(expect.arrayContaining(['fullName', 'phone', 'birthDate']));
  });
});

describe('GET /api/patients (search & pagination)', () => {
  it('searches by CIN fragment', async () => {
    const response = await asStaff(api().get('/api/patients')).query({ search: 'ab123', page: 1, limit: 10 });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].cin).toBe('AB123456');
  });

  it('searches by name, case-insensitively', async () => {
    const response = await asStaff(api().get('/api/patients')).query({ search: 'bennani' });

    expect(response.body.data.map((patient) => patient.fullName)).toEqual(['Salma Bennani']);
  });

  it('treats LIKE wildcards in the search as plain text', async () => {
    const response = await asStaff(api().get('/api/patients')).query({ search: '%' });
    expect(response.body.data).toHaveLength(0);
  });

  it('returns pagination metadata', async () => {
    const response = await asStaff(api().get('/api/patients')).query({ page: 2, limit: 2 });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.pagination).toEqual({ page: 2, limit: 2, total: 6, totalPages: 3 });
  });

  it('rejects an invalid limit', async () => {
    const response = await asStaff(api().get('/api/patients')).query({ limit: 1000 });
    expect(response.status).toBe(400);
  });
});

describe('GET / PUT /api/patients/:id', () => {
  it('returns 404 for an unknown patient', async () => {
    const response = await asStaff(api().get('/api/patients/00000000-0000-4000-8000-000000000000'));

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, message: 'Patient not found', error: 'PATIENT_NOT_FOUND' });
  });

  it('updates a patient', async () => {
    const patient = await createPatient(staffToken);
    const response = await asStaff(api().put(`/api/patients/${patient.id}`)).send({
      fullName: 'Updated Name',
      cin: patient.cin,
      phone: '0700000000',
      birthDate: '1990-05-20',
      address: 'New address',
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ fullName: 'Updated Name', phone: '0700000000', address: 'New address' });
  });

  it('refuses to take the CIN of another patient', async () => {
    const patient = await createPatient(staffToken);
    const response = await asStaff(api().put(`/api/patients/${patient.id}`)).send({
      fullName: patient.fullName,
      cin: 'BE456789',
      phone: patient.phone,
      birthDate: patient.birthDate,
    });

    expect(response.status).toBe(409);
  });
});

describe('DELETE /api/patients/:id (admin only)', () => {
  it('forbids staff members with 403', async () => {
    const patient = await createPatient(staffToken);
    const response = await asStaff(api().delete(`/api/patients/${patient.id}`));

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('FORBIDDEN');
    expect((await asStaff(api().get(`/api/patients/${patient.id}`))).status).toBe(200);
  });

  it('lets an admin soft-delete a patient', async () => {
    const patient = await createPatient(staffToken);
    const response = await asAdmin(api().delete(`/api/patients/${patient.id}`));

    expect(response.status).toBe(200);
    expect((await asAdmin(api().get(`/api/patients/${patient.id}`))).status).toBe(404);

    const { rows } = await db.query('SELECT deleted_at FROM patients WHERE id = $1', [patient.id]);
    expect(rows[0].deleted_at).not.toBeNull();
  });

  it('keeps the CIN reserved after archiving', async () => {
    const patient = await createPatient(staffToken);
    await asAdmin(api().delete(`/api/patients/${patient.id}`));

    const response = await asStaff(api().post('/api/patients')).send({
      fullName: 'Same Person',
      cin: patient.cin,
      phone: '0612345678',
      birthDate: '1990-01-01',
    });
    expect(response.status).toBe(409);
    expect(response.body.message).toBe('This CIN belongs to an archived patient');
  });

  it('returns 404 when deleting an unknown patient', async () => {
    const response = await asAdmin(api().delete('/api/patients/00000000-0000-4000-8000-000000000000'));
    expect(response.status).toBe(404);
  });
});
