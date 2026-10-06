const { Router } = require('express');

const router = Router();

router.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));
router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/patients', require('./patientRoutes'));
router.use('/appointments', require('./appointmentRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));

module.exports = router;
