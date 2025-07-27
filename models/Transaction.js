const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Transaction identification
  transactionId: {
    type: String,
    unique: true,
    required: true
  },
  razorpayOrderId: {
    type: String
  },
  razorpayPaymentId: {
    type: String
  },
  
  // Transaction details
  type: {
    type: String,
    enum: [
      'deposit', 
      'withdrawal', 
      'points_to_inr', 
      'inr_to_points', 
      'task_reward', 
      'referral_bonus', 
      'signup_bonus',
      'plan_purchase',
      'refund'
    ],
    required: true
  },
  
  // Amount details
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    enum: ['INR', 'POINTS'],
    required: true
  },
  
  // For conversions
  fromAmount: {
    type: Number
  },
  fromCurrency: {
    type: String,
    enum: ['INR', 'POINTS']
  },
  toAmount: {
    type: Number
  },
  toCurrency: {
    type: String,
    enum: ['INR', 'POINTS']
  },
  conversionRate: {
    type: Number
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  
  // Payment gateway details
  gateway: {
    type: String,
    enum: ['razorpay', 'internal', 'admin'],
    default: 'internal'
  },
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Bank details for withdrawals
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    bankName: String
  },
  
  // Fees and taxes
  originalAmount: {
    type: Number
  },
  fees: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number
  },
  
  // Description and metadata
  description: {
    type: String,
    trim: true
  },
  metadata: {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    referralUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bonusType: String,
    seasonalOffer: String
  },
  
  // Wallet balances after transaction
  balanceAfter: {
    points: { type: Number },
    inr: { type: Number }
  },
  
  // Admin review (for withdrawals)
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  reviewNotes: {
    type: String
  },
  
  // Fraud detection
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  deviceFingerprint: {
    type: String
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Failure details
  failureReason: {
    type: String
  },
  retryCount: {
    type: Number,
    default: 0
  },
  
  // Timestamps
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware
transactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Generate transaction ID if not present
  if (!this.transactionId) {
    this.transactionId = 'TXN' + Date.now() + Math.random().toString(36).substr(2, 6).toUpperCase();
  }
  
  // Calculate net amount
  if (this.originalAmount && (this.fees || this.tax)) {
    this.netAmount = this.originalAmount - (this.fees || 0) - (this.tax || 0);
  } else if (!this.netAmount) {
    this.netAmount = this.amount;
  }
  
  // Set processed/completed timestamps
  if (this.isModified('status')) {
    if (this.status === 'processing' && !this.processedAt) {
      this.processedAt = new Date();
    }
    if (['completed', 'failed', 'cancelled'].includes(this.status) && !this.completedAt) {
      this.completedAt = new Date();
    }
  }
  
  next();
});

// Instance methods
transactionSchema.methods.markCompleted = function(balanceAfter = {}) {
  this.status = 'completed';
  this.completedAt = new Date();
  if (balanceAfter.points !== undefined || balanceAfter.inr !== undefined) {
    this.balanceAfter = balanceAfter;
  }
  return this.save();
};

transactionSchema.methods.markFailed = function(reason = '') {
  this.status = 'failed';
  this.failureReason = reason;
  this.completedAt = new Date();
  return this.save();
};

transactionSchema.methods.markProcessing = function() {
  this.status = 'processing';
  this.processedAt = new Date();
  return this.save();
};

transactionSchema.methods.retry = function() {
  this.retryCount += 1;
  this.status = 'pending';
  this.failureReason = '';
  return this.save();
};

transactionSchema.methods.approve = function(adminId, notes = '') {
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  this.reviewNotes = notes;
  this.status = 'approved';
  return this.save();
};

transactionSchema.methods.reject = function(adminId, notes = '') {
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  this.reviewNotes = notes;
  this.status = 'rejected';
  return this.save();
};

// Static methods
transactionSchema.statics.getUserTransactionHistory = function(userId, limit = 50, type = null) {
  const query = { userId };
  if (type) query.type = type;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('metadata.taskId', 'title')
    .populate('metadata.referralUserId', 'username');
};

transactionSchema.statics.getUserEarnings = function(userId, startDate, endDate) {
  const matchConditions = {
    userId: mongoose.Types.ObjectId(userId),
    status: 'completed',
    type: { $in: ['task_reward', 'referral_bonus', 'signup_bonus'] }
  };
  
  if (startDate && endDate) {
    matchConditions.completedAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  return this.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
};

transactionSchema.statics.getPendingWithdrawals = function() {
  return this.find({
    type: 'withdrawal',
    status: 'pending'
  })
  .populate('userId', 'username email profile.firstName profile.lastName')
  .sort({ createdAt: 1 });
};

transactionSchema.statics.getTransactionAnalytics = function(startDate, endDate) {
  const matchConditions = { status: 'completed' };
  
  if (startDate && endDate) {
    matchConditions.completedAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  return this.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: {
          type: '$type',
          date: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } }
        },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }
    },
    { $sort: { '_id.date': -1 } }
  ]);
};

// Virtual for calculating effective amount (considering fees and taxes)
transactionSchema.virtual('effectiveAmount').get(function() {
  if (this.type === 'withdrawal') {
    return this.netAmount || (this.amount - (this.fees || 0) - (this.tax || 0));
  }
  return this.amount;
});

// Indexes for better query performance
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ razorpayOrderId: 1 });
transactionSchema.index({ razorpayPaymentId: 1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ status: 1, createdAt: 1 });
transactionSchema.index({ userId: 1, type: 1, status: 1 });
transactionSchema.index({ 
  completedAt: -1 
}, { 
  partialFilterExpression: { status: 'completed' } 
});

module.exports = mongoose.model('Transaction', transactionSchema);