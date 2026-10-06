const AppError = require('../utils/AppError');
const tokenService = require('../services/tokenService');
const userRepository = require('../db/repositories/userRepository');

async function authMiddleware(req, res, next) {
  const [scheme, token] = (req.get('Authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw AppError.unauthorized('Authentication token is missing', 'TOKEN_MISSING');
  }

  const payload = tokenService.verify(token);

  // Reload the user so a deleted account or a changed role takes effect immediately.
  const user = await userRepository.findById(payload.sub);
  if (!user) throw AppError.unauthorized('User no longer exists', 'INVALID_TOKEN');

  req.user = user;
  next();
}

module.exports = authMiddleware;
