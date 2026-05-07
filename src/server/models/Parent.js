const mongoose = require('mongoose');

const parentSchema = new mongoose.Schema({
  // Identity
  parentId: { type: String, required: true, unique: true, trim: true, index: true }, // e.g. PAR-2021-001
  clerkUserId: { type: String, unique: true, sparse: true },

  // Personal Info
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true },
  alternatePhone: { type: String },
  dob: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  occupation: { type: String },

  // Address
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
    country: { type: String, default: 'India' },
  },

  // Relationship to student
  relationToStudent: {
    type: String,
    enum: ['father', 'mother', 'guardian', 'uncle', 'aunt', 'sibling', 'other'],
    required: true,
  },

  // Linked students (a parent can have multiple children at BIT)
  students: [{
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    rollNumber: { type: String },
    name: { type: String },
    relation: { type: String },
    isPrimary: { type: Boolean, default: true }, // primary ward
  }],

  // Notification preferences
  notifications: {
    smsEnabled: { type: Boolean, default: true },
    emailEnabled: { type: Boolean, default: true },
    emergencyAlerts: { type: Boolean, default: true },
    appointmentUpdates: { type: Boolean, default: true },
    prescriptionAlerts: { type: Boolean, default: true },
  },

  // Portal access
  isVerified: { type: Boolean, default: false }, // Admin-verified parent account
  verifiedAt: { type: Date },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'DispensaryStaff' },

  // Status
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
}, { timestamps: true });

parentSchema.index({ email: 1 });
parentSchema.index({ 'students.studentId': 1 });

module.exports = mongoose.model('Parent', parentSchema);
