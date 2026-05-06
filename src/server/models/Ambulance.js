const mongoose = require('mongoose');

const ambulanceSchema = new mongoose.Schema({
  vehicleNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  driverName: {
    type: String,
    required: true,
    trim: true
  },
  driverPhone: {
    type: String,
    required: true
  },
  driverLicense: {
    type: String,
    required: true,
    unique: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1,
    max: 4
  },
  equipment: [{
    name: String,
    status: {
      type: String,
      enum: ['available', 'in-use', 'maintenance'],
      default: 'available'
    },
    lastChecked: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['available', 'in-use', 'maintenance', 'out-of-service'],
    default: 'available'
  },
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },
  currentAssignment: {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    pickupLocation: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    destination: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    assignedAt: {
      type: Date,
      default: null
    },
    estimatedArrival: {
      type: Date,
      default: null
    },
    actualArrival: {
      type: Date,
      default: null
    }
  },
  maintenance: {
    lastService: {
      type: Date,
      default: Date.now
    },
    nextService: {
      type: Date,
      required: true
    },
    mileage: {
      type: Number,
      default: 0
    },
    issues: [{
      description: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low'
      },
      reportedAt: {
        type: Date,
        default: Date.now
      },
      resolved: {
        type: Boolean,
        default: false
      },
      resolvedAt: Date
    }]
  },
  performance: {
    totalTrips: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number,
      default: 0 // in minutes
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalRating: {
      type: Number,
      default: 0
    },
    ratingCount: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
ambulanceSchema.index({ status: 1, location: '2dsphere' });
ambulanceSchema.index({ 'currentAssignment.student': 1 });

// Method to update location
ambulanceSchema.methods.updateLocation = function(latitude, longitude, address) {
  this.location = { latitude, longitude, address };
  return this.save();
};

// Method to assign to student
ambulanceSchema.methods.assignToStudent = function(studentId, pickupLocation, destination) {
  this.status = 'in-use';
  this.currentAssignment = {
    student: studentId,
    pickupLocation,
    destination,
    assignedAt: new Date(),
    estimatedArrival: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
  };
  return this.save();
};

// Method to complete assignment
ambulanceSchema.methods.completeAssignment = function() {
  this.status = 'available';
  this.currentAssignment = {
    student: null,
    pickupLocation: null,
    destination: null,
    assignedAt: null,
    estimatedArrival: null,
    actualArrival: null
  };
  this.performance.totalTrips += 1;
  return this.save();
};

// Method to calculate distance to location
ambulanceSchema.methods.calculateDistance = function(targetLat, targetLng) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (targetLat - this.location.latitude) * Math.PI / 180;
  const dLng = (targetLng - this.location.longitude) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.location.latitude * Math.PI / 180) * Math.cos(targetLat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

// Method to update rating
ambulanceSchema.methods.updateRating = function(newRating) {
  this.performance.totalRating += newRating;
  this.performance.ratingCount += 1;
  this.performance.rating = this.performance.totalRating / this.performance.ratingCount;
  return this.save();
};

// Static method to find nearest available ambulance
ambulanceSchema.statics.findNearestAvailable = function(latitude, longitude, maxDistance = 10) {
  return this.find({
    status: 'available',
    isActive: true,
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance * 1000 // Convert km to meters
      }
    }
  }).sort({ 'performance.averageResponseTime': 1 });
};

// Static method to get ambulance statistics
ambulanceSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgRating: { $avg: '$performance.rating' },
        totalTrips: { $sum: '$performance.totalTrips' }
      }
    }
  ]);
};

module.exports = mongoose.model('Ambulance', ambulanceSchema);
