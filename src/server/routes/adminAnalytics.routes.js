const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const controller = require('../controllers/adminAnalytics.controller');

// All routes require admin authentication
router.use(authenticateToken, requireAdmin);

router.get('/growth', controller.growth);
router.get('/leave', controller.leave);
router.get('/appointments', controller.appointments);
router.get('/sos', controller.sos);
router.get('/export/:dataset', controller.exportCsv);

module.exports = router;
