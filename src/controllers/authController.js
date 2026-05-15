const User = require('../models/User');
const UserInfo = require('../models/UserInfo');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

exports.register = async (req, res) => {
  try {
    const { name, email, password, user_id, loginType } = req.body;
    
    // Validate required fields
    if (!name || !email || !user_id || !loginType) {
      return res.status(400).json({ message: 'All fields (name, email, user_id, loginType) are required' });
    }
    
    // For regular registration, password is required
    if (loginType === 'EMAIL' && !password) {
      return res.status(400).json({ message: 'Password is required for regular registration' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { user_id }] });
    if (existingUser) {
      const loginMethod = existingUser.loginType === 'GOOGLE' ? 'Google' : 'Email/Password';
      return res.status(400).json({
        message: `User already exists. Please try to login via ${loginMethod}`,
        existingLoginType: existingUser.loginType
      });
    }
    
    // Handle password based on login type
    let hashedPassword = null;
    if (loginType === 'EMAIL') {
      hashedPassword = await bcrypt.hash(password, 10);
    }
    
    // Create user object
    const userData = {
      name,
      email,
      user_id,
      loginType,
      password: hashedPassword
    };
    
    const user = new User(userData);
    await user.save();
    
    const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.status(201).json({
      token,
      user_id: user.user_id,
      loginType: user.loginType
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    console.log('Login attempt received:', { email: req.body.email, loginType: req.body.loginType });
    
    const { email, password, user_id, loginType } = req.body;
    
    // Validate required fields
    if ((!email && !user_id) || !loginType) {
      return res.status(400).json({ message: 'Email or user_id, and loginType are required' });
    }
    
    // For regular login, password is required
    if (loginType === 'EMAIL' && !password) {
      return res.status(400).json({ message: 'Password is required for regular login' });
    }
    
    // Check database connection
    // if (mongoose.connection.readyState !== 1) {
    //   console.error('Database not connected. ReadyState:', mongoose.connection.readyState);
    //   return res.status(500).json({ message: 'Database connection error' });
    // }
    
    // Find user
    const user = await User.findOne(user_id ? { user_id } : { email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check if login type matches
    if (user.loginType !== loginType) {
      const loginMethod = user.loginType === 'GOOGLE' ? 'Google' : 'Email/Password';
      return res.status(400).json({ 
        message: `Please try to login with ${loginMethod}`,
        existingLoginType: user.loginType
      });
    }
    
    // Handle authentication based on login type
    if (loginType === 'GOOGLE') {
      // For Google login, just verify user exists and login type matches
      // Frontend handles Google authentication
      if (!user.user_id || user.user_id !== user_id) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
    } else {
      // Regular login - verify password
      if (!user.password) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
    }
    
    // Generate JWT token
    const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    console.log('Login successful for user:', user.email);
    res.status(200).json({
      token,
      user_id: user.user_id,
      loginType: user.loginType
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin function to get all users with populated userInfo
exports.getAllUsersForAdmin = async (req, res) => {
  try {
    console.log('Admin request to get all users received');
    
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      console.error('Database not connected. ReadyState:', mongoose.connection.readyState);
      return res.status(500).json({ 
        success: false,
        code: "DATABASE_ERROR", 
        message: 'Database connection error' 
      });
    }

    // Get query parameters for pagination and filtering
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const loginType = req.query.loginType || '';
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

    // Build search filter
    let filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { user_id: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (loginType) {
      filter.loginType = loginType;
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / limit);

    // Get users with pagination and sorting
    const users = await User.find(filter)
      .select('-password') // Exclude password field
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(); // Convert to plain objects for better performance

    // Get userInfo for all users
    const userIds = users.map(user => user.user_id);
    const userInfos = await UserInfo.find({ user_id: { $in: userIds } }).lean();

    // Create a map of userInfo by user_id for quick lookup
    const userInfoMap = {};
    userInfos.forEach(info => {
      userInfoMap[info.user_id] = info;
    });

    // Combine user data with userInfo
    const usersWithInfo = users.map(user => ({
      ...user,
      userInfo: userInfoMap[user.user_id] || null,
      hasUserInfo: !!userInfoMap[user.user_id]
    }));

    // Prepare response
    const response = {
      success: true,
      code: "SUCCESS",
      message: "Users retrieved successfully",
      data: {
        users: usersWithInfo,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        filters: {
          search,
          loginType,
          sortBy,
          sortOrder: sortOrder === 1 ? 'asc' : 'desc'
        }
      }
    };

    console.log(`Admin retrieved ${usersWithInfo.length} users (page ${page}/${totalPages})`);
    res.status(200).json(response);

  } catch (error) {
    console.error('Admin get all users error:', error);
    res.status(500).json({ 
      success: false,
      code: "INTERNAL_ERROR", 
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
}; 