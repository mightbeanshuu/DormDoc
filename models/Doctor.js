const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  specialization: {
    type: String,
    required: true,
    trim: true
  },
  qualification: {
    type: String,
    required: true
  },
  experience: {
    type: Number,
    required: true,
    min: 0
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  availability: {
    monday: {
      isAvailable: { type: Boolean, default: true },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '17:00' }
    },
    tuesday: {
      isAvailable: { type: Boolean, default: true },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '17:00' }
    },
    wednesday: {
      isAvailable: { type: Boolean, default: true },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '17:00' }
    },
    thursday: {
      isAvailable: { type: Boolean, default: true },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '17:00' }
    },
    friday: {
      isAvailable: { type: Boolean, default: true },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '17:00' }
    },
    saturday: {
      isAvailable: { type: Boolean, default: false },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '13:00' }
    },
    sunday: {
      isAvailable: { type: Boolean, default: false },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '13:00' }
    }
  },
  currentPatientCount: {
    type: Number,
    default: 0
  },
  maxPatientsPerDay: {
    type: Number,
    default: 30
  },
  isOnDuty: {
    type: Boolean,
    default: false
  },
  currentQueueNumber: {
    type: Number,
    default: 0
  },
  averageConsultationTime: {
    type: Number,
    default: 15 // in minutes
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalConsultations: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Method to check if doctor is available at given time
doctorSchema.methods.isAvailableAt = function(dayOfWeek, time) {
  const daySchedule = this.availability[dayOfWeek.toLowerCase()];
  if (!daySchedule.isAvailable) return false;
  
  const requestedTime = new Date(`2000-01-01T${time}`);
  const startTime = new Date(`2000-01-01T${daySchedule.startTime}`);
  const endTime = new Date(`2000-01-01T${daySchedule.endTime}`);
  
  return requestedTime >= startTime && requestedTime <= endTime;
};

// Method to get next available slot
doctorSchema.methods.getNextAvailableSlot = function() {
  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const currentTime = now.toTimeString().slice(0, 5);
  
  // Check if doctor is available today
  if (this.isAvailableAt(currentDay, currentTime)) {
    return {
      date: now.toISOString().split('T')[0],
      time: currentTime,
      available: true
    };
  }
  
  // Find next available day
  for (let i = 1; i <= 7; i++) {
    const futureDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const futureDay = futureDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const daySchedule = this.availability[futureDay];
    
    if (daySchedule.isAvailable) {
      return {
        date: futureDate.toISOString().split('T')[0],
        time: daySchedule.startTime,
        available: true
      };
    }
  }
  
  return { available: false };
};

module.exports = mongoose.model('Doctor', doctorSchema);
