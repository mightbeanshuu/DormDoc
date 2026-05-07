const mongoose = require('mongoose');

const dispensaryStaffSchema = new mongoose.Schema({
  // Identity
  staffId: { type: String, required: true, unique: true, trim: true, index: true }, // e.g. DISP-001
  clerkUserId: { type: String, unique: true, sparse: true },

  // Personal Info
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true },
  dob: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  photo: { type: String },

  // Professional Info
  staffType: {
    type: String,
    required: true,
    enum: [
      'medical_officer',     // Chief Medical Officer / MBBS Doctor
      'nurse',               // Nursing staff
      'pharmacist',          // Pharmacy staff
      'lab_technician',      // Pathology / Lab
      'admin_staff',         // Receptionist / Office
      'ambulance_driver',    // Ambulance
      'counsellor',          // Mental health
    ],
  },
  designation: { type: String, required: true }, // e.g. "Chief Medical Officer"
  licenseNumber: { type: String, sparse: true }, // for doctors & pharmacists
  qualification: [String], // e.g. ['MBBS', 'MD']
  specialization: { type: String }, // for doctors
  experience: { type: Number, default: 0 }, // years of experience
  joiningDate: { type: Date },

  // Shift & Availability
  shift: { type: String, enum: ['morning', 'evening', 'night', 'rotating'], default: 'morning' },
  shiftTiming: {
    start: { type: String, default: '09:00' },
    end: { type: String, default: '17:00' },
  },
  availability: {
    monday:    { type: Boolean, default: true },
    tuesday:   { type: Boolean, default: true },
    wednesday: { type: Boolean, default: true },
    thursday:  { type: Boolean, default: true },
    friday:    { type: Boolean, default: true },
    saturday:  { type: Boolean, default: false },
    sunday:    { type: Boolean, default: false },
  },
  isOnDuty: { type: Boolean, default: false },

  // Consultation stats (for medical officers)
  totalConsultations: { type: Number, default: 0 },
  currentQueueNumber: { type: Number, default: 0 },
  maxPatientsPerDay: { type: Number, default: 30 },
  averageConsultationTime: { type: Number, default: 15 }, // minutes
  rating: { type: Number, default: 0, min: 0, max: 5 },

  // Medical Info (for staff themselves)
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
  emergencyContact: {
    name: { type: String },
    phone: { type: String },
    relation: { type: String },
  },

  // Portal role (this maps to ClerkAuthContext roles)
  role: { type: String, enum: ['doctor', 'admin'], default: 'doctor' },

  // Status
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
}, { timestamps: true });

dispensaryStaffSchema.index({ staffType: 1 });
dispensaryStaffSchema.index({ isOnDuty: 1 });

module.exports = mongoose.model('DispensaryStaff', dispensaryStaffSchema);
