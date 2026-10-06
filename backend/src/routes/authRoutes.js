const { Router } = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const { loginSchema } = require('../validators/authValidators');

const router = Router();

router.post('/login', validate({ body: loginSchema }), authController.login);
router.get('/me', authMiddleware, authController.me);

module.exports = router;
