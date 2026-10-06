const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/env');
const AppError = require('../utils/AppError');

const SIGN_OPTIONS = {
  algorithm: 'HS256',
  expiresIn: jwtConfig.expiresIn,
  issuer: jwtConfig.issuer,
  audience: jwtConfig.audience,
};

const VERIFY_OPTIONS = {
  algorithms: ['HS256'],
  issuer: jwtConfig.issuer,
  audience: jwtConfig.audience,
};

function sign(user) {
  return jwt.sign({ role: user.role }, jwtConfig.secret, { ...SIGN_OPTIONS, subject: user.id });
}

function verify(token) {
  try {
    return jwt.verify(token, jwtConfig.secret, VERIFY_OPTIONS);
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized('Session expired, please log in again', 'TOKEN_EXPIRED');
    }
    throw AppError.unauthorized('Invalid authentication token', 'INVALID_TOKEN');
  }
}

module.exports = { sign, verify };
