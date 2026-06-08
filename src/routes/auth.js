const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/admin');

router.post('/register', authController.register);
router.post('/login', authController.login);

// Admin — list all users (paginated, searchable)
router.get('/admin/users', auth, adminAuth, authController.getAllUsersForAdmin);

// Admin — create a member directly
router.post('/admin/users', auth, adminAuth, authController.adminCreateUser);

// Admin — get single user
router.get('/admin/users/:userId', auth, adminAuth, authController.getUserById);

// Admin — update user (role, name, etc)
router.put('/admin/users/:userId', auth, adminAuth, authController.updateUserByAdmin);

// Admin — delete user
router.delete('/admin/users/:userId', auth, adminAuth, authController.deleteUserByAdmin);

module.exports = router; 