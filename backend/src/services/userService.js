const userRepository = require('../db/repositories/userRepository');
const passwordService = require('./passwordService');

function listUsers() {
  return userRepository.findAll();
}

async function createUser({ password, ...user }) {
  const passwordHash = await passwordService.hash(password);
  return userRepository.create({ ...user, passwordHash });
}

module.exports = { listUsers, createUser };
