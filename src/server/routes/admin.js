const express = require('express');
const router = express.Router();
const User = require('../models/User');
const LoginLog = require('../models/LoginLog');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Middleware to verify admin access
const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Apply admin middleware to all routes
router.use(verifyAdmin);

// Get all login information
router.get('/login-info', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, role, status } = req.query;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (search) {
      filter.$or = [
        { 'user.name': { $regex: search, $options: 'i' } },
        { 'user.email': { $regex: search, $options: 'i' } },
        { 'user.studentId': { $regex: search, $options: 'i' } },
        { ipAddress: { $regex: search, $options: 'i' } },
      ];
    }
    if (role && role !== 'all') {
      filter['user.role'] = role;
    }
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Get login information with user details
    const loginInfo = await LoginLog.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: filter
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: parseInt(limit)
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          email: 1,
          action: 1,
          ipAddress: 1,
          userAgent: 1,
          status: 1,
          reason: 1,
          timestamp: 1,
          'user._id': 1,
          'user.name': 1,
          'user.email': 1,
          'user.role': 1,
          'user.studentId': 1,
          'user.department': 1,
          'user.year': 1,
          'user.phone': 1,
          'user.bloodGroup': 1,
          'user.emergencyContact': 1,
          'user.lastLogin': 1,
          'user.loginCount': 1,
          'user.isActive': 1,
        }
      }
    ]);

    // Get total count for pagination
    const totalCount = await LoginLog.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: filter
      },
      {
        $count: 'total'
      }
    ]);

    res.json({
      loginInfo,
      totalCount: totalCount[0]?.total || 0,
      currentPage: parseInt(page),
      totalPages: Math.ceil((totalCount[0]?.total || 0) / limit),
    });
  } catch (error) {
    console.error('Get login info error:', error);
    res.status(500).json({ message: 'Failed to fetch login information' });
  }
});

// Get login statistics
router.get('/login-statistics', async (req, res) => {
  try {
    const statistics = await LoginLog.getLoginStatistics();
    res.json(statistics);
  } catch (error) {
    console.error('Get login statistics error:', error);
    res.status(500).json({ message: 'Failed to fetch login statistics' });
  }
});

// Get recent logins
router.get('/recent-logins', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const recentLogins = await LoginLog.find({
      action: 'login',
      status: 'success'
    })
    .sort({ timestamp: -1 })
    .limit(parseInt(limit))
    .populate('userId', 'name email role studentId')
    .select('userId email ipAddress userAgent timestamp');

    res.json(recentLogins);
  } catch (error) {
    console.error('Get recent logins error:', error);
    res.status(500).json({ message: 'Failed to fetch recent logins' });
  }
});

// Get suspicious login attempts
router.get('/suspicious-logins', async (req, res) => {
  try {
    const suspiciousLogins = await LoginLog.getSuspiciousLogins();
    res.json(suspiciousLogins);
  } catch (error) {
    console.error('Get suspicious logins error:', error);
    res.status(500).json({ message: 'Failed to fetch suspicious logins' });
  }
});

// Get user login history
router.get('/user-login-history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;
    
    const loginHistory = await LoginLog.getUserLoginHistory(userId, parseInt(limit));
    res.json(loginHistory);
  } catch (error) {
    console.error('Get user login history error:', error);
    res.status(500).json({ message: 'Failed to fetch user login history' });
  }
});

// Reset user password
router.post('/reset-password', async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({ message: 'User ID and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    // Log password reset by admin
    const loginLog = new LoginLog({
      userId: user._id,
      email: user.email,
      action: 'password_reset',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success',
      reason: 'Reset by admin',
    });
    await loginLog.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

// Toggle user status (lock/unlock)
router.post('/toggle-user-status', async (req, res) => {
  try {
    const { userId, action } = req.body;

    if (!userId || !action) {
      return res.status(400).json({ message: 'User ID and action are required' });
    }

    if (!['lock', 'unlock'].includes(action)) {
      return res.status(400).json({ message: 'Action must be either lock or unlock' });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user status
    user.isActive = action === 'unlock';
    await user.save();

    // Log status change
    const loginLog = new LoginLog({
      userId: user._id,
      email: user.email,
      action: action === 'lock' ? 'account_lock' : 'account_unlock',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success',
      reason: `Account ${action}ed by admin`,
    });
    await loginLog.save();

    res.json({ 
      message: `User ${action}ed successfully`,
      isActive: user.isActive
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ message: 'Failed to toggle user status' });
  }
});

// OTP statistics endpoint removed in Phase 2 — OTP is now handled by Supabase
// Auth (no longer queryable from our DB). Track via Supabase dashboard logs.
router.get('/otp-statistics', (req, res) => {
  res.status(410).json({
    message: 'OTP statistics moved — see Supabase Auth logs.',
  });
});

// Get all users with login information
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, role, status } = req.query;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
      ];
    }
    if (role && role !== 'all') {
      filter.role = role;
    }
    if (status && status !== 'all') {
      filter.isActive = status === 'active';
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await User.countDocuments(filter);

    res.json({
      users,
      totalCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Delete user
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Don't allow deleting admin users
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete admin users' });
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    // Log user deletion
    const loginLog = new LoginLog({
      email: user.email,
      action: 'user_deletion',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success',
      reason: 'User deleted by admin',
    });
    await loginLog.save();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// Export login data
router.get('/export-login-data', async (req, res) => {
  try {
    const { format = 'csv', startDate, endDate } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.timestamp = { $gte: new Date(startDate) };
    }
    if (endDate) {
      dateFilter.timestamp = { ...dateFilter.timestamp, $lte: new Date(endDate) };
    }

    const loginData = await LoginLog.find(dateFilter)
      .populate('userId', 'name email role studentId')
      .sort({ timestamp: -1 });

    if (format === 'csv') {
      const csvData = [
        ['Timestamp', 'User', 'Email', 'Role', 'Action', 'IP Address', 'Status', 'Reason'],
        ...loginData.map(log => [
          log.timestamp.toISOString(),
          log.userId?.name || 'N/A',
          log.email,
          log.userId?.role || 'N/A',
          log.action,
          log.ipAddress,
          log.status,
          log.reason || 'N/A',
        ])
      ].map(row => row.join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=login-data.csv');
      res.send(csvData);
    } else {
      res.json(loginData);
    }
  } catch (error) {
    console.error('Export login data error:', error);
    res.status(500).json({ message: 'Failed to export login data' });
  }
});

module.exports = router;