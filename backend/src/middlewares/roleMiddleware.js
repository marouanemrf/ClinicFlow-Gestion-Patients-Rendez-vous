const AppError = require('../utils/AppError');

function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) throw AppError.unauthorized();
    if (!allowedRoles.includes(req.user.role)) throw AppError.forbidden();
    next();
  };
}

module.exports = roleMiddleware;
