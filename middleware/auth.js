const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.session.token || 
                  req.cookies?.token;

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({ 
        message: 'Account is temporarily locked. Please try again later.',
        lockUntil: user.security.lockUntil
      });
    }

    // Check if account is suspended
    if (user.status === 'suspended' || user.status === 'banned') {
      return res.status(403).json({ 
        message: 'Account is suspended. Please contact support.',
        status: user.status
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Admin authorization middleware
const adminAuth = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error during admin authorization' });
  }
};

// Super admin authorization middleware
const superAdminAuth = async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied. Super admin privileges required.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error during super admin authorization' });
  }
};

// Optional auth middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.session.token || 
                  req.cookies?.token;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && !user.isLocked && user.status === 'active') {
        req.user = user;
        req.token = token;
      }
    }
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Check if user has completed KYC
const requireKYC = (level = 'basic') => {
  return (req, res, next) => {
    if (!req.user.verification.kyc) {
      return res.status(403).json({
        message: 'KYC verification required to access this feature',
        redirectTo: '/kyc'
      });
    }

    const kycLevels = ['none', 'basic', 'advanced'];
    const userKycIndex = kycLevels.indexOf(req.user.verification.kycLevel);
    const requiredKycIndex = kycLevels.indexOf(level);

    if (userKycIndex < requiredKycIndex) {
      return res.status(403).json({
        message: `${level.charAt(0).toUpperCase() + level.slice(1)} KYC verification required`,
        currentLevel: req.user.verification.kycLevel,
        requiredLevel: level,
        redirectTo: '/kyc'
      });
    }

    next();
  };
};

// Check if user has verified email/phone
const requireVerification = (type = 'email') => {
  return (req, res, next) => {
    if (!req.user.verification[type]) {
      return res.status(403).json({
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} verification required`,
        redirectTo: `/verify-${type}`
      });
    }
    next();
  };
};

// Rate limiting for sensitive operations
const sensitiveOperationLimit = (req, res, next) => {
  // Check if user has made too many sensitive operations recently
  // This could be enhanced with Redis for better performance
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  // For now, we'll just continue - implement actual rate limiting as needed
  next();
};

// Update last active timestamp
const updateLastActive = async (req, res, next) => {
  if (req.user) {
    try {
      req.user.lastActive = new Date();
      await req.user.save();
    } catch (error) {
      // Don't fail the request if this fails
      console.error('Error updating last active:', error);
    }
  }
  next();
};

module.exports = {
  auth,
  adminAuth,
  superAdminAuth,
  optionalAuth,
  requireKYC,
  requireVerification,
  sensitiveOperationLimit,
  updateLastActive
};