const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema({
  // Identity
  studentId: { type: String, required: true, unique: true, trim: true, index: true }, // e.g. BIT2021001
  rollNumber: { type: String, unique: true, trim: true },
  clerkUserId: { type: String, unique: true, sparse: true }, // Clerk auth linkage

  // Personal Info
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true },
  dob: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  photo: { type: String }, // URL to photo

  // Academic Info
  department: { type: String, required: true, trim: true },
  year: { type: String, required: true, enum: ['1st', '2nd', '3rd', '4th', '5th'] },
  section: { type: String },
  programme: { type: String, enum: ['B.Tech', 'M.Tech', 'MCA', 'MBA', 'B.Pharm', 'M.Pharm', 'Ph.D'], default: 'B.Tech' },
  batch: { type: String }, // e.g. "2021-2025"
  hostel: { type: String }, // Hostel name
  roomNumber: { type: String },

  // Medical Info
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
  allergies: [String],
  currentMedications: [String],
  chronicConditions: [String],
  disabilities: { type: String, default: '' },

  // Emergency Contact (Parent/Guardian)
  emergencyContact: {
    name: { type: String },
    phone: { type: String },
    relation: { type: String, enum: ['father', 'mother', 'guardian', 'sibling', 'other'] },
    email: { type: String },
  },

  // Parent linkage
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent' },

  // Medical History (references to appointments/prescriptions)
  medicalHistory: [{
    condition: String,
    diagnosis: String,
    date: Date,
    doctor: String,
    notes: String,
  }],

  // QR Code for dispensary scan
  qrCode: { type: String, unique: true, sparse: true },

  // Status
  isActive: { type: Boolean, default: true },
  isCurrentlyAdmitted: { type: Boolean, default: false }, // Admitted to campus health center
  lastLogin: { type: Date },

  // Insurance
  insuranceId: { type: String },
}, { timestamps: true });

// Indexes for fast queries on 6000 students
studentSchema.index({ department: 1, year: 1 });
studentSchema.index({ hostel: 1 });
studentSchema.index({ bloodGroup: 1 });
studentSchema.index({ email: 1 });

module.exports = mongoose.model('Student', studentSchema);
