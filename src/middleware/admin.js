const User = require('../models/User');

const adminAuth = async (req, res, next) => {
  try {
    // Check if user is authenticated (this should be called after auth middleware)
    if (!req.userId) {
      return res.status(401).json({ 
        success: false, 
        code: "UNAUTHORIZED", 
        message: "Authentication required" 
      });
    }

    // Find the user and check if they have admin privileges
    const user = await User.findOne({ user_id: req.userId });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        code: "USER_NOT_FOUND", 
        message: "User not found" 
      });
    }

    // Check if user has admin role (you can modify this logic based on your admin system)
    // For now, we'll check if the user has a specific admin flag or role
    // You can modify this to check for admin email, role field, or any other criteria
    
    // Option 1: Check for admin email (modify this list as needed)
    const adminEmails = [
      'admin@classialongevity.com',
      'admin@coach.classialongevity.com',
      // Add more admin emails here
    ];
    
    // Option 2: Check for admin role if you have a role field
    // const isAdmin = user.role === 'admin';
    
    const isAdmin = adminEmails.includes(user.email.toLowerCase());
    
    if (!isAdmin) {
      return res.status(403).json({ 
        success: false, 
        code: "FORBIDDEN", 
        message: "Admin access required" 
      });
    }

    // Add admin info to request
    req.adminUser = user;
    next();
    
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ 
      success: false, 
      code: "INTERNAL_ERROR", 
      message: "Internal server error" 
    });
  }
};

module.exports = adminAuth;
