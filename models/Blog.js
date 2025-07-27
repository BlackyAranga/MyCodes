const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  excerpt: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300
  },
  content: {
    type: String,
    required: true
  },
  
  // SEO and metadata
  metaTitle: {
    type: String,
    maxlength: 60
  },
  metaDescription: {
    type: String,
    maxlength: 160
  },
  keywords: [{
    type: String,
    trim: true
  }],
  
  // Media
  featuredImage: {
    type: String
  },
  images: [{
    url: String,
    alt: String,
    caption: String
  }],
  
  // Author information
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorName: {
    type: String,
    required: true
  },
  
  // Categories and tags
  category: {
    type: String,
    required: true,
    enum: [
      'news',
      'tutorial',
      'tips',
      'announcement',
      'guide',
      'update',
      'earning-tips',
      'task-strategies',
      'success-stories'
    ]
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  
  // Status and publishing
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  publishedAt: {
    type: Date
  },
  scheduledAt: {
    type: Date
  },
  
  // Engagement metrics
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  shares: {
    facebook: { type: Number, default: 0 },
    twitter: { type: Number, default: 0 },
    linkedin: { type: Number, default: 0 },
    whatsapp: { type: Number, default: 0 },
    telegram: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  
  // User interactions
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Reading time estimate
  readingTime: {
    type: Number, // in minutes
    default: 1
  },
  
  // Comments system
  commentsEnabled: {
    type: Boolean,
    default: true
  },
  commentsCount: {
    type: Number,
    default: 0
  },
  
  // Featured and trending
  isFeatured: {
    type: Boolean,
    default: false
  },
  isTrending: {
    type: Boolean,
    default: false
  },
  
  // Admin moderation
  isApproved: {
    type: Boolean,
    default: false
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: {
    type: Date
  },
  
  // Priority for homepage display
  priority: {
    type: Number,
    default: 1
  },
  
  // Related posts
  relatedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog'
  }],
  
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
blogSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Generate slug from title if not provided
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim('-'); // Remove leading/trailing hyphens
  }
  
  // Set meta title from title if not provided
  if (!this.metaTitle && this.title) {
    this.metaTitle = this.title.length > 60 ? 
      this.title.substring(0, 57) + '...' : 
      this.title;
  }
  
  // Set meta description from excerpt if not provided
  if (!this.metaDescription && this.excerpt) {
    this.metaDescription = this.excerpt.length > 160 ? 
      this.excerpt.substring(0, 157) + '...' : 
      this.excerpt;
  }
  
  // Calculate reading time (approximately 200 words per minute)
  if (this.content) {
    const wordCount = this.content.split(/\s+/).length;
    this.readingTime = Math.max(1, Math.ceil(wordCount / 200));
  }
  
  // Set published date when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  // Calculate total shares
  this.shares.total = Object.values(this.shares).reduce((sum, val) => {
    return typeof val === 'number' ? sum + val : sum;
  }, 0);
  
  next();
});

// Instance methods
blogSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

blogSchema.methods.toggleLike = function(userId) {
  const isLiked = this.likedBy.includes(userId);
  
  if (isLiked) {
    this.likedBy.pull(userId);
    this.likes = Math.max(0, this.likes - 1);
  } else {
    this.likedBy.push(userId);
    this.likes += 1;
  }
  
  return this.save();
};

blogSchema.methods.incrementShare = function(platform) {
  if (this.shares[platform] !== undefined) {
    this.shares[platform] += 1;
    this.shares.total += 1;
    return this.save();
  }
  return Promise.resolve(this);
};

blogSchema.methods.publish = function() {
  this.status = 'published';
  this.publishedAt = new Date();
  return this.save();
};

blogSchema.methods.unpublish = function() {
  this.status = 'draft';
  this.publishedAt = undefined;
  return this.save();
};

blogSchema.methods.approve = function(moderatorId) {
  this.isApproved = true;
  this.moderatedBy = moderatorId;
  this.moderatedAt = new Date();
  return this.save();
};

blogSchema.methods.getShareUrls = function(baseUrl = 'https://yourapp.com') {
  const postUrl = `${baseUrl}/blog/${this.slug}`;
  const encodedUrl = encodeURIComponent(postUrl);
  const encodedTitle = encodeURIComponent(this.title);
  const encodedExcerpt = encodeURIComponent(this.excerpt);
  
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    copyLink: postUrl
  };
};

// Static methods
blogSchema.statics.getPublishedPosts = function(options = {}) {
  const {
    limit = 10,
    page = 1,
    category = null,
    tag = null,
    featured = null,
    trending = null,
    search = null
  } = options;
  
  const query = { status: 'published', isApproved: true };
  
  if (category) query.category = category;
  if (tag) query.tags = { $in: [tag] };
  if (featured !== null) query.isFeatured = featured;
  if (trending !== null) query.isTrending = trending;
  
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { excerpt: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } }
    ];
  }
  
  return this.find(query)
    .populate('author', 'username profile.firstName profile.lastName profile.avatar')
    .sort({ publishedAt: -1, priority: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
};

blogSchema.statics.getFeaturedPosts = function(limit = 5) {
  return this.find({ 
    status: 'published', 
    isApproved: true, 
    isFeatured: true 
  })
  .populate('author', 'username profile.firstName profile.lastName profile.avatar')
  .sort({ priority: -1, publishedAt: -1 })
  .limit(limit);
};

blogSchema.statics.getTrendingPosts = function(limit = 5) {
  return this.find({ 
    status: 'published', 
    isApproved: true, 
    isTrending: true 
  })
  .populate('author', 'username profile.firstName profile.lastName profile.avatar')
  .sort({ views: -1, publishedAt: -1 })
  .limit(limit);
};

blogSchema.statics.getRelatedPosts = function(postId, category, tags = [], limit = 4) {
  const query = {
    _id: { $ne: postId },
    status: 'published',
    isApproved: true,
    $or: [
      { category: category },
      { tags: { $in: tags } }
    ]
  };
  
  return this.find(query)
    .populate('author', 'username profile.firstName profile.lastName')
    .sort({ publishedAt: -1 })
    .limit(limit);
};

blogSchema.statics.getPopularPosts = function(limit = 10, days = 30) {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  
  return this.find({
    status: 'published',
    isApproved: true,
    publishedAt: { $gte: sinceDate }
  })
  .populate('author', 'username profile.firstName profile.lastName')
  .sort({ views: -1, likes: -1 })
  .limit(limit);
};

blogSchema.statics.searchPosts = function(searchTerm, limit = 20) {
  return this.find({
    status: 'published',
    isApproved: true,
    $text: { $search: searchTerm }
  }, {
    score: { $meta: 'textScore' }
  })
  .populate('author', 'username profile.firstName profile.lastName')
  .sort({ score: { $meta: 'textScore' } })
  .limit(limit);
};

// Virtuals
blogSchema.virtual('url').get(function() {
  return `/blog/${this.slug}`;
});

blogSchema.virtual('isPublished').get(function() {
  return this.status === 'published' && this.isApproved;
});

blogSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffMs = now - this.publishedAt;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 1) return 'Today';
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return this.publishedAt.toLocaleDateString();
});

// Text index for search
blogSchema.index({
  title: 'text',
  excerpt: 'text',
  content: 'text',
  tags: 'text'
});

// Other indexes
blogSchema.index({ slug: 1 });
blogSchema.index({ status: 1, isApproved: 1 });
blogSchema.index({ category: 1 });
blogSchema.index({ tags: 1 });
blogSchema.index({ publishedAt: -1 });
blogSchema.index({ isFeatured: -1, priority: -1 });
blogSchema.index({ views: -1 });
blogSchema.index({ likes: -1 });
blogSchema.index({ author: 1 });

module.exports = mongoose.model('Blog', blogSchema);