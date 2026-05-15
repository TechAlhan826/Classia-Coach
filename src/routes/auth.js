const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/admin');

router.post('/register', authController.register);
router.post('/login', authController.login);

// Admin routes - require both authentication and admin privileges
router.get('/admin/users', auth, adminAuth, authController.getAllUsersForAdmin);

module.exports = router; 