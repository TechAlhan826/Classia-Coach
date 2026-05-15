const express = require('express');
const router = express.Router();
const { weeklyCheckIn } = require('../controllers/weeklyCheckInController');
const auth = require('../middleware/auth');

// POST /api/weekly-checkin
router.post('/', auth, weeklyCheckIn);

module.exports = router; 