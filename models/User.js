const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  // Basic Information
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9_-]+$/
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  
  // Profile Information
  profile: {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    avatar: { type: String, default: '' },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' }
    }
  },
  
  // Verification Status
  verification: {
    email: { type: Boolean, default: false },
    phone: { type: Boolean, default: false },
    kyc: { type: Boolean, default: false },
    kycLevel: { type: String, enum: ['none', 'basic', 'advanced'], default: 'none' }
  },
  
  // KYC Documents
  kyc: {
    aadhar: {
      number: String,
      front: String,
      back: String,
      verified: { type: Boolean, default: false }
    },
    pan: {
      number: String,
      image: String,
      verified: { type: Boolean, default: false }
    },
    livenessTest: {
      image: String,
      verified: { type: Boolean, default: false }
    },
    bankDetails: {
      accountNumber: String,
      ifscCode: String,
      accountHolderName: String,
      bankName: String,
      verified: { type: Boolean, default: false }
    }
  },
  
  // Wallet Information
  wallet: {
    points: { type: Number, default: 0 },
    inr: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 }
  },
  
  // Referral System
  referral: {
    code: { type: String, unique: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    referredUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    totalReferrals: { type: Number, default: 0 },
    referralEarnings: { type: Number, default: 0 },
    signupBonusReceived: { type: Boolean, default: false }
  },
  
  // Task Plan
  plan: {
    current: { 
      type: String, 
      enum: ['free', 'baby', 'basic', 'gold', 'star'], 
      default: 'free' 
    },
    expiryDate: { type: Date },
    dailyTaskLimit: { type: Number, default: 15 },
    tasksCompletedToday: { type: Number, default: 0 },
    lastTaskReset: { type: Date, default: Date.now }
  },
  
  // Security Features
  security: {
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    lastLogin: { type: Date },
    deviceFingerprint: { type: String },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String }
  },
  
  // OTP for various verifications
  otp: {
    code: { type: String },
    purpose: { 
      type: String, 
      enum: ['email_verification', 'phone_verification', 'password_reset', 'account_unlock'] 
    },
    expiresAt: { type: Date },
    attempts: { type: Number, default: 0 }
  },
  
  // Reset tokens
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  
  // User preferences and settings
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    language: { type: String, default: 'en' },
    currency: { type: String, default: 'INR' }
  },
  
  // Account status
  status: {
    type: String,
    enum: ['active', 'suspended', 'banned', 'pending_verification'],
    default: 'pending_verification'
  },
  
  // Admin fields
  role: {
    type: String,
    enum: ['user', 'admin', 'super_admin'],
    default: 'user'
  },
  
  // Timestamps
  lastActive: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.security.lockUntil && this.security.lockUntil > Date.now());
});

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Update timestamp
  this.updatedAt = Date.now();
  
  // Hash password if modified
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Generate unique username
userSchema.pre('save', async function(next) {
  if (!this.isNew || this.username) return next();
  
  let baseUsername = this.email.split('@')[0].toLowerCase();
  baseUsername = baseUsername.replace(/[^a-zA-Z0-9]/g, '');
  
  let username = baseUsername;
  let counter = 1;
  
  while (await mongoose.model('User').findOne({ username })) {
    username = `${baseUsername}${counter}`;
    counter++;
  }
  
  this.username = username;
  next();
});

// Generate referral code
userSchema.pre('save', async function(next) {
  if (!this.isNew || this.referral.code) return next();
  
  let referralCode;
  do {
    referralCode = this.username.toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
  } while (await mongoose.model('User').findOne({ 'referral.code': referralCode }));
  
  this.referral.code = referralCode;
  next();
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.security.lockUntil && this.security.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { 'security.lockUntil': 1 },
      $set: { 'security.loginAttempts': 1 }
    });
  }
  
  const updates = { $inc: { 'security.loginAttempts': 1 } };
  
  // If we have hit max attempts and it's not locked yet, lock the account
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
  const lockTime = parseInt(process.env.LOCKOUT_TIME) || 30; // minutes
  
  if (this.security.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { 'security.lockUntil': Date.now() + lockTime * 60 * 1000 };
  }
  
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { 'security.lockUntil': 1, 'security.loginAttempts': 1 }
  });
};

userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

userSchema.methods.generateOTP = function(purpose = 'email_verification') {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY) || 10;
  
  this.otp = {
    code: otp,
    purpose: purpose,
    expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
    attempts: 0
  };
  
  return otp;
};

userSchema.methods.verifyOTP = function(inputOTP, purpose) {
  if (!this.otp.code || !this.otp.expiresAt) {
    return { success: false, message: 'No OTP found' };
  }
  
  if (this.otp.purpose !== purpose) {
    return { success: false, message: 'OTP purpose mismatch' };
  }
  
  if (this.otp.expiresAt < new Date()) {
    return { success: false, message: 'OTP has expired' };
  }
  
  if (this.otp.attempts >= 3) {
    return { success: false, message: 'Too many OTP attempts' };
  }
  
  if (this.otp.code !== inputOTP) {
    this.otp.attempts += 1;
    return { success: false, message: 'Invalid OTP' };
  }
  
  // Clear OTP after successful verification
  this.otp = undefined;
  return { success: true, message: 'OTP verified successfully' };
};

userSchema.methods.convertPointsToINR = function(points) {
  const rate = parseInt(process.env.POINTS_TO_RUPEE_RATE) || 100;
  return points / rate;
};

userSchema.methods.convertINRToPoints = function(inr) {
  const rate = parseInt(process.env.POINTS_TO_RUPEE_RATE) || 100;
  return inr * rate;
};

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'referral.code': 1 });
userSchema.index({ 'security.lockUntil': 1 });
userSchema.index({ status: 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);