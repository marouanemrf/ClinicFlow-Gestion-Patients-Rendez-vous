const userRepository = require('../db/repositories/userRepository');
const passwordService = require('./passwordService');
const tokenService = require('./tokenService');
const AppError = require('../utils/AppError');

async function login({ email, password }) {
  const user = await userRepository.findByEmailWithPassword(email);
  const passwordMatches = await passwordService.verify(password, user?.passwordHash);

  if (!user || !passwordMatches) {
    throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const { passwordHash, ...publicUser } = user;
  return { token: tokenService.sign(publicUser), user: publicUser };
}

module.exports = { login };
