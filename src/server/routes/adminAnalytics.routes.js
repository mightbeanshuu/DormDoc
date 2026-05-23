const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/adminAnalytics.controller');

// All routes require admin role
router.use(authenticateToken, requireRole(['admin']));

router.get('/growth', ctrl.growth);
router.get('/leave', ctrl.leave);
router.get('/appointments', ctrl.appointments);
router.get('/sos', ctrl.sos);
router.get('/export/:dataset', ctrl.exportCsv);

module.exports = router;
