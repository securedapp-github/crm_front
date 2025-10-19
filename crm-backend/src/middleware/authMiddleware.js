const jwt = require('jsonwebtoken');
const { User } = require('../models');

// @desc    Protect routes with JWT
// @access  Private
exports.protect = async (req, res, next) => {
  try {
    // 1) Session-based auth
    if (req.session && req.session.userId) {
      const user = await User.findByPk(req.session.userId, { attributes: { exclude: ['password'] } });
      if (!user) return res.status(401).json({ success: false, message: 'Not authorized, session invalid' });
      req.user = user;
      return next();
    }

    // 2) JWT-based auth
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findByPk(decoded.id, { attributes: { exclude: ['password'] } });
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }
      return next();
    }

    return res.status(401).json({ success: false, message: 'Not authorized, no credentials provided' });
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
};

// @desc    Authorize roles (admin, user, etc.)
// @access  Private
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// @desc    Check ownership or admin status
// @access  Private
exports.checkOwnership = (model, paramName = 'id') => {
  return async (req, res, next) => {
    try {
      const resource = await model.findByPk(req.params[paramName]);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Allow admin or the owner of the resource
      if (req.user.role !== 'admin' && resource.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this resource'
        });
      }

      // Attach the resource to the request for use in the controller
      req.resource = resource;
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during ownership verification',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };
};

// @desc    Check if user is active
// @access  Private
exports.checkActive = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user || user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is not active. Please contact support.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Active check error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during active status check',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
