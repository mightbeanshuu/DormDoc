const mongoose = require('mongoose');

const ambulanceTripSchema = new mongoose.Schema({
  patientName: {
    type: String,
    required: true,
    trim: true
  },
  patientPhone: {
    type: String,
    required: true,
    trim: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  pickupLocation: {
    type: String,
    required: true,
    trim: true
  },
  destination: {
    type: String,
    required: true,
    trim: true
  },
  emergencyType: {
    type: String,
    enum: ['medical', 'accident', 'cardiac', 'respiratory', 'trauma', 'other'],
    default: 'medical'
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  ambulance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ambulance',
    required: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  status: {
    type: String,
    enum: ['pending', 'dispatched', 'en-route', 'arrived', 'completed', 'cancelled'],
    default: 'pending'
  },
  currentLocation: {
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    },
    address: {
      type: String,
      default: ''
    }
  },
  estimatedTime: {
    type: Number, // in minutes
    default: null
  },
  actualDuration: {
    type: Number, // in minutes
    default: null
  },
  duration: {
    type: Number, // in minutes
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  completionNotes: {
    type: String,
    default: ''
  },
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  completedAt: {
    type: Date,
    default: null
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
ambulanceTripSchema.index({ status: 1 });
ambulanceTripSchema.index({ priority: 1 });
ambulanceTripSchema.index({ ambulance: 1 });
ambulanceTripSchema.index({ createdAt: -1 });
ambulanceTripSchema.index({ completedAt: -1 });

// Virtual for trip duration
ambulanceTripSchema.virtual('tripDuration').get(function() {
  if (this.completedAt && this.createdAt) {
    return Math.round((this.completedAt - this.createdAt) / (1000 * 60)); // in minutes
  }
  return null;
});

// Virtual for current status with timestamp
ambulanceTripSchema.virtual('currentStatusInfo').get(function() {
  const latestStatus = this.statusHistory[this.statusHistory.length - 1];
  return {
    status: this.status,
    timestamp: latestStatus ? latestStatus.timestamp : this.createdAt,
    location: latestStatus ? latestStatus.location : null
  };
});

module.exports = mongoose.model('AmbulanceTrip', ambulanceTripSchema);
