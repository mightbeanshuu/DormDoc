const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
    length: 6,
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
  },
  used: {
    type: Boolean,
    default: false,
  },
  attempts: {
    type: Number,
    default: 0,
    max: 3, // Maximum 3 attempts
  },
  ipAddress: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  usedAt: {
    type: Date,
    required: false,
  },
});

// Indexes for better query performance
otpSchema.index({ email: 1, createdAt: -1 });
otpSchema.index({ otp: 1, expiresAt: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired OTPs

// Virtual for checking if OTP is expired
otpSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Virtual for checking if OTP is valid (not expired and not used)
otpSchema.virtual('isValid').get(function() {
  return !this.isExpired && !this.used && this.attempts < 3;
});

// Method to mark OTP as used
otpSchema.methods.markAsUsed = function() {
  this.used = true;
  this.usedAt = new Date();
  return this.save();
};

// Method to increment attempts
otpSchema.methods.incrementAttempts = function() {
  this.attempts += 1;
  return this.save();
};

// Static method to generate new OTP
otpSchema.statics.generateOTP = function(email, ipAddress, userAgent) {
  // Delete any existing OTPs for this email
  return this.deleteMany({ email }).then(() => {
    // Generate new 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Create new OTP record
    return this.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      ipAddress,
      userAgent,
    });
  });
};

// Static method to verify OTP
otpSchema.statics.verifyOTP = async function(email, otp) {
  const otpRecord = await this.findOne({ 
    email, 
    otp, 
    used: false 
  });

  if (!otpRecord) {
    return { success: false, message: 'Invalid OTP' };
  }

  if (otpRecord.isExpired) {
    await otpRecord.deleteOne();
    return { success: false, message: 'OTP has expired' };
  }

  if (otpRecord.attempts >= 3) {
    await otpRecord.deleteOne();
    return { success: false, message: 'Maximum attempts exceeded' };
  }

  // Mark as used
  await otpRecord.markAsUsed();
  
  return { success: true, message: 'OTP verified successfully' };
};

// Static method to get OTP statistics
otpSchema.statics.getOTPStatistics = async function() {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const [
    totalOTPs,
    usedOTPs,
    expiredOTPs,
    todayOTPs,
    failedAttempts,
  ] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ used: true }),
    this.countDocuments({ 
      used: false, 
      expiresAt: { $lt: new Date() } 
    }),
    this.countDocuments({ 
      createdAt: { $gte: startOfDay, $lte: endOfDay } 
    }),
    this.countDocuments({ attempts: { $gte: 3 } }),
  ]);

  return {
    totalOTPs,
    usedOTPs,
    expiredOTPs,
    todayOTPs,
    failedAttempts,
    successRate: totalOTPs > 0 ? (usedOTPs / totalOTPs * 100).toFixed(2) : 0,
  };
};

// Pre-save middleware to ensure OTP is 6 digits
otpSchema.pre('save', function(next) {
  if (this.otp && this.otp.length !== 6) {
    return next(new Error('OTP must be exactly 6 digits'));
  }
  next();
});

// Cleanup expired OTPs (runs every hour)
setInterval(async () => {
  try {
    await mongoose.model('OTP').deleteMany({
      expiresAt: { $lt: new Date() }
    });
  } catch (error) {
    console.error('Error cleaning up expired OTPs:', error);
  }
}, 60 * 60 * 1000); // Run every hour

module.exports = mongoose.model('OTP', otpSchema);
