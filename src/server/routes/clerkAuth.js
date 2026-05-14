const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const DispensaryStaff = require('../models/DispensaryStaff');
const Parent = require('../models/Parent');
const { sendOtp, pickProvider } = require('../utils/sms');

// In-memory OTP storage with throttling state per phone
const mobileOTPs = new Map();
const SEND_COOLDOWN_MS = 30_000;
const MAX_VERIFY_ATTEMPTS = 5;

// Helper to get the correct model based on role
const getModelByRole = (role) => {
  switch (role) {
    case 'student': return Student;
    case 'faculty': case 'hod': case 'dean': return Faculty;
    case 'admin': case 'doctor': return DispensaryStaff;
    case 'parent': return Parent;
    default: return Student;
  }
};

// Sync Clerk user with our MongoDB
router.post('/sync', async (req, res) => {
  try {
    const { clerkUserId, email, name, role } = req.body;
    
    if (!clerkUserId || !email) {
      return res.status(400).json({ error: 'Missing required Clerk data' });
    }

    const Model = getModelByRole(role);
    
    // Check if user exists by clerkUserId or email
    let user = await Model.findOne({ $or: [{ clerkUserId }, { email: email.toLowerCase() }] });
    
    if (!user) {
      // Create a basic shell record for new users
      const shellData = {
        clerkUserId,
        email: email.toLowerCase(),
        name: name || 'New User',
        isActive: true,
      };

      // Add dummy required fields just to pass schema validation initially, 
      // they will be updated in onboarding
      if (role === 'student') {
        shellData.studentId = `TEMP-${Date.now()}`;
        shellData.department = 'Pending';
        shellData.year = '1st';
        shellData.phone = 'Pending';
      } else if (role === 'parent') {
        shellData.parentId = `TEMP-${Date.now()}`;
        shellData.phone = 'Pending';
        shellData.relationToStudent = 'other';
      } else if (role === 'faculty' || role === 'hod') {
        shellData.facultyId = `TEMP-${Date.now()}`;
        shellData.department = 'Pending';
        shellData.designation = 'Assistant Professor';
        shellData.phone = 'Pending';
      } else {
        shellData.staffId = `TEMP-${Date.now()}`;
        shellData.staffType = 'admin_staff';
        shellData.designation = 'Staff';
        shellData.phone = 'Pending';
      }

      user = new Model(shellData);
      await user.save();
      
      return res.json({ 
        user, 
        needsOnboarding: true,
        message: 'New user synced. Onboarding required.' 
      });
    }

    // If user exists but doesn't have clerkUserId linked yet
    if (!user.clerkUserId) {
      user.clerkUserId = clerkUserId;
      await user.save();
    }

    // Check if onboarding is needed (e.g., missing actual phone or specific fields)
    const needsOnboarding = user.phone === 'Pending' || !user.phone || user.department === 'Pending';

    res.json({ user, needsOnboarding });
  } catch (error) {
    console.error('Clerk sync error:', error);
    res.status(500).json({ error: 'Server error during sync' });
  }
});

// Send Mobile OTP
router.post('/send-mobile-otp', async (req, res) => {
  const rawPhone = req.body?.phone;
  const phone = String(rawPhone || '').replace(/\D/g, '');
  if (!phone || phone.length < 10) {
    return res.status(400).json({ error: 'Valid phone number required' });
  }

  // Throttle: don't allow a resend within 30 seconds
  const existing = mobileOTPs.get(phone);
  if (existing && Date.now() - existing.sentAt < SEND_COOLDOWN_MS) {
    const wait = Math.ceil((SEND_COOLDOWN_MS - (Date.now() - existing.sentAt)) / 1000);
    return res.status(429).json({ error: `Please wait ${wait}s before requesting another OTP.` });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  mobileOTPs.set(phone, {
    otp,
    expires: Date.now() + 10 * 60_000,
    sentAt: Date.now(),
    attempts: 0,
  });

  try {
    const result = await sendOtp({ phone, otp });
    res.json({
      message: 'OTP sent successfully',
      provider: result.provider,
    });
  } catch (err) {
    console.error('[OTP] Delivery failed:', err.message);
    // In dev mode, still report success because sendOtp logs the code to the
    // server console as a fallback — the dev can read it from there.
    if (process.env.NODE_ENV !== 'production') {
      return res.json({
        message: 'OTP generated; check server console (provider delivery failed in dev).',
        provider: pickProvider(),
        devFallback: true,
      });
    }
    res.status(502).json({
      error: 'Could not deliver OTP. Please try again or contact support.',
    });
  }
});

// Verify Mobile OTP
router.post('/verify-mobile-otp', async (req, res) => {
  const rawPhone = req.body?.phone;
  const phone = String(rawPhone || '').replace(/\D/g, '');
  const otp = String(req.body?.otp || '').trim();

  const record = mobileOTPs.get(phone);
  if (!record) return res.status(400).json({ error: 'No OTP requested for this number' });
  if (Date.now() > record.expires) {
    mobileOTPs.delete(phone);
    return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
  }
  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    mobileOTPs.delete(phone);
    return res.status(429).json({ error: 'Too many attempts. Please request a new OTP.' });
  }
  if (record.otp !== otp) {
    record.attempts += 1;
    return res.status(400).json({
      error: 'Invalid OTP',
      attemptsLeft: MAX_VERIFY_ATTEMPTS - record.attempts,
    });
  }

  // Success
  mobileOTPs.delete(phone);
  res.json({ success: true, message: 'Phone verified successfully' });
});

// Complete Onboarding
router.post('/onboarding', async (req, res) => {
  try {
    const { clerkUserId, role, data } = req.body;
    
    const Model = getModelByRole(role);
    const user = await Model.findOne({ clerkUserId });
    
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Update fields dynamically based on role
    Object.assign(user, data);

    // Remove TEMP prefix if studentId/etc was set during onboarding
    if (user.studentId && user.studentId.startsWith('TEMP-') && data.studentId) {
      user.studentId = data.studentId;
    }

    await user.save();
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('Onboarding error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'A user with this ID/Roll Number already exists.' });
    }
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

module.exports = router;
