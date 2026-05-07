const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const DispensaryStaff = require('../models/DispensaryStaff');
const Parent = require('../models/Parent');

// Mock OTP storage for mobile verification
const mobileOTPs = new Map();

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
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });

  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store OTP (In production, use Redis. Using Map for demo)
  mobileOTPs.set(phone, { otp, expires: Date.now() + 10 * 60000 }); // 10 min

  // In a real app, integrate Twilio here
  console.log(`[MOCK SMS] Sent OTP ${otp} to phone ${phone}`);

  res.json({ message: 'OTP sent successfully (Check server console for mock OTP)' });
});

// Verify Mobile OTP
router.post('/verify-mobile-otp', async (req, res) => {
  const { phone, otp } = req.body;
  
  const record = mobileOTPs.get(phone);
  if (!record) return res.status(400).json({ error: 'No OTP requested for this number' });
  if (Date.now() > record.expires) return res.status(400).json({ error: 'OTP expired' });
  if (record.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });

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
