const { api, db, STAFF, resetDatabase, loginAs } = require('./helpers');

beforeAll(resetDatabase);
afterAll(() => db.close());

describe('GET /api/dashboard/stats', () => {
  it('returns the dashboard counters for the seeded data', async () => {
    const token = await loginAs(STAFF);
    const response = await api().get('/api/dashboard/stats').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    // Seed: 5 patients; today 09:00 confirmed, 09:15 pending, 10:00 confirmed, 11:30 pending, 14:00 cancelled.
    // Upcoming (from today): 3 pending, 4 confirmed.
    expect(response.body.data).toEqual({
      totalPatients: 5,
      todayAppointments: 4,
      pendingAppointments: 3,
      confirmedAppointments: 4,
    });
  });
});
