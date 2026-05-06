const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Optional for failed login attempts
  },
  email: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login',
      'logout',
      'register',
      'password_reset',
      'password_change',
      'otp_request',
      'otp_verify',
      'profile_update',
      'account_lock',
      'account_unlock',
    ],
  },
  ipAddress: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['success', 'failed', 'pending'],
  },
  reason: {
    type: String,
    required: false,
  },
  location: {
    country: String,
    region: String,
    city: String,
    timezone: String,
  },
  device: {
    type: String, // mobile, desktop, tablet
    browser: String,
    os: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  sessionId: {
    type: String,
    required: false,
  },
  additionalData: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

// Indexes for better query performance
loginLogSchema.index({ userId: 1, timestamp: -1 });
loginLogSchema.index({ email: 1, timestamp: -1 });
loginLogSchema.index({ ipAddress: 1, timestamp: -1 });
loginLogSchema.index({ action: 1, timestamp: -1 });
loginLogSchema.index({ status: 1, timestamp: -1 });
loginLogSchema.index({ timestamp: -1 });

// Virtual for formatted timestamp
loginLogSchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp.toLocaleString();
});

// Static method to get login statistics
loginLogSchema.statics.getLoginStatistics = async function() {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const [
    totalUsers,
    activeUsers,
    lockedUsers,
    todayLogins,
    recentLogins,
    failedLogins,
  ] = await Promise.all([
    this.distinct('userId').then(users => users.length),
    this.countDocuments({ 
      action: 'login', 
      status: 'success',
      timestamp: { $gte: startOfDay }
    }),
    this.countDocuments({ 
      action: 'account_lock', 
      status: 'success' 
    }),
    this.countDocuments({ 
      action: 'login', 
      status: 'success',
      timestamp: { $gte: startOfDay }
    }),
    this.find({ 
      action: 'login', 
      status: 'success' 
    })
    .sort({ timestamp: -1 })
    .limit(10)
    .populate('userId', 'name email role'),
    this.countDocuments({ 
      status: 'failed',
      timestamp: { $gte: startOfDay }
    }),
  ]);

  return {
    totalUsers,
    activeUsers,
    lockedUsers,
    todayLogins,
    recentLogins,
    failedLogins,
  };
};

// Static method to get user login history
loginLogSchema.statics.getUserLoginHistory = async function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'name email role');
};

// Static method to get suspicious login attempts
loginLogSchema.statics.getSuspiciousLogins = async function() {
  const suspiciousIPs = await this.aggregate([
    {
      $match: {
        status: 'failed',
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      }
    },
    {
      $group: {
        _id: '$ipAddress',
        count: { $sum: 1 },
        attempts: { $push: '$$ROOT' }
      }
    },
    {
      $match: { count: { $gte: 5 } } // 5 or more failed attempts
    },
    {
      $sort: { count: -1 }
    }
  ]);

  return suspiciousIPs;
};

module.exports = mongoose.model('LoginLog', loginLogSchema);
