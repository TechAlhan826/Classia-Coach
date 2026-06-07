const User = require('../models/User');

const adminAuth = async (req, res, next) => {
  try {
    // Should always be called after auth middleware
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
    }

    const user = await User.findOne({ user_id: req.userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    // superadmin role check — set via direct DB or admin seeder
    if (user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Admin access required'
      });
    }

    req.adminUser = user;
    next();

  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({
      success: false,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
};

module.exports = adminAuth;
