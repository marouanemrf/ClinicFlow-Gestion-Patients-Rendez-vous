const db = require('../../config/database');

const SELECT_WITH_RELATIONS = `
  SELECT
    a.id,
    a.patient_id AS "patientId",
    p.full_name AS "patientName",
    p.cin AS "patientCin",
    (p.deleted_at IS NOT NULL) AS "patientArchived",
    a.appointment_date AS "appointmentDate",
    a.status,
    a.reason,
    a.notes,
    a.created_by AS "createdBy",
    u.full_name AS "createdByName",
    a.created_at AS "createdAt",
    a.updated_at AS "updatedAt"
  FROM appointments a
  JOIN patients p ON p.id = a.patient_id
  JOIN users u ON u.id = a.created_by
`;

function buildFilters({ date, status, patientId }) {
  const conditions = [];
  const params = [];

  if (date) {
    // Range on the clinic-local day (session time zone) keeps the index on appointment_date usable.
    params.push(date);
    conditions.push(
      `a.appointment_date >= $${params.length}::date::timestamptz AND a.appointment_date < ($${params.length}::date + 1)::timestamptz`,
    );
  }
  if (status) {
    params.push(status);
    conditions.push(`a.status = $${params.length}`);
  }
  if (patientId) {
    params.push(patientId);
    conditions.push(`a.patient_id = $${params.length}`);
  }

  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

async function findMany(filters, { limit, offset }) {
  const { where, params } = buildFilters(filters);
  // A single day reads best chronologically; otherwise show the latest appointments first.
  const order = filters.date ? 'a.appointment_date ASC' : 'a.appointment_date DESC';

  const countResult = await db.query(`SELECT count(*)::int AS total FROM appointments a ${where}`, params);
  const { rows } = await db.query(
    `${SELECT_WITH_RELATIONS} ${where}
     ORDER BY ${order}, a.id
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );

  return { rows, total: countResult.rows[0].total };
}

async function findById(id, client = db) {
  const { rows } = await client.query(`${SELECT_WITH_RELATIONS} WHERE a.id = $1`, [id]);
  return rows[0] || null;
}

async function findByIdForUpdate(client, id) {
  const { rows } = await client.query(
    `SELECT id, patient_id AS "patientId", appointment_date AS "appointmentDate", status
     FROM appointments WHERE id = $1 FOR UPDATE`,
    [id],
  );
  return rows[0] || null;
}

/**
 * Lets PostgreSQL parse the requested date-time: values without an offset are
 * read in the clinic time zone (set on every session).
 */
async function resolveDate(client, rawDate) {
  const { rows } = await client.query(
    'SELECT $1::timestamptz AS "appointmentDate", ($1::timestamptz <= now()) AS "isPast"',
    [rawDate],
  );
  return rows[0];
}

/**
 * 30-minute rule: another CONFIRMED appointment of the same patient strictly
 * less than 30 minutes before or after the given date is a conflict.
 * 10:00 vs 10:15 conflicts; 10:00 vs 10:30 does not.
 */
async function hasConfirmedConflict(client, { patientId, appointmentDate, excludeId = null }) {
  const { rows } = await client.query(
    `SELECT EXISTS (
       SELECT 1 FROM appointments
       WHERE patient_id = $1
         AND status = 'confirmed'
         AND appointment_date > $2::timestamptz - interval '30 minutes'
         AND appointment_date < $2::timestamptz + interval '30 minutes'
         AND ($3::uuid IS NULL OR id <> $3::uuid)
     ) AS "hasConflict"`,
    [patientId, appointmentDate, excludeId],
  );
  return rows[0].hasConflict;
}

async function create(client, { patientId, appointmentDate, status, reason, notes, createdBy }) {
  const { rows } = await client.query(
    `INSERT INTO appointments (patient_id, appointment_date, status, reason, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [patientId, appointmentDate, status, reason, notes, createdBy],
  );
  return rows[0].id;
}

async function updateStatus(client, id, status) {
  await client.query('UPDATE appointments SET status = $2 WHERE id = $1', [id, status]);
}

async function getDashboardCounts() {
  const { rows } = await db.query(
    `SELECT
       count(*) FILTER (
         WHERE appointment_date >= CURRENT_DATE::timestamptz
           AND appointment_date < (CURRENT_DATE + 1)::timestamptz
           AND status <> 'cancelled'
       )::int AS "todayAppointments",
       count(*) FILTER (WHERE status = 'pending' AND appointment_date >= CURRENT_DATE::timestamptz)::int AS "pendingAppointments",
       count(*) FILTER (WHERE status = 'confirmed' AND appointment_date >= CURRENT_DATE::timestamptz)::int AS "confirmedAppointments"
     FROM appointments`,
  );
  return rows[0];
}

module.exports = {
  findMany,
  findById,
  findByIdForUpdate,
  resolveDate,
  hasConfirmedConflict,
  create,
  updateStatus,
  getDashboardCounts,
};
