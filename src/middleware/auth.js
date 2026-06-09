const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  // Accept token from Authorization header OR ?token= query param (for direct CSV download links)
  const token = req.header('Authorization')?.replace('Bearer ', '') || req.query.token;
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;

    // Block check — only for app users (not admin panel requests)
    // Admin panel sends X-Admin-Panel header — skip block check for admins
    if (!req.header('X-Admin-Panel')) {
      const User = require('../models/User');
      const user = await User.findOne({ user_id: req.userId }, { isActive: 1, role: 1 }).lean();
      if (user && user.isActive === false) {
        return res.status(403).json({
          code: 'ACCOUNT_BLOCKED',
          message: 'Your account has been suspended. Please contact your coach or admin for assistance.'
        });
      }
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