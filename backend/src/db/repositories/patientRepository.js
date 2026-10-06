const db = require('../../config/database');

const COLUMNS = `
  id,
  full_name AS "fullName",
  cin,
  phone,
  birth_date AS "birthDate",
  address,
  (photo IS NOT NULL) AS "hasPhoto",
  photo_updated_at AS "photoUpdatedAt",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

function escapeLikePattern(value) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

async function findMany({ search, limit, offset }) {
  const params = [];
  let where = 'WHERE deleted_at IS NULL';

  if (search) {
    params.push(`%${escapeLikePattern(search)}%`);
    where += ` AND (full_name ILIKE $1 OR cin ILIKE $1)`;
  }

  const countResult = await db.query(`SELECT count(*)::int AS total FROM patients ${where}`, params);
  const { rows } = await db.query(
    `SELECT ${COLUMNS} FROM patients ${where}
     ORDER BY full_name, id
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );

  return { rows, total: countResult.rows[0].total };
}

async function findActiveById(id) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM patients WHERE id = $1 AND deleted_at IS NULL`, [id]);
  return rows[0] || null;
}

/**
 * Locks the patient row until the end of the transaction. Every appointment
 * creation/confirmation for a patient takes this lock first, which serialises
 * the 30-minute rule check for that patient.
 */
async function lockById(client, id) {
  const { rows } = await client.query(
    'SELECT id, deleted_at AS "deletedAt" FROM patients WHERE id = $1 FOR UPDATE',
    [id],
  );
  return rows[0] || null;
}

async function findByCin(cin) {
  const { rows } = await db.query('SELECT id, deleted_at AS "deletedAt" FROM patients WHERE cin = $1', [cin]);
  return rows[0] || null;
}

async function create({ fullName, cin, phone, birthDate, address }) {
  const { rows } = await db.query(
    `INSERT INTO patients (full_name, cin, phone, birth_date, address)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLUMNS}`,
    [fullName, cin, phone, birthDate, address],
  );
  return rows[0];
}

async function update(id, { fullName, cin, phone, birthDate, address }) {
  const { rows } = await db.query(
    `UPDATE patients
     SET full_name = $2, cin = $3, phone = $4, birth_date = $5, address = $6
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING ${COLUMNS}`,
    [id, fullName, cin, phone, birthDate, address],
  );
  return rows[0] || null;
}

async function softDelete(id) {
  const { rowCount } = await db.query(
    'UPDATE patients SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL',
    [id],
  );
  return rowCount > 0;
}

/** Returns { photo } (file name or null) for an active patient, or null when the patient does not exist. */
async function findPhotoFilename(id) {
  const { rows } = await db.query('SELECT photo FROM patients WHERE id = $1 AND deleted_at IS NULL', [id]);
  return rows[0] || null;
}

async function updatePhoto(id, filename) {
  const { rows } = await db.query(
    `UPDATE patients
     SET photo = $2::varchar,
         photo_updated_at = CASE WHEN $2::varchar IS NULL THEN NULL ELSE now() END
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING ${COLUMNS}`,
    [id, filename],
  );
  return rows[0] || null;
}

async function countActive() {
  const { rows } = await db.query('SELECT count(*)::int AS total FROM patients WHERE deleted_at IS NULL');
  return rows[0].total;
}

module.exports = {
  findMany,
  findActiveById,
  lockById,
  findByCin,
  create,
  update,
  softDelete,
  findPhotoFilename,
  updatePhoto,
  countActive,
};
