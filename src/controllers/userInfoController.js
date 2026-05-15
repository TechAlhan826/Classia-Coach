const UserInfo = require('../models/UserInfo');
const User = require('../models/User');

// Create (Add) UserInfo
exports.addUserInfo = async (req, res) => {
  try {
    console.log(req.body);
    const userInfo = new UserInfo({ ...req.body, user_id: req.userId, _id: req.userId });
    await userInfo.save();
    res.status(201).json({ message: 'User info created successfully' });
  } catch (error) {
    console.log(error);
    console.log(req.body);
    res.status(400).json({ message: 'Error adding user info', error });
  }
};

// Get UserInfo for logged-in user
exports.getUserInfo = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    const userInfo = await UserInfo.findOne({ user_id: req.userId });
    const user = await User.findOne({ user_id: req.userId }).select('name email loginType');
    let mergedUserInfo = userInfo ? userInfo.toObject() : {};
    if (user) {
      mergedUserInfo.name = user.name;
      mergedUserInfo.email = user.email;
      mergedUserInfo.loginType = user.loginType;
    }
    if (!userInfo && !user) return res.status(400).json({ success: false, message: 'User info and user not found' });
    res.status(200).json({ success: true, userInfo: mergedUserInfo });
  } catch (error) {
    res.status(400).json({message: 'Error fetching user info', error });
  }
};

// Update UserInfo for logged-in user (full update)
exports.updateUserInfo = async (req, res) => {
  try {
    const userInfo = await UserInfo.findOneAndUpdate(
      { user_id: req.userId },
      { ...req.body, updated_at: Date.now() },
      { new: true }
    );
    if (!userInfo) return res.status(404).json({ message: 'User info not found' });
    res.json(userInfo);
  } catch (error) {
    res.status(400).json({ message: 'Error updating user info', error });
  }
};

// Partial update (PATCH) UserInfo for logged-in user
exports.partialUpdateUserInfo = async (req, res) => {
  try {
    const userInfo = await UserInfo.findOneAndUpdate(
      { user_id: req.userId },
      { $set: req.body, updated_at: Date.now() },
      { new: true }
    );
    const user = await User.findOne({ user_id: req.userId }).select('name email loginType');
    let mergedUserInfo = userInfo ? userInfo.toObject() : {};
    if (user) {
      mergedUserInfo.name = user.name;
      mergedUserInfo.email = user.email;
      mergedUserInfo.loginType = user.loginType;
    }
    if (!userInfo && !user) return res.status(404).json({ message: 'User info not found' });
    res.json({ success: true, userInfo: mergedUserInfo });
  } catch (error) {
    res.status(400).json({ message: 'Error partially updating user info', error });
  }
};

// Delete UserInfo for logged-in user
exports.deleteUserInfo = async (req, res) => {
  try {
    const userInfo = await UserInfo.findOneAndDelete({ user_id: req.userId });
    if (!userInfo) return res.status(404).json({ message: 'User info not found' });
    res.json({ message: 'User info deleted' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting user info', error });
  }
}; 