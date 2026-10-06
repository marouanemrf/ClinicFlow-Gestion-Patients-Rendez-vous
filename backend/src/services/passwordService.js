const bcrypt = require('bcrypt');
const { bcryptRounds } = require('../config/env');

// Compared against when the email is unknown, so both paths take the same time
// and response timing does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('clinicflow-timing-protection', bcryptRounds);

function hash(password) {
  return bcrypt.hash(password, bcryptRounds);
}

function verify(password, passwordHash) {
  return bcrypt.compare(password, passwordHash || DUMMY_HASH);
}

module.exports = { hash, verify };
