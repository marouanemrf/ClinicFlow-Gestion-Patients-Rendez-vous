const { Router } = require('express');
const { z } = require('zod');
const patientController = require('../controllers/patientController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validate');
const { uploadPhoto } = require('../middlewares/uploadPhoto');
const { uuidParam, pageQuery } = require('../validators/common');
const { patientSchema, patientListQuery } = require('../validators/patientValidators');

const router = Router();

router.use(authMiddleware);

router.get('/', validate({ query: patientListQuery }), patientController.list);
router.post('/', validate({ body: patientSchema }), patientController.create);
router.get('/:id', validate({ params: uuidParam }), patientController.getById);
router.get(
  '/:id/appointments',
  validate({ params: uuidParam, query: z.object(pageQuery).strict() }),
  patientController.listAppointments,
);
router.put('/:id', validate({ params: uuidParam, body: patientSchema }), patientController.update);
router.delete('/:id', roleMiddleware('admin'), validate({ params: uuidParam }), patientController.remove);

router.get('/:id/photo', validate({ params: uuidParam }), patientController.getPhoto);
router.put('/:id/photo', validate({ params: uuidParam }), uploadPhoto, patientController.uploadPhoto);
router.delete('/:id/photo', validate({ params: uuidParam }), patientController.deletePhoto);

module.exports = router;
