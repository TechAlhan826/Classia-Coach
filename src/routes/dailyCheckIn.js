const express = require('express');
const router = express.Router();
const dailyCheckInController = require('../controllers/dailyCheckInController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/admin');

// Add Daily Check-In
router.post('/add', auth, dailyCheckInController.addCheckIn);
// Update Daily Check-In by ID
router.put('/update/:id', auth, dailyCheckInController.updateCheckIn);
// Delete Daily Check-In by ID
router.delete('/delete/:id', auth, dailyCheckInController.deleteCheckIn);
// Get Daily Check-In by Date (ignoring time)
router.get('/get-by-date', auth, dailyCheckInController.getCheckInByDate);
// Get Daily Check-Ins by date range (ASC order)
router.get('/list-by-date-range', auth, dailyCheckInController.getCheckInsByDateRange);

// Get all daily check-ins with user information (Admin API)
router.get('/admin/all', auth, adminAuth, dailyCheckInController.getAllCheckInsWithUsers);

// Get dashboard statistics (Admin API)
router.get('/admin/dashboard', auth, adminAuth, dailyCheckInController.getDashboardStats);

module.exports = router; 