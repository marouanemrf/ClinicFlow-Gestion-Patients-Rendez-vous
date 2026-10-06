const db = require('../../config/database');

// password_hash is only selected by findByEmailWithPassword, never returned to clients.
const PUBLIC_COLUMNS = `
  id,
  full_name AS "fullName",
  email,
  role,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

async function findById(id) {
  const { rows } = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function findByEmailWithPassword(email) {
  const { rows } = await db.query(
    `SELECT ${PUBLIC_COLUMNS}, password_hash AS "passwordHash" FROM users WHERE email = $1`,
    [email],
  );
  return rows[0] || null;
}

async function findAll() {
  const { rows } = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY role, full_name`);
  return rows;
}

async function create({ fullName, email, passwordHash, role }) {
  const { rows } = await db.query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING ${PUBLIC_COLUMNS}`,
    [fullName, email, passwordHash, role],
  );
  return rows[0];
}

module.exports = { findById, findByEmailWithPassword, findAll, create };
