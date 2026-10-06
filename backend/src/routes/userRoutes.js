const { Router } = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validate');
const { createUserSchema } = require('../validators/userValidators');

const router = Router();

router.use(authMiddleware, roleMiddleware('admin'));

router.get('/', userController.list);
router.post('/', validate({ body: createUserSchema }), userController.create);

module.exports = router;
