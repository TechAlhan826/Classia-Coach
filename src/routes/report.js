const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const auth = require('../middleware/auth');

// Generate weekly report
router.get('/weekly', auth, reportController.generateWeeklyReport);

module.exports = router; 