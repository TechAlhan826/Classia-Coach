const express = require('express');
const router = express.Router();
const userInfoController = require('../controllers/userInfoController');
const auth = require('../middleware/auth');

// Add UserInfo
router.post('/addUserInfo', auth, userInfoController.addUserInfo);
// Get UserInfo for logged-in user
router.get('/getUserInfo', auth, userInfoController.getUserInfo);
// Update UserInfo for logged-in user (full update)
router.put('/updateUserInfo', auth, userInfoController.updateUserInfo);
// Partial update UserInfo for logged-in user
router.patch('/partialUpdateUserInfo', auth, userInfoController.partialUpdateUserInfo);
// Delete UserInfo for logged-in user
router.delete('/deleteUserInfo', auth, userInfoController.deleteUserInfo);

module.exports = router; 