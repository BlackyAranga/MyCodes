const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Notification content
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  
  // Notification type
  type: {
    type: String,
    enum: [
      'referral_added',
      'task_available', 
      'task_completed',
      'task_approved',
      'task_rejected',
      'rewards_credited',
      'deposit_success',
      'deposit_failed',
      'withdrawal_request',
      'withdrawal_approved',
      'withdrawal_rejected',
      'plan_purchased',
      'plan_expired',
      'kyc_approved',
      'kyc_rejected',
      'account_locked',
      'account_unlocked',
      'general',
      'promotional'
    ],
    required: true
  },
  
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Status
  isRead: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  
  // Related data
  relatedData: {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    referralUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number },
    points: { type: Number }
  },
  
  // Action buttons
  actions: [{
    label: String,
    action: String, // 'navigate', 'api_call', 'external_link'
    actionData: String, // URL or endpoint
    primary: { type: Boolean, default: false }
  }],
  
  // Delivery channels
  channels: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: false }
  },
  
  // Delivery status
  deliveryStatus: {
    inApp: { 
      status: { type: String, enum: ['pending', 'delivered', 'failed'], default: 'pending' },
      deliveredAt: Date,
      error: String
    },
    email: {
      status: { type: String, enum: ['pending', 'delivered', 'failed'], default: 'pending' },
      deliveredAt: Date,
      error: String
    },
    sms: {
      status: { type: String, enum: ['pending', 'delivered', 'failed'], default: 'pending' },
      deliveredAt: Date,
      error: String
    },
    push: {
      status: { type: String, enum: ['pending', 'delivered', 'failed'], default: 'pending' },
      deliveredAt: Date,
      error: String
    }
  },
  
  // Scheduling
  scheduledAt: {
    type: Date,
    default: Date.now
  },
  
  // Auto-expire
  expiresAt: {
    type: Date
  },
  
  // Icon and styling
  icon: {
    type: String
  },
  iconColor: {
    type: String
  },
  
  // Admin fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Read timestamp
  readAt: {
    type: Date
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
notificationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Set readAt timestamp when marked as read
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  
  // Set default icons based on type
  if (!this.icon) {
    const iconMap = {
      'referral_added': '👥',
      'task_available': '📋',
      'task_completed': '✅',
      'task_approved': '🎉',
      'task_rejected': '❌',
      'rewards_credited': '💰',
      'deposit_success': '💳',
      'deposit_failed': '⚠️',
      'withdrawal_request': '📤',
      'withdrawal_approved': '✅',
      'withdrawal_rejected': '❌',
      'plan_purchased': '🎯',
      'plan_expired': '⏰',
      'kyc_approved': '✅',
      'kyc_rejected': '❌',
      'account_locked': '🔒',
      'account_unlocked': '🔓',
      'general': 'ℹ️',
      'promotional': '🎁'
    };
    this.icon = iconMap[this.type] || 'ℹ️';
  }
  
  // Set default colors based on priority
  if (!this.iconColor) {
    const colorMap = {
      'low': '#6B7280',
      'medium': '#3B82F6',
      'high': '#F59E0B',
      'urgent': '#EF4444'
    };
    this.iconColor = colorMap[this.priority] || '#3B82F6';
  }
  
  next();
});

// Instance methods
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsUnread = function() {
  this.isRead = false;
  this.readAt = undefined;
  return this.save();
};

notificationSchema.methods.archive = function() {
  this.isArchived = true;
  return this.save();
};

notificationSchema.methods.markDelivered = function(channel) {
  if (this.deliveryStatus[channel]) {
    this.deliveryStatus[channel].status = 'delivered';
    this.deliveryStatus[channel].deliveredAt = new Date();
  }
  return this.save();
};

notificationSchema.methods.markFailed = function(channel, error) {
  if (this.deliveryStatus[channel]) {
    this.deliveryStatus[channel].status = 'failed';
    this.deliveryStatus[channel].error = error;
  }
  return this.save();
};

// Static methods
notificationSchema.statics.getUserNotifications = function(userId, options = {}) {
  const {
    limit = 50,
    page = 1,
    type = null,
    isRead = null,
    priority = null
  } = options;
  
  const query = { userId, isArchived: false };
  
  if (type) query.type = type;
  if (isRead !== null) query.isRead = isRead;
  if (priority) query.priority = priority;
  
  // Remove expired notifications
  const now = new Date();
  query.$or = [
    { expiresAt: { $exists: false } },
    { expiresAt: { $gt: now } }
  ];
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit)
    .populate('relatedData.taskId', 'title')
    .populate('relatedData.referralUserId', 'username');
};

notificationSchema.statics.getUnreadCount = function(userId) {
  const now = new Date();
  return this.countDocuments({
    userId,
    isRead: false,
    isArchived: false,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: now } }
    ]
  });
};

notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

notificationSchema.statics.createNotification = async function(data) {
  const notification = new this(data);
  await notification.save();
  
  // Send to appropriate channels
  if (notification.channels.inApp) {
    notification.markDelivered('inApp');
  }
  
  return notification;
};

// Pre-defined notification templates
notificationSchema.statics.templates = {
  referralAdded: (referredUser) => ({
    type: 'referral_added',
    title: 'New Referral!',
    message: `${referredUser.username} joined using your referral code. You've earned bonus points!`,
    priority: 'medium',
    relatedData: { referralUserId: referredUser._id }
  }),
  
  taskCompleted: (task, points) => ({
    type: 'task_completed',
    title: 'Task Completed!',
    message: `You've successfully completed "${task.title}" and earned ${points} points!`,
    priority: 'medium',
    relatedData: { taskId: task._id, points }
  }),
  
  rewardsCredit: (amount, type) => ({
    type: 'rewards_credited',
    title: 'Rewards Credited!',
    message: `${amount} points have been credited to your account from ${type}.`,
    priority: 'high',
    relatedData: { points: amount }
  }),
  
  withdrawalApproved: (amount) => ({
    type: 'withdrawal_approved',
    title: 'Withdrawal Approved!',
    message: `Your withdrawal request of ₹${amount} has been approved and will be processed shortly.`,
    priority: 'high',
    relatedData: { amount }
  }),
  
  planPurchased: (plan) => ({
    type: 'plan_purchased',
    title: 'Plan Activated!',
    message: `Your ${plan.displayName} has been activated successfully. Enjoy increased task limits!`,
    priority: 'high',
    relatedData: { planId: plan._id }
  })
};

// Virtual for time ago
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffMs = now - this.createdAt;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return this.createdAt.toLocaleDateString();
});

// Indexes
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ userId: 1, priority: 1 });
notificationSchema.index({ scheduledAt: 1 });
notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ isArchived: 1 });

module.exports = mongoose.model('Notification', notificationSchema);