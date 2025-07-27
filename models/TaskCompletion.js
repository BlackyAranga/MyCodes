const mongoose = require('mongoose');

const taskCompletionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  
  // Completion details
  status: {
    type: String,
    enum: ['started', 'in_progress', 'submitted', 'approved', 'rejected', 'failed'],
    default: 'started'
  },
  
  // Submission data
  submissionData: {
    screenshots: [String],
    textResponses: [{
      question: String,
      answer: String
    }],
    urls: [String],
    files: [String],
    notes: String
  },
  
  // Timing
  startedAt: {
    type: Date,
    default: Date.now
  },
  submittedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0
  },
  
  // Rewards
  pointsEarned: {
    type: Number,
    default: 0
  },
  bonusPointsEarned: {
    type: Number,
    default: 0
  },
  totalPointsEarned: {
    type: Number,
    default: 0
  },
  
  // Review
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
  
  // Quality metrics
  qualityScore: {
    type: Number,
    min: 0,
    max: 100
  },
  
  // IP and device tracking for fraud prevention
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  deviceFingerprint: {
    type: String
  },
  
  // Fraud detection flags
  fraudFlags: [{
    type: String,
    reason: String,
    timestamp: { type: Date, default: Date.now }
  }],
  isFraudulent: {
    type: Boolean,
    default: false
  },
  
  // Timestamps
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
taskCompletionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate total points earned
  this.totalPointsEarned = this.pointsEarned + this.bonusPointsEarned;
  
  // Set completion timestamp when status changes to completed
  if (this.isModified('status') && this.status === 'approved' && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  next();
});

// Instance methods
taskCompletionSchema.methods.approve = function(reviewerId, reviewNotes = '') {
  this.status = 'approved';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewNotes = reviewNotes;
  this.completedAt = new Date();
  return this.save();
};

taskCompletionSchema.methods.reject = function(reviewerId, reviewNotes = '') {
  this.status = 'rejected';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewNotes = reviewNotes;
  return this.save();
};

taskCompletionSchema.methods.submit = function(submissionData) {
  this.status = 'submitted';
  this.submittedAt = new Date();
  this.submissionData = { ...this.submissionData, ...submissionData };
  
  // Calculate time spent
  if (this.startedAt) {
    this.timeSpent = Math.floor((Date.now() - this.startedAt.getTime()) / 1000);
  }
  
  return this.save();
};

taskCompletionSchema.methods.markInProgress = function() {
  this.status = 'in_progress';
  return this.save();
};

taskCompletionSchema.methods.flagFraud = function(reason) {
  this.fraudFlags.push({
    type: 'system',
    reason: reason,
    timestamp: new Date()
  });
  
  // Mark as fraudulent if multiple flags
  if (this.fraudFlags.length >= 3) {
    this.isFraudulent = true;
  }
  
  return this.save();
};

// Static methods
taskCompletionSchema.statics.getUserTaskHistory = function(userId, limit = 50) {
  return this.find({ userId })
    .populate('taskId', 'title pointsReward category')
    .sort({ createdAt: -1 })
    .limit(limit);
};

taskCompletionSchema.statics.getTaskStatistics = function(taskId) {
  return this.aggregate([
    { $match: { taskId: mongoose.Types.ObjectId(taskId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgTimeSpent: { $avg: '$timeSpent' },
        totalPointsAwarded: { $sum: '$totalPointsEarned' }
      }
    }
  ]);
};

taskCompletionSchema.statics.getUserDailyCompletions = function(userId, date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.countDocuments({
    userId,
    status: 'approved',
    completedAt: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  });
};

taskCompletionSchema.statics.getPendingReviews = function(limit = 100) {
  return this.find({ status: 'submitted' })
    .populate('userId', 'username email')
    .populate('taskId', 'title pointsReward')
    .sort({ submittedAt: 1 })
    .limit(limit);
};

// Compound indexes for better query performance
taskCompletionSchema.index({ userId: 1, createdAt: -1 });
taskCompletionSchema.index({ taskId: 1, status: 1 });
taskCompletionSchema.index({ status: 1, submittedAt: 1 });
taskCompletionSchema.index({ userId: 1, status: 1, completedAt: -1 });
taskCompletionSchema.index({ 
  userId: 1, 
  completedAt: 1 
}, { 
  partialFilterExpression: { status: 'approved' } 
});

// Unique constraint to prevent duplicate completions
taskCompletionSchema.index(
  { userId: 1, taskId: 1 }, 
  { unique: true }
);

module.exports = mongoose.model('TaskCompletion', taskCompletionSchema);