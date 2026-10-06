const multer = require('multer');
const AppError = require('../utils/AppError');
const { isProduction, isTest } = require('../config/env');

const UNIQUE_VIOLATIONS = {
  patients_cin_key: AppError.conflict('A patient with this CIN already exists', 'CIN_ALREADY_EXISTS'),
  users_email_key: AppError.conflict('A user with this email already exists', 'EMAIL_ALREADY_EXISTS'),
};

const APPOINTMENT_CONFLICT = AppError.conflict(
  'Patient already has a confirmed appointment within 30 minutes.',
  'APPOINTMENT_CONFLICT',
);

function translateError(error) {
  if (error instanceof AppError) return error;

  // Malformed JSON body or body too large (raised by express.json()).
  if (error.type === 'entity.parse.failed') return AppError.badRequest('Malformed JSON body', 'INVALID_JSON');
  if (error.type === 'entity.too.large') return new AppError(413, 'Request body is too large', 'PAYLOAD_TOO_LARGE');

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') return new AppError(413, 'Photo must not exceed 2 MB', 'PHOTO_TOO_LARGE');
    return AppError.badRequest('Invalid photo upload (send one file in the "photo" field)', 'INVALID_UPLOAD');
  }

  // PostgreSQL errors that can still happen despite service-level checks (e.g. concurrent requests).
  switch (error.code) {
    case '23505':
      return UNIQUE_VIOLATIONS[error.constraint] || AppError.conflict('Resource already exists', 'DUPLICATE_RESOURCE');
    case '23P01':
      return APPOINTMENT_CONFLICT;
    case '23503':
      return AppError.badRequest('Referenced resource does not exist', 'INVALID_REFERENCE');
    case '22P02':
    case '22007':
    case '22008':
      return AppError.badRequest('Invalid input value', 'INVALID_INPUT');
    default:
      return null;
  }
}

// Express recognises error handlers by their 4 arguments.
// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  const appError = translateError(error);

  if (!appError) {
    if (!isTest) console.error(error);
    return res.status(500).json({
      success: false,
      message: isProduction ? 'Internal server error' : error.message || 'Internal server error',
      error: 'INTERNAL_SERVER_ERROR',
    });
  }

  const body = { success: false, message: appError.message, error: appError.code };
  if (appError.details) body.details = appError.details;
  return res.status(appError.statusCode).json(body);
}

module.exports = errorHandler;
