const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;

    // Check if user is blocked — inline so we don't need an extra middleware
    const User = require('../models/User');
    const user = await User.findOne({ user_id: req.userId }).select('isBlocked role').lean();
    if (user?.isBlocked) {
      return res.status(403).json({
        code: 'ACCOUNT_BLOCKED',
        message: 'Your account has been suspended. Please contact the admin.'
      });
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;