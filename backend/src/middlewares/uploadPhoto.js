const multer = require('multer');
const AppError = require('../utils/AppError');

const MAX_PHOTO_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Kept in memory: the file content is checked (photoStorage) before anything is written to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_SIZE, files: 1 },
  fileFilter(req, file, callback) {
    if (ALLOWED_TYPES.includes(file.mimetype)) return callback(null, true);
    return callback(AppError.badRequest('Photo must be a JPEG, PNG or WebP image', 'INVALID_PHOTO'));
  },
});

function uploadPhoto(req, res, next) {
  upload.single('photo')(req, res, (error) => {
    if (error) return next(error);
    if (!req.file) return next(AppError.badRequest('A photo file is required (field "photo")', 'PHOTO_REQUIRED'));
    return next();
  });
}

module.exports = { uploadPhoto, MAX_PHOTO_SIZE };
