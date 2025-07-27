const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { auth, optionalAuth } = require('../middleware/auth');
const emailService = require('../utils/email');
const smsService = require('../utils/sms');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto'); // Added missing import for crypto

const router = express.Router();

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // limit each IP to 3 OTP requests per minute
  message: 'Too many OTP requests, please try again later',
});

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('phone').isMobilePhone('en-IN'),
  body('password').isLength({ min: 6 }),
  body('firstName').optional().trim().isLength({ min: 1 }),
  body('lastName').optional().trim().isLength({ min: 1 }),
  body('referralCode').optional().trim().isAlphanumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, phone, password, firstName, lastName, referralCode } = req.body;

    // Check if user already exists
    let existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists with this email or phone'
      });
    }

    // Device fingerprinting for restriction (simple implementation)
    const deviceFingerprint = req.headers['user-agent'] + req.ip;
    const existingDevice = await User.findOne({
      'security.deviceFingerprint': deviceFingerprint
    });

    if (existingDevice) {
      return res.status(400).json({
        message: 'Only one account per device is allowed'
      });
    }

    // Handle referral
    let referredBy = null;
    if (referralCode) {
      const referralUser = await User.findOne({ 'referral.code': referralCode });
      if (!referralUser) {
        return res.status(400).json({
          message: 'Invalid referral code'
        });
      }
      referredBy = referralUser._id;
    }

    // Create user
    const user = new User({
      email,
      phone,
      password,
      profile: {
        firstName: firstName || '',
        lastName: lastName || ''
      },
      referral: {
        referredBy
      },
      security: {
        deviceFingerprint
      }
    });

    await user.save();

    // Handle referral bonus
    if (referredBy) {
      // Give signup bonus to new user
      const signupBonus = parseInt(process.env.SIGNUP_BONUS) || 500;
      user.wallet.points += signupBonus;
      user.referral.signupBonusReceived = true;
      
      // Create signup bonus transaction
      await Transaction.create({
        userId: user._id,
        type: 'signup_bonus',
        amount: signupBonus,
        currency: 'POINTS',
        status: 'completed',
        description: 'Signup bonus for using referral code',
        metadata: { referralUserId: referredBy },
        balanceAfter: { points: user.wallet.points, inr: user.wallet.inr }
      });

      // Give referral bonus to referrer
      const referralBonus = parseInt(process.env.REFERRAL_BONUS) || 500;
      const referrer = await User.findById(referredBy);
      referrer.wallet.points += referralBonus;
      referrer.referral.referralEarnings += referralBonus;
      referrer.referral.totalReferrals += 1;
      referrer.referral.referredUsers.push(user._id);
      await referrer.save();

      // Create referral bonus transaction
      await Transaction.create({
        userId: referredBy,
        type: 'referral_bonus',
        amount: referralBonus,
        currency: 'POINTS',
        status: 'completed',
        description: 'Referral bonus for new user signup',
        metadata: { referralUserId: user._id },
        balanceAfter: { points: referrer.wallet.points, inr: referrer.wallet.inr }
      });

      // Send notification to referrer
      await Notification.createNotification({
        userId: referredBy,
        ...Notification.templates.referralAdded(user)
      });

      await user.save();
    }

    // Generate email verification OTP
    const emailOTP = user.generateOTP('email_verification');
    await user.save();

    // Send welcome email with OTP
    await emailService.sendVerificationEmail(user, emailOTP);

    // Send welcome SMS
    if (smsService.validatePhoneNumber(phone)) {
      await smsService.sendPhoneVerificationSMS(phone, emailOTP);
    }

    res.status(201).json({
      message: 'Registration successful! Please verify your email and phone.',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        referralCode: user.referral.code,
        verification: user.verification
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authLimiter, [
  body('identifier').notEmpty().trim(), // email, phone, or username
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { identifier, password } = req.body;

    // Find user by email, phone, or username
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { phone: identifier },
        { username: identifier }
      ]
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        message: 'Account is temporarily locked due to too many failed login attempts',
        lockUntil: user.security.lockUntil
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Update last login
    user.security.lastLogin = new Date();
    user.lastActive = new Date();
    await user.save();

    // Generate JWT token
    const payload = {
      id: user._id,
      role: user.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    // Store token in session
    req.session.token = token;

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        verification: user.verification,
        wallet: user.wallet,
        plan: user.plan,
        referralCode: user.referral.code
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   POST /api/auth/verify-email
// @desc    Verify email with OTP
// @access  Public
router.post('/verify-email', otpLimiter, [
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otpResult = user.verifyOTP(otp, 'email_verification');
    if (!otpResult.success) {
      return res.status(400).json({ message: otpResult.message });
    }

    user.verification.email = true;
    if (user.verification.email && user.verification.phone) {
      user.status = 'active';
    }
    await user.save();

    res.json({
      message: 'Email verified successfully',
      verification: user.verification
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Server error during email verification' });
  }
});

// @route   POST /api/auth/verify-phone
// @desc    Verify phone with OTP
// @access  Public
router.post('/verify-phone', otpLimiter, [
  body('phone').isMobilePhone('en-IN'),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, otp } = req.body;

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otpResult = user.verifyOTP(otp, 'phone_verification');
    if (!otpResult.success) {
      return res.status(400).json({ message: otpResult.message });
    }

    user.verification.phone = true;
    if (user.verification.email && user.verification.phone) {
      user.status = 'active';
    }
    await user.save();

    res.json({
      message: 'Phone verified successfully',
      verification: user.verification
    });

  } catch (error) {
    console.error('Phone verification error:', error);
    res.status(500).json({ message: 'Server error during phone verification' });
  }
});

// @route   POST /api/auth/resend-otp
// @desc    Resend OTP for verification
// @access  Public
router.post('/resend-otp', otpLimiter, [
  body('identifier').notEmpty().trim(),
  body('type').isIn(['email_verification', 'phone_verification'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { identifier, type } = req.body;

    const user = await User.findOne({
      $or: [
        { email: identifier },
        { phone: identifier }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = user.generateOTP(type);
    await user.save();

    if (type === 'email_verification') {
      await emailService.sendVerificationEmail(user, otp);
    } else if (type === 'phone_verification') {
      await smsService.sendPhoneVerificationSMS(user.phone, otp);
    }

    res.json({ message: 'OTP sent successfully' });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Server error during OTP resend' });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset OTP
// @access  Public
router.post('/forgot-password', otpLimiter, [
  body('identifier').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { identifier } = req.body;

    const user = await User.findOne({
      $or: [
        { email: identifier },
        { phone: identifier },
        { username: identifier }
      ]
    });

    if (!user) {
      // Don't reveal if user exists
      return res.json({ message: 'If the account exists, you will receive reset instructions' });
    }

    const resetToken = user.generatePasswordResetToken();
    const otp = user.generateOTP('password_reset');
    await user.save();

    // Send reset email
    await emailService.sendPasswordResetEmail(user, resetToken);

    // Send reset SMS if phone is verified
    if (user.verification.phone) {
      await smsService.sendPasswordResetSMS(user.phone, otp);
    }

    res.json({ message: 'If the account exists, you will receive reset instructions' });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error during password reset request' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with token or OTP
// @access  Public
router.post('/reset-password', [
  body('identifier').notEmpty().trim(),
  body('newPassword').isLength({ min: 6 }),
  body('otp').optional().isLength({ min: 6, max: 6 }).isNumeric(),
  body('token').optional().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { identifier, newPassword, otp, token } = req.body;

    const user = await User.findOne({
      $or: [
        { email: identifier },
        { phone: identifier },
        { username: identifier }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let isValid = false;

    if (otp) {
      // Verify OTP
      const otpResult = user.verifyOTP(otp, 'password_reset');
      isValid = otpResult.success;
    } else if (token) {
      // Verify reset token
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      isValid = user.resetPasswordToken === hashedToken && user.resetPasswordExpires > Date.now();
    }

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired reset token/OTP' });
    }

    // Reset password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.otp = undefined;
    await user.save();

    // Send security alert
    await smsService.sendSecurityAlertSMS(user.phone, {
      action: 'Password Reset'
    });

    res.json({ message: 'Password reset successfully' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
});

// @route   POST /api/auth/unlock-account
// @desc    Unlock account with OTP
// @access  Public
router.post('/unlock-account', otpLimiter, [
  body('identifier').notEmpty().trim(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { identifier, otp } = req.body;

    const user = await User.findOne({
      $or: [
        { email: identifier },
        { phone: identifier },
        { username: identifier }
      ]
    });

    if (!user || !user.isLocked) {
      return res.status(400).json({ message: 'Account is not locked or user not found' });
    }

    const otpResult = user.verifyOTP(otp, 'account_unlock');
    if (!otpResult.success) {
      return res.status(400).json({ message: otpResult.message });
    }

    // Unlock account
    await user.resetLoginAttempts();
    
    res.json({ message: 'Account unlocked successfully' });

  } catch (error) {
    console.error('Account unlock error:', error);
    res.status(500).json({ message: 'Server error during account unlock' });
  }
});

// @route   POST /api/auth/send-unlock-otp
// @desc    Send unlock OTP to locked account
// @access  Public
router.post('/send-unlock-otp', otpLimiter, [
  body('identifier').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { identifier } = req.body;

    const user = await User.findOne({
      $or: [
        { email: identifier },
        { phone: identifier },
        { username: identifier }
      ]
    });

    if (!user || !user.isLocked) {
      return res.status(400).json({ message: 'Account is not locked or user not found' });
    }

    const otp = user.generateOTP('account_unlock');
    await user.save();

    // Send unlock email and SMS
    await emailService.sendAccountUnlockEmail(user, otp);
    if (user.verification.phone) {
      await smsService.sendAccountUnlockSMS(user.phone, otp);
    }

    res.json({ message: 'Unlock OTP sent successfully' });

  } catch (error) {
    console.error('Send unlock OTP error:', error);
    res.status(500).json({ message: 'Server error during unlock OTP send' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', auth, async (req, res) => {
  try {
    // Clear session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
      }
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -otp -resetPasswordToken -resetPasswordExpires')
      .populate('referral.referredBy', 'username')
      .populate('referral.referredUsers', 'username createdAt');

    res.json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;