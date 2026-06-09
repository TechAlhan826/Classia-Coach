const User    = require('../models/User');
const UserInfo = require('../models/UserInfo');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const mongoose = require('mongoose');
const crypto   = require('crypto');

// ─── helpers ─────────────────────────────────────────────────────────────────
function generateUserId() {
  return 'usr_' + crypto.randomBytes(12).toString('hex');
}

// ─── register ────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, password, user_id, loginType } = req.body;

    if (!name || !email || !user_id || !loginType)
      return res.status(400).json({ message: 'All fields (name, email, user_id, loginType) are required' });

    if (loginType === 'EMAIL' && !password)
      return res.status(400).json({ message: 'Password is required for regular registration' });

    const existing = await User.findOne({ $or: [{ email }, { user_id }] });
    if (existing) {
      const method = existing.loginType === 'GOOGLE' ? 'Google' : 'Email/Password';
      return res.status(400).json({
        message: `User already exists. Please try to login via ${method}`,
        existingLoginType: existing.loginType
      });
    }

    let hashedPassword = null;
    if (loginType === 'EMAIL') hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ name, email, user_id, loginType, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.status(201).json({ token, user_id: user.user_id, loginType: user.loginType });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── login ────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    console.log('Login attempt received:', { email: req.body.email, loginType: req.body.loginType });

    const { email, password, user_id, loginType } = req.body;

    if ((!email && !user_id) || !loginType)
      return res.status(400).json({ message: 'Email or user_id, and loginType are required' });

    if (loginType === 'EMAIL' && !password)
      return res.status(400).json({ message: 'Password is required for regular login' });

    const user = await User.findOne(user_id ? { user_id } : { email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    if (user.loginType !== loginType) {
      const method = user.loginType === 'GOOGLE' ? 'Google' : 'Email/Password';
      return res.status(400).json({ message: `Please try to login with ${method}`, existingLoginType: user.loginType });
    }

    if (loginType === 'GOOGLE') {
      if (!user.user_id || user.user_id !== user_id)
        return res.status(400).json({ message: 'Invalid credentials' });
    } else {
      if (!user.password) return res.status(400).json({ message: 'Invalid credentials' });
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Block check — must come after credential verification to avoid leaking account existence
    if (user.isActive === false)
      return res.status(403).json({
        message: 'Your account has been blocked. Please contact the administrator.',
        code: 'ACCOUNT_BLOCKED'
      });

    const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    console.log('Login successful for user:', user.email);
    res.status(200).json({
      token,
      user_id:   user.user_id,
      loginType: user.loginType,
      role:      user.role  // returned so admin panel can RBAC-gate at login time
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── admin: get all users ────────────────────────────────────────────────────
exports.getAllUsersForAdmin = async (req, res) => {
  try {
    console.log('Admin request to get all users received');

    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ success: false, code: 'DATABASE_ERROR', message: 'Database connection error' });
    }

    const page      = parseInt(req.query.page)  || 1;
    const limit     = parseInt(req.query.limit) || 10;
    const search    = req.query.search    || '';
    const loginType = req.query.loginType || '';
    const sortBy    = req.query.sortBy    || 'createdAt';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

    let filter = {};
    if (search) {
      filter.$or = [
        { name:    { $regex: search, $options: 'i' } },
        { email:   { $regex: search, $options: 'i' } },
        { user_id: { $regex: search, $options: 'i' } }
      ];
    }
    if (loginType) filter.loginType = loginType;

    const skip       = (page - 1) * limit;
    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / limit);

    const users = await User.find(filter)
      .select('-password')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    const userIds  = users.map(u => u.user_id);
    const userInfos = await UserInfo.find({ user_id: { $in: userIds } }).lean();
    const userInfoMap = {};
    userInfos.forEach(info => { userInfoMap[info.user_id] = info; });

    const usersWithInfo = users.map(u => ({
      ...u,
      userInfo:    userInfoMap[u.user_id] || null,
      hasUserInfo: !!userInfoMap[u.user_id]
    }));

    console.log(`Admin retrieved ${usersWithInfo.length} users (page ${page}/${totalPages})`);
    res.status(200).json({
      success: true,
      code:    'SUCCESS',
      message: 'Users retrieved successfully',
      data: {
        users: usersWithInfo,
        pagination: { currentPage: page, totalPages, totalUsers, limit, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
        filters: { search, loginType, sortBy, sortOrder: sortOrder === 1 ? 'asc' : 'desc' }
      }
    });
  } catch (error) {
    console.error('Admin get all users error:', error);
    res.status(500).json({
      success: false, code: 'INTERNAL_ERROR', message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// ─── admin: get user by id ───────────────────────────────────────────────────
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ user_id: userId }).select('-password').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const userInfo = await UserInfo.findOne({ user_id: userId }).lean();
    res.status(200).json({ success: true, data: { ...user, userInfo: userInfo || null } });
  } catch (error) {
    console.error('Admin getUserById error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── admin: update user ──────────────────────────────────────────────────────
exports.updateUserByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    // Strip immutable / sensitive fields
    const { password, user_id, email, ...updateData } = req.body;

    const user = await User.findOneAndUpdate(
      { user_id: userId },
      { ...updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, message: 'User updated', data: user });
  } catch (error) {
    console.error('Admin updateUser error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── admin: delete user ──────────────────────────────────────────────────────
exports.deleteUserByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.userId === userId)
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });

    const user = await User.findOneAndDelete({ user_id: userId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await UserInfo.findOneAndDelete({ user_id: userId });

    const DailyCheckIn = require('../models/DailyCheckIn');
    const Target       = require('../models/Target');
    await DailyCheckIn.deleteMany({ user_id: userId });
    await Target.deleteMany({ user_id: userId });

    res.status(200).json({ success: true, message: 'User and all related data deleted successfully' });
  } catch (error) {
    console.error('Admin deleteUser error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── admin: create member directly ──────────────────────────────────────────
exports.adminCreateUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ success: false, message: 'Invalid email format' });

    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing)
      return res.status(409).json({ success: false, message: 'A member with this email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user_id = generateUserId();

    const user = new User({
      name:      name.trim(),
      email:     email.toLowerCase().trim(),
      password:  hashedPassword,
      user_id,
      loginType: 'EMAIL',
      role:      'user'
    });
    await user.save();

    console.log(`Admin created new user: ${user.email} (${user.user_id})`);

    res.status(201).json({
      success: true,
      message: 'Member created successfully',
      data: { user_id: user.user_id, name: user.name, email: user.email, loginType: user.loginType, createdAt: user.createdAt }
    });
  } catch (error) {
    console.error('Admin createUser error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── admin: block / unblock user ────────────────────────────────────────────
exports.adminBlockUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.userId === userId)
      return res.status(400).json({ success: false, message: 'Cannot block your own account' });

    const user = await User.findOne({ user_id: userId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.role === 'superadmin')
      return res.status(403).json({ success: false, message: 'Cannot block an admin account' });

    user.isActive = !user.isActive;
    await user.save();

    console.log(`Admin toggled user ${user.email} isActive -> ${user.isActive}`);

    res.status(200).json({
      success: true,
      message: user.isActive ? 'User account activated' : 'User account blocked',
      data: { user_id: user.user_id, isActive: user.isActive }
    });
  } catch (error) {
    console.error('Admin blockUser error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── admin: reset password ───────────────────────────────────────────────────
exports.adminResetPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    let { newPassword } = req.body;

    // Auto-generate if not provided
    if (!newPassword || !newPassword.trim())
      newPassword = crypto.randomBytes(5).toString('hex'); // 10-char hex

    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const user = await User.findOne({ user_id: userId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.loginType !== 'EMAIL')
      return res.status(400).json({
        success: false,
        message: `This member uses ${user.loginType} login — password reset is not applicable`
      });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    console.log(`Admin reset password for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      data: {
        user_id:     user.user_id,
        name:        user.name,
        newPassword  // returned once so admin can share with member
      }
    });
  } catch (error) {
    console.error('Admin resetPassword error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
