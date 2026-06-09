const express        = require('express');
const router         = express.Router();
const authController = require('../controllers/authController');
const auth           = require('../middleware/auth');
const adminAuth      = require('../middleware/admin');

// ── Public ───────────────────────────────────────────────────────────────────
router.post('/register', authController.register);
router.post('/login',    authController.login);

// ── Admin: users CRUD ────────────────────────────────────────────────────────
router.get   ('/admin/users',         auth, adminAuth, authController.getAllUsersForAdmin);
router.post  ('/admin/users',         auth, adminAuth, authController.adminCreateUser);
router.get   ('/admin/users/:userId', auth, adminAuth, authController.getUserById);
router.put   ('/admin/users/:userId', auth, adminAuth, authController.updateUserByAdmin);
router.delete('/admin/users/:userId', auth, adminAuth, authController.deleteUserByAdmin);

// ── Admin: block / reset password ────────────────────────────────────────────
router.patch('/admin/users/:userId/block',          auth, adminAuth, authController.adminBlockUser);
router.patch('/admin/users/:userId/reset-password', auth, adminAuth, authController.adminResetPassword);

module.exports = router;