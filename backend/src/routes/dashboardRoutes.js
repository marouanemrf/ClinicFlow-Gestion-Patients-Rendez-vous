const { Router } = require('express');
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = Router();

router.get('/stats', authMiddleware, dashboardController.getStats);

module.exports = router;
