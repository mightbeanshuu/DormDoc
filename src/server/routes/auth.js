const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LoginLog = require('../models/LoginLog');
const OTP = require('../models/OTP');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Email transporter (lazily built so the server doesn't crash if EMAIL_USER is missing).
const emailIsConfigured = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
const transporter = emailIsConfigured
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    })
  : null;

const isProduction = process.env.NODE_ENV === 'production';

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via email — falls back to console log when email is unconfigured (dev mode).
const sendOTPEmail = async (email, otp) => {
  if (!transporter) {
    if (isProduction) {
      throw new Error('Email is not configured on the server');
    }
    // Dev fallback so the OTP feature is usable without a Gmail app password.
    console.log(`\n[DEV OTP] To: ${email}\n[DEV OTP] Code: ${otp}\n[DEV OTP] Valid for 10 minutes\n`);
    return { mocked: true };
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset OTP — DormDoc',
    html: `
      <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7B1E1E;">Password Reset Request</h2>
        <p>You have requested to reset your password for DormDoc · BIT Mesra.</p>
        <p>Your OTP (One-Time Password) is:</p>
        <div style="background-color: #FAF7F2; padding: 22px; text-align: center; margin: 22px 0; border: 1px solid rgba(15,24,64,0.08); border-radius: 12px;">
          <h1 style="color: #7B1E1E; font-size: 32px; margin: 0; letter-spacing: 0.18em;">${otp}</h1>
        </div>
        <p>This OTP is valid for 10 minutes. If you didn't request this reset, please ignore this email.</p>
        <p>For security reasons, do not share this OTP with anyone.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid rgba(15,24,64,0.1);">
        <p style="color: #5A5A5A; font-size: 12px;">
          Automated message from DormDoc — Campus dispensary management for BIT Mesra.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  return { mocked: false };
};

// Register user
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password, role, studentId, department, year, phone, bloodGroup, emergencyContact } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      studentId,
      department,
      year,
      phone,
      bloodGroup,
      emergencyContact,
      isActive: true,
    });

    await user.save();

    // Log registration
    const loginLog = new LoginLog({
      userId: user._id,
      email: user.email,
      action: 'register',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success',
    });
    await loginLog.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        department: user.department,
        year: user.year,
        phone: user.phone,
        bloodGroup: user.bloodGroup,
        emergencyContact: user.emergencyContact,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login user
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      // Log failed login attempt
      const loginLog = new LoginLog({
        email,
        action: 'login',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'failed',
        reason: 'User not found',
      });
      await loginLog.save();

      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      // Log failed login attempt
      const loginLog = new LoginLog({
        userId: user._id,
        email: user.email,
        action: 'login',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'failed',
        reason: 'Account deactivated',
      });
      await loginLog.save();

      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Log failed login attempt
      const loginLog = new LoginLog({
        userId: user._id,
        email: user.email,
        action: 'login',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'failed',
        reason: 'Invalid password',
      });
      await loginLog.save();

      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    // Log successful login
    const loginLog = new LoginLog({
      userId: user._id,
      email: user.email,
      action: 'login',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success',
    });
    await loginLog.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        department: user.department,
        year: user.year,
        phone: user.phone,
        bloodGroup: user.bloodGroup,
        emergencyContact: user.emergencyContact,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Send OTP for password reset
router.post('/send-otp', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }

    const otpCode = generateOTP();
    const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    // Replace any stale OTP for this email — the OTP model requires
    // ipAddress + userAgent, which the previous upsert was omitting.
    await OTP.deleteMany({ email });
    await OTP.create({
      email,
      otp: otpCode,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      used: false,
      ipAddress,
      userAgent,
    });

    const sendResult = await sendOTPEmail(email, otpCode);

    await new LoginLog({
      userId: user._id,
      email: user.email,
      action: 'otp_request',
      ipAddress,
      userAgent,
      status: 'success',
    }).save();

    const response = { message: 'OTP sent successfully', emailDelivered: !sendResult.mocked };

    // In dev mode without email configured, echo the OTP back so the
    // password-reset flow can be tested without an SMTP setup.
    if (sendResult.mocked && !isProduction) {
      response.devOtp = otpCode;
      response.message = 'OTP generated (dev mode — email transport not configured). See server console.';
    }

    res.json(response);
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Failed to send OTP', detail: error.message });
  }
});

// Verify OTP
router.post('/verify-otp', authLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find OTP record
    const otpRecord = await OTP.findOne({ email, otp, used: false });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Mark OTP as used
    otpRecord.used = true;
    await otpRecord.save();

    // Log OTP verification
    const user = await User.findOne({ email });
    const loginLog = new LoginLog({
      userId: user._id,
      email: user.email,
      action: 'otp_verify',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success',
    });
    await loginLog.save();

    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
});

// Reset password with OTP
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Verify OTP
    const otpRecord = await OTP.findOne({ email, otp, used: true });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    user.password = hashedPassword;
    await user.save();

    // Delete used OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    // Log password reset
    const loginLog = new LoginLog({
      userId: user._id,
      email: user.email,
      action: 'password_reset',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success',
    });
    await loginLog.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { name, phone, bloodGroup, emergencyContact } = req.body;

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { name, phone, bloodGroup, emergencyContact },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Log profile update
    const loginLog = new LoginLog({
      userId: user._id,
      email: user.email,
      action: 'profile_update',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success',
    });
    await loginLog.save();

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Change password
router.put('/change-password', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    // Log password change
    const loginLog = new LoginLog({
      userId: user._id,
      email: user.email,
      action: 'password_change',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success',
    });
    await loginLog.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
});

module.exports = router;