const fs = require('node:fs');
const path = require('node:path');
const { uploadDir } = require('../src/config/env');
const { api, db, ADMIN, STAFF, resetDatabase, loginAs, createPatient } = require('./helpers');

// Smallest valid PNG (1x1 pixel).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

let adminToken;
let staffToken;

beforeAll(async () => {
  await resetDatabase();
  adminToken = await loginAs(ADMIN);
  staffToken = await loginAs(STAFF);
});
afterAll(async () => {
  fs.rmSync(uploadDir, { recursive: true, force: true });
  await db.close();
});

const asStaff = (req) => req.set('Authorization', `Bearer ${staffToken}`);
const photoFiles = () => fs.readdirSync(path.join(uploadDir, 'patients'));
const uploadPng = (patientId, buffer = PNG, contentType = 'image/png') =>
  asStaff(api().put(`/api/patients/${patientId}/photo`)).attach('photo', buffer, { filename: 'photo.png', contentType });

describe('patient photo', () => {
  it('uploads, serves, replaces and removes a photo', async () => {
    const patient = await createPatient(adminToken);
    expect(patient).toMatchObject({ hasPhoto: false, photoUpdatedAt: null });

    const uploaded = await uploadPng(patient.id);
    expect(uploaded.status).toBe(200);
    expect(uploaded.body.data).toMatchObject({ id: patient.id, hasPhoto: true, photoUpdatedAt: expect.any(String) });
    expect(uploaded.body.data).not.toHaveProperty('photo');

    const served = await asStaff(api().get(`/api/patients/${patient.id}/photo`)).buffer(true);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toBe('image/png');
    expect(Buffer.compare(served.body, PNG)).toBe(0);

    // Replacing the photo deletes the previous file.
    await uploadPng(patient.id);
    expect(photoFiles()).toHaveLength(1);

    const removed = await asStaff(api().delete(`/api/patients/${patient.id}/photo`));
    expect(removed.status).toBe(200);
    expect(removed.body.data).toMatchObject({ hasPhoto: false, photoUpdatedAt: null });
    expect(photoFiles()).toHaveLength(0);

    const missing = await asStaff(api().get(`/api/patients/${patient.id}/photo`));
    expect(missing.status).toBe(404);
    expect(missing.body.error).toBe('PHOTO_NOT_FOUND');
  });

  it('rejects a file that is not really an image, whatever its declared type', async () => {
    const patient = await createPatient(adminToken);
    const response = await uploadPng(patient.id, Buffer.from('<script>alert(1)</script> not an image'));

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('INVALID_PHOTO');
  });

  it('rejects unsupported file types and missing files', async () => {
    const patient = await createPatient(adminToken);

    const gif = await uploadPng(patient.id, PNG, 'image/gif');
    expect(gif.status).toBe(400);

    const noFile = await asStaff(api().put(`/api/patients/${patient.id}/photo`));
    expect(noFile.status).toBe(400);
    expect(noFile.body.error).toBe('PHOTO_REQUIRED');
  });

  it('rejects photos larger than 2 MB', async () => {
    const patient = await createPatient(adminToken);
    const response = await uploadPng(patient.id, Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]));

    expect(response.status).toBe(413);
    expect(response.body.error).toBe('PHOTO_TOO_LARGE');
  });

  it('returns 404 for an unknown patient and 401 without a token', async () => {
    expect((await uploadPng(UNKNOWN_ID)).status).toBe(404);
    expect((await api().get(`/api/patients/${UNKNOWN_ID}/photo`)).status).toBe(401);
  });
});
