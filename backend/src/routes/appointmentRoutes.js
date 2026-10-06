const { Router } = require('express');
const appointmentController = require('../controllers/appointmentController');
const authMiddleware = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const { uuidParam } = require('../validators/common');
const {
  createAppointmentSchema,
  updateStatusSchema,
  appointmentListQuery,
} = require('../validators/appointmentValidators');

const router = Router();

router.use(authMiddleware);

router.get('/', validate({ query: appointmentListQuery }), appointmentController.list);
router.post('/', validate({ body: createAppointmentSchema }), appointmentController.create);
router.patch(
  '/:id/status',
  validate({ params: uuidParam, body: updateStatusSchema }),
  appointmentController.updateStatus,
);

module.exports = router;
