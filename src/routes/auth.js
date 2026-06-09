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

// Admin — update user (name, etc)
router.put('/admin/users/:userId', auth, adminAuth, authController.updateUserByAdmin);

// Admin — block / unblock a user
router.patch('/admin/users/:userId/block', auth, adminAuth, authController.toggleBlockUser);

// Admin — reset a user's password
router.patch('/admin/users/:userId/reset-password', auth, adminAuth, authController.adminResetPassword);

// Admin — delete user
router.delete('/admin/users/:userId', auth, adminAuth, authController.deleteUserByAdmin);

module.exports = router;