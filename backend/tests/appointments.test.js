const { api, db, ADMIN, STAFF, resetDatabase, loginAs, createPatient, futureDate } = require('./helpers');

let adminToken;
let staffToken;

beforeAll(async () => {
  await resetDatabase();
  adminToken = await loginAs(ADMIN);
  staffToken = await loginAs(STAFF);
});
afterAll(() => db.close());

const asStaff = (req) => req.set('Authorization', `Bearer ${staffToken}`);

function createAppointment(body) {
  return asStaff(api().post('/api/appointments')).send({ reason: 'Consultation', ...body });
}

function changeStatus(id, status) {
  return asStaff(api().patch(`/api/appointments/${id}/status`)).send({ status });
}

describe('POST /api/appointments', () => {
  it('creates a pending appointment authored by the JWT user', async () => {
    const patient = await createPatient(staffToken);
    const response = await createAppointment({ patientId: patient.id, appointmentDate: futureDate(3), notes: 'First visit' });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      patientId: patient.id,
      status: 'pending',
      reason: 'Consultation',
      notes: 'First visit',
      createdByName: 'Sara Bennis',
    });
  });

  it('does not accept createdBy from the request body', async () => {
    const patient = await createPatient(staffToken);
    const response = await createAppointment({
      patientId: patient.id,
      appointmentDate: futureDate(3),
      createdBy: '00000000-0000-4000-8000-000000000000',
    });

    expect(response.status).toBe(400);
  });

  it('returns 404 for an unknown patient', async () => {
    const response = await createAppointment({
      patientId: '00000000-0000-4000-8000-000000000000',
      appointmentDate: futureDate(3),
    });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('PATIENT_NOT_FOUND');
  });

  it('rejects a date in the past', async () => {
    const patient = await createPatient(staffToken);
    const response = await createAppointment({ patientId: patient.id, appointmentDate: futureDate(-1) });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('APPOINTMENT_IN_PAST');
  });

  it('rejects appointments for an archived patient', async () => {
    const patient = await createPatient(staffToken);
    await api().delete(`/api/patients/${patient.id}`).set('Authorization', `Bearer ${adminToken}`);
    const response = await createAppointment({ patientId: patient.id, appointmentDate: futureDate(3) });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('PATIENT_ARCHIVED');
  });
});

describe('GET /api/appointments', () => {
  it('filters by date and status', async () => {
    const patient = await createPatient(staffToken);
    const date = futureDate(10, 9);
    await createAppointment({ patientId: patient.id, appointmentDate: date, status: 'confirmed' });
    await createAppointment({ patientId: patient.id, appointmentDate: futureDate(10, 13) });

    const day = date.slice(0, 10);
    const all = await asStaff(api().get('/api/appointments')).query({ date: day });
    const confirmed = await asStaff(api().get('/api/appointments')).query({ date: day, status: 'confirmed' });

    expect(all.status).toBe(200);
    expect(all.body.data).toHaveLength(2);
    expect(confirmed.body.data).toHaveLength(1);
    expect(confirmed.body.data[0].status).toBe('confirmed');
    expect(confirmed.body.pagination.total).toBe(1);
  });

  it('rejects an unknown status filter', async () => {
    const response = await asStaff(api().get('/api/appointments')).query({ status: 'done' });
    expect(response.status).toBe(400);
  });
});

describe('PATCH /api/appointments/:id/status', () => {
  it('updates the status', async () => {
    const patient = await createPatient(staffToken);
    const created = await createAppointment({ patientId: patient.id, appointmentDate: futureDate(4) });

    const confirmed = await changeStatus(created.body.data.id, 'confirmed');
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.status).toBe('confirmed');

    const cancelled = await changeStatus(created.body.data.id, 'cancelled');
    expect(cancelled.body.data.status).toBe('cancelled');
  });

  it('returns 404 for an unknown appointment', async () => {
    const response = await changeStatus('00000000-0000-4000-8000-000000000000', 'confirmed');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('APPOINTMENT_NOT_FOUND');
  });

  it('rejects an invalid status', async () => {
    const response = await changeStatus('00000000-0000-4000-8000-000000000000', 'done');
    expect(response.status).toBe(400);
  });
});

describe('Business rule: no two CONFIRMED appointments within 30 minutes', () => {
  const CONFLICT = {
    success: false,
    message: 'Patient already has a confirmed appointment within 30 minutes.',
    error: 'APPOINTMENT_CONFLICT',
  };

  let patient;
  beforeEach(async () => {
    patient = await createPatient(staffToken);
    const first = await createAppointment({ patientId: patient.id, appointmentDate: futureDate(5, 10, 0), status: 'confirmed' });
    expect(first.status).toBe(201);
  });

  it('refuses a confirmed appointment 15 minutes later (409)', async () => {
    const response = await createAppointment({ patientId: patient.id, appointmentDate: futureDate(5, 10, 15), status: 'confirmed' });

    expect(response.status).toBe(409);
    expect(response.body).toEqual(CONFLICT);
  });

  it('refuses a confirmed appointment 15 minutes earlier (409)', async () => {
    const response = await createAppointment({ patientId: patient.id, appointmentDate: futureDate(5, 9, 45), status: 'confirmed' });
    expect(response.status).toBe(409);
  });

  it('accepts a confirmed appointment exactly 30 minutes later', async () => {
    const response = await createAppointment({ patientId: patient.id, appointmentDate: futureDate(5, 10, 30), status: 'confirmed' });
    expect(response.status).toBe(201);
  });

  it('accepts a pending appointment inside the window', async () => {
    const response = await createAppointment({ patientId: patient.id, appointmentDate: futureDate(5, 10, 10) });
    expect(response.status).toBe(201);
  });

  it('re-checks the rule when a pending appointment is confirmed', async () => {
    const pending = await createAppointment({ patientId: patient.id, appointmentDate: futureDate(5, 10, 10) });
    const response = await changeStatus(pending.body.data.id, 'confirmed');

    expect(response.status).toBe(409);
    expect(response.body).toEqual(CONFLICT);
  });

  it('allows the confirmation once the other appointment is cancelled', async () => {
    const pending = await createAppointment({ patientId: patient.id, appointmentDate: futureDate(5, 10, 10) });
    const list = await asStaff(api().get('/api/appointments')).query({ patientId: patient.id, status: 'confirmed' });
    await changeStatus(list.body.data[0].id, 'cancelled');

    const response = await changeStatus(pending.body.data.id, 'confirmed');
    expect(response.status).toBe(200);
  });

  it('does not apply across different patients', async () => {
    const otherPatient = await createPatient(staffToken);
    const response = await createAppointment({
      patientId: otherPatient.id,
      appointmentDate: futureDate(5, 10, 0),
      status: 'confirmed',
    });
    expect(response.status).toBe(201);
  });

  it('is also enforced by the database exclusion constraint', async () => {
    const { rows } = await db.query('SELECT created_by FROM appointments WHERE patient_id = $1', [patient.id]);
    const insert = db.query(
      `INSERT INTO appointments (patient_id, appointment_date, status, reason, created_by)
       VALUES ($1, $2, 'confirmed', 'Direct insert', $3)`,
      [patient.id, futureDate(5, 10, 20), rows[0].created_by],
    );
    await expect(insert).rejects.toMatchObject({ code: '23P01' });
  });

  it('lets only one of two concurrent confirmations succeed', async () => {
    const [a, b] = await Promise.all([
      createAppointment({ patientId: patient.id, appointmentDate: futureDate(6, 14, 0) }),
      createAppointment({ patientId: patient.id, appointmentDate: futureDate(6, 14, 20) }),
    ]);

    const results = await Promise.all([changeStatus(a.body.data.id, 'confirmed'), changeStatus(b.body.data.id, 'confirmed')]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  });
});
