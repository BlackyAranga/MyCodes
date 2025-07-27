const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['baby', 'basic', 'gold', 'star'],
    unique: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  
  // Pricing
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  
  // Plan benefits
  benefits: {
    extraTasksPerDay: {
      type: Number,
      required: true
    },
    totalTasksPerDay: {
      type: Number // base tasks + extra tasks
    },
    bonusMultiplier: {
      type: Number,
      default: 1 // 1 = no bonus, 1.5 = 50% bonus, etc.
    },
    prioritySupport: {
      type: Boolean,
      default: false
    },
    exclusiveTasks: {
      type: Boolean,
      default: false
    },
    withdrawalFeeDiscount: {
      type: Number, // percentage discount
      default: 0
    }
  },
  
  // Duration
  durationDays: {
    type: Number,
    default: 30 // 30 days validity
  },
  
  // Restrictions
  requiresReferral: {
    type: Boolean,
    default: false // only baby plan requires referral
  },
  minKycLevel: {
    type: String,
    enum: ['none', 'basic', 'advanced'],
    default: 'none'
  },
  
  // Availability
  isActive: {
    type: Boolean,
    default: true
  },
  maxUsers: {
    type: Number // max users allowed for this plan
  },
  currentUsers: {
    type: Number,
    default: 0
  },
  
  // Seasonal offers
  discountPercentage: {
    type: Number,
    default: 0
  },
  offerValidTill: {
    type: Date
  },
  offerDescription: {
    type: String
  },
  
  // Plan features
  features: [{
    type: String
  }],
  
  // Icon and styling
  icon: {
    type: String
  },
  color: {
    type: String
  },
  popular: {
    type: Boolean,
    default: false
  },
  
  // Admin fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Analytics
  totalSubscriptions: {
    type: Number,
    default: 0
  },
  revenue: {
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
planSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate total tasks per day
  const baseTasks = parseInt(process.env.DEFAULT_DAILY_TASKS) || 15;
  this.benefits.totalTasksPerDay = baseTasks + this.benefits.extraTasksPerDay;
  
  next();
});

// Virtual for current price (including discount)
planSchema.virtual('currentPrice').get(function() {
  if (this.discountPercentage > 0 && this.offerValidTill && this.offerValidTill > new Date()) {
    return this.price * (1 - this.discountPercentage / 100);
  }
  return this.price;
});

// Virtual for savings amount
planSchema.virtual('savings').get(function() {
  return this.price - this.currentPrice;
});

// Instance methods
planSchema.methods.canUserPurchase = function(user) {
  // Check if plan is active
  if (!this.isActive) {
    return { canPurchase: false, reason: 'Plan not available' };
  }
  
  // Check max users limit
  if (this.maxUsers && this.currentUsers >= this.maxUsers) {
    return { canPurchase: false, reason: 'Plan capacity full' };
  }
  
  // Check referral requirement (for baby plan)
  if (this.requiresReferral && !user.referral.referredBy) {
    return { canPurchase: false, reason: 'Referral required for this plan' };
  }
  
  // Check KYC requirement
  if (this.minKycLevel !== 'none') {
    const kycLevels = ['none', 'basic', 'advanced'];
    const userKycIndex = kycLevels.indexOf(user.verification.kycLevel);
    const requiredKycIndex = kycLevels.indexOf(this.minKycLevel);
    
    if (userKycIndex < requiredKycIndex) {
      return { canPurchase: false, reason: 'KYC verification required' };
    }
  }
  
  // Check if user already has this plan
  if (user.plan.current === this.name && user.plan.expiryDate && user.plan.expiryDate > new Date()) {
    return { canPurchase: false, reason: 'Plan already active' };
  }
  
  return { canPurchase: true };
};

planSchema.methods.incrementSubscription = function() {
  this.totalSubscriptions += 1;
  this.currentUsers += 1;
  this.revenue += this.currentPrice;
  return this.save();
};

planSchema.methods.decrementSubscription = function() {
  if (this.currentUsers > 0) {
    this.currentUsers -= 1;
  }
  return this.save();
};

// Static methods
planSchema.statics.getAvailablePlans = function(user) {
  const query = { isActive: true };
  
  // If user doesn't have referral, exclude baby plan
  if (!user.referral.referredBy) {
    query.requiresReferral = { $ne: true };
  }
  
  return this.find(query).sort({ price: 1 });
};

planSchema.statics.getPlanByName = function(planName) {
  return this.findOne({ name: planName, isActive: true });
};

planSchema.statics.getPopularPlans = function() {
  return this.find({ isActive: true, popular: true }).sort({ price: 1 });
};

// Create default plans if they don't exist
planSchema.statics.createDefaultPlans = async function() {
  const defaultPlans = [
    {
      name: 'baby',
      displayName: 'Baby Plan',
      description: 'Perfect for beginners who joined through referral',
      price: 50,
      benefits: {
        extraTasksPerDay: 10,
        bonusMultiplier: 1.1
      },
      requiresReferral: true,
      features: [
        '25 tasks per day (15 + 10 extra)',
        '10% bonus on task rewards',
        'Email support'
      ],
      icon: '👶',
      color: '#FFB6C1'
    },
    {
      name: 'basic',
      displayName: 'Basic Plan',
      description: 'Great for regular users',
      price: 100,
      benefits: {
        extraTasksPerDay: 20,
        bonusMultiplier: 1.15
      },
      features: [
        '35 tasks per day (15 + 20 extra)',
        '15% bonus on task rewards',
        'Priority email support',
        '5% discount on withdrawal fees'
      ],
      icon: '📈',
      color: '#87CEEB',
      popular: true
    },
    {
      name: 'gold',
      displayName: 'Gold Plan',
      description: 'For serious earners',
      price: 200,
      benefits: {
        extraTasksPerDay: 40,
        bonusMultiplier: 1.25,
        prioritySupport: true,
        withdrawalFeeDiscount: 10
      },
      features: [
        '55 tasks per day (15 + 40 extra)',
        '25% bonus on task rewards',
        'Priority support',
        '10% discount on withdrawal fees',
        'Access to exclusive tasks'
      ],
      icon: '🏆',
      color: '#FFD700'
    },
    {
      name: 'star',
      displayName: 'Star Plan',
      description: 'Ultimate plan for power users',
      price: 300,
      benefits: {
        extraTasksPerDay: 60,
        bonusMultiplier: 1.5,
        prioritySupport: true,
        exclusiveTasks: true,
        withdrawalFeeDiscount: 15
      },
      minKycLevel: 'basic',
      features: [
        '75 tasks per day (15 + 60 extra)',
        '50% bonus on task rewards',
        'VIP support',
        '15% discount on withdrawal fees',
        'Access to exclusive high-value tasks',
        'Early access to new features'
      ],
      icon: '⭐',
      color: '#9370DB'
    }
  ];
  
  for (const planData of defaultPlans) {
    const existingPlan = await this.findOne({ name: planData.name });
    if (!existingPlan) {
      await this.create(planData);
    }
  }
};

// Indexes
planSchema.index({ name: 1 });
planSchema.index({ isActive: 1 });
planSchema.index({ price: 1 });
planSchema.index({ popular: -1, price: 1 });

module.exports = mongoose.model('Plan', planSchema);