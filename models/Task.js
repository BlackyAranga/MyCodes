const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  category: {
    type: String,
    required: true,
    enum: ['survey', 'data_entry', 'social_media', 'testing', 'content_creation', 'other']
  },
  type: {
    type: String,
    required: true,
    enum: ['click', 'survey', 'watch', 'social_follow', 'download', 'signup', 'review']
  },
  
  // Task Details
  instructions: {
    type: String,
    required: true,
    maxlength: 2000
  },
  targetUrl: {
    type: String,
    trim: true
  },
  requirements: [{
    type: String,
    trim: true
  }],
  
  // Rewards
  pointsReward: {
    type: Number,
    required: true,
    min: 1
  },
  bonusPoints: {
    type: Number,
    default: 0
  },
  
  // Task Configuration
  maxCompletions: {
    type: Number,
    default: 1000
  },
  currentCompletions: {
    type: Number,
    default: 0
  },
  timeLimit: {
    type: Number, // in minutes
    default: 60
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'easy'
  },
  
  // Availability
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  
  // Geographic restrictions
  allowedCountries: [{
    type: String,
    default: ['IN']
  }],
  
  // Plan requirements
  minPlanRequired: {
    type: String,
    enum: ['free', 'baby', 'basic', 'gold', 'star'],
    default: 'free'
  },
  
  // Media attachments
  images: [{
    type: String
  }],
  videos: [{
    type: String
  }],
  
  // Admin fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  priority: {
    type: Number,
    default: 1
  },
  
  // Analytics
  views: {
    type: Number,
    default: 0
  },
  completionRate: {
    type: Number,
    default: 0
  },
  averageCompletionTime: {
    type: Number,
    default: 0
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
taskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate completion rate
  if (this.maxCompletions > 0) {
    this.completionRate = (this.currentCompletions / this.maxCompletions) * 100;
  }
  
  next();
});

// Virtual for checking if task is available
taskSchema.virtual('isAvailable').get(function() {
  const now = new Date();
  return this.isActive && 
         this.isApproved && 
         this.currentCompletions < this.maxCompletions &&
         (!this.endDate || this.endDate > now) &&
         this.startDate <= now;
});

// Instance methods
taskSchema.methods.canUserComplete = function(user) {
  // Check if user has required plan
  const planHierarchy = ['free', 'baby', 'basic', 'gold', 'star'];
  const userPlanIndex = planHierarchy.indexOf(user.plan.current);
  const requiredPlanIndex = planHierarchy.indexOf(this.minPlanRequired);
  
  if (userPlanIndex < requiredPlanIndex) {
    return { canComplete: false, reason: 'Plan upgrade required' };
  }
  
  // Check if task is available
  if (!this.isAvailable) {
    return { canComplete: false, reason: 'Task not available' };
  }
  
  // Check geographic restrictions
  if (this.allowedCountries.length > 0 && 
      !this.allowedCountries.includes(user.profile.address?.country || 'IN')) {
    return { canComplete: false, reason: 'Geographic restriction' };
  }
  
  return { canComplete: true };
};

taskSchema.methods.incrementCompletion = function() {
  this.currentCompletions += 1;
  this.completionRate = (this.currentCompletions / this.maxCompletions) * 100;
  return this.save();
};

// Static methods
taskSchema.statics.getAvailableTasksForUser = function(user, limit = 10) {
  const query = {
    isActive: true,
    isApproved: true,
    $expr: { $lt: ['$currentCompletions', '$maxCompletions'] },
    startDate: { $lte: new Date() },
    $or: [
      { endDate: { $exists: false } },
      { endDate: { $gt: new Date() } }
    ]
  };
  
  // Filter by plan requirement
  const planHierarchy = ['free', 'baby', 'basic', 'gold', 'star'];
  const userPlanIndex = planHierarchy.indexOf(user.plan.current);
  const allowedPlans = planHierarchy.slice(0, userPlanIndex + 1);
  query.minPlanRequired = { $in: allowedPlans };
  
  // Filter by geography
  if (user.profile.address?.country) {
    query.allowedCountries = { $in: [user.profile.address.country] };
  }
  
  return this.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit);
};

// Indexes
taskSchema.index({ isActive: 1, isApproved: 1 });
taskSchema.index({ category: 1 });
taskSchema.index({ type: 1 });
taskSchema.index({ startDate: 1, endDate: 1 });
taskSchema.index({ minPlanRequired: 1 });
taskSchema.index({ pointsReward: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ priority: -1 });

module.exports = mongoose.model('Task', taskSchema);