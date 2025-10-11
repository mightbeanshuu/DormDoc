const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const Ambulance = require('../models/Ambulance');
const Appointment = require('../models/Appointment');
const User = require('../models/User');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// @route   GET /api/ambulance/status
// @desc    Get all ambulance status
// @access  Private
router.get('/status', async (req, res) => {
  try {
    const ambulances = await Ambulance.find({ isActive: true })
      .select('vehicleNumber driverName status location currentAssignment performance')
      .sort({ status: 1, vehicleNumber: 1 });

    res.json({ ambulances });
  } catch (error) {
    console.error('Get ambulance status error:', error);
    res.status(500).json({ message: 'Server error fetching ambulance status' });
  }
});

// @route   GET /api/ambulance/available
// @desc    Get available ambulances near location
// @access  Private
router.get('/available', async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 10 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const availableAmbulances = await Ambulance.findNearestAvailable(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(maxDistance)
    );

    res.json({ availableAmbulances });
  } catch (error) {
    console.error('Get available ambulances error:', error);
    res.status(500).json({ message: 'Server error fetching available ambulances' });
  }
});

// @route   POST /api/ambulance/request
// @desc    Request ambulance service
// @access  Private
router.post('/request', [
  body('symptoms').notEmpty().withMessage('Symptoms description is required'),
  body('pickupLocation.latitude').isNumeric().withMessage('Pickup latitude is required'),
  body('pickupLocation.longitude').isNumeric().withMessage('Pickup longitude is required'),
  body('pickupLocation.address').notEmpty().withMessage('Pickup address is required'),
  body('destination.latitude').optional().isNumeric().withMessage('Destination latitude must be numeric'),
  body('destination.longitude').optional().isNumeric().withMessage('Destination longitude must be numeric'),
  body('destination.address').optional().isString().withMessage('Destination address must be string'),
  body('isEmergency').optional().isBoolean().withMessage('Emergency flag must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      symptoms,
      pickupLocation,
      destination,
      isEmergency = false,
      priority = 5
    } = req.body;

    const studentId = req.user._id;

    // Find nearest available ambulance
    const nearestAmbulances = await Ambulance.findNearestAvailable(
      pickupLocation.latitude,
      pickupLocation.longitude,
      20 // Extended search radius
    );

    if (nearestAmbulances.length === 0) {
      return res.status(400).json({
        message: 'No ambulances available at the moment',
        estimatedWaitTime: 'Unknown'
      });
    }

    const ambulance = nearestAmbulances[0];

    // Assign ambulance to student
    await ambulance.assignToStudent(studentId, pickupLocation, destination);

    // Create appointment record
    const appointment = new Appointment({
      student: studentId,
      appointmentDate: new Date(),
      appointmentTime: new Date().toTimeString().slice(0, 5),
      symptoms,
      priority: isEmergency ? 10 : priority,
      queueNumber: 1,
      isEmergency,
      status: 'scheduled'
    });

    await appointment.save();

    // Emit real-time update
    req.io.emit('ambulance-assigned', {
      studentId,
      ambulanceId: ambulance._id,
      vehicleNumber: ambulance.vehicleNumber,
      driverName: ambulance.driverName,
      driverPhone: ambulance.driverPhone,
      estimatedArrival: ambulance.currentAssignment.estimatedArrival,
      appointmentId: appointment._id
    });

    res.status(201).json({
      message: 'Ambulance request submitted successfully',
      ambulance: {
        vehicleNumber: ambulance.vehicleNumber,
        driverName: ambulance.driverName,
        driverPhone: ambulance.driverPhone,
        estimatedArrival: ambulance.currentAssignment.estimatedArrival
      },
      appointment,
      estimatedWaitTime: calculateEstimatedWaitTime(ambulance, pickupLocation)
    });
  } catch (error) {
    console.error('Ambulance request error:', error);
    res.status(500).json({ message: 'Server error processing ambulance request' });
  }
});

// @route   PUT /api/ambulance/:id/update-location
// @desc    Update ambulance location
// @access  Private
router.put('/:id/update-location', [
  body('latitude').isNumeric().withMessage('Latitude is required'),
  body('longitude').isNumeric().withMessage('Longitude is required'),
  body('address').notEmpty().withMessage('Address is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const ambulanceId = req.params.id;
    const { latitude, longitude, address } = req.body;

    const ambulance = await Ambulance.findById(ambulanceId);
    if (!ambulance) {
      return res.status(404).json({ message: 'Ambulance not found' });
    }

    await ambulance.updateLocation(latitude, longitude, address);

    // Emit real-time location update
    req.io.emit('ambulance-location-updated', {
      ambulanceId: ambulance._id,
      location: { latitude, longitude, address },
      timestamp: new Date()
    });

    res.json({
      message: 'Ambulance location updated successfully',
      location: { latitude, longitude, address }
    });
  } catch (error) {
    console.error('Update ambulance location error:', error);
    res.status(500).json({ message: 'Server error updating ambulance location' });
  }
});

// @route   PUT /api/ambulance/:id/complete-trip
// @desc    Complete ambulance trip
// @access  Private
router.put('/:id/complete-trip', async (req, res) => {
  try {
    const ambulanceId = req.params.id;
    const { rating, feedback } = req.body;

    const ambulance = await Ambulance.findById(ambulanceId);
    if (!ambulance) {
      return res.status(404).json({ message: 'Ambulance not found' });
    }

    if (ambulance.status !== 'in-use') {
      return res.status(400).json({ message: 'Ambulance is not currently in use' });
    }

    // Complete the assignment
    await ambulance.completeAssignment();

    // Update rating if provided
    if (rating && rating >= 1 && rating <= 5) {
      await ambulance.updateRating(rating);
    }

    // Update appointment status
    const appointment = await Appointment.findOne({
      student: ambulance.currentAssignment.student,
      status: 'scheduled',
      isEmergency: true
    });

    if (appointment) {
      appointment.status = 'completed';
      appointment.checkOutTime = new Date();
      await appointment.save();
    }

    // Emit real-time update
    req.io.emit('ambulance-trip-completed', {
      ambulanceId: ambulance._id,
      vehicleNumber: ambulance.vehicleNumber,
      status: ambulance.status
    });

    res.json({
      message: 'Ambulance trip completed successfully',
      ambulance: {
        vehicleNumber: ambulance.vehicleNumber,
        status: ambulance.status,
        performance: ambulance.performance
      }
    });
  } catch (error) {
    console.error('Complete ambulance trip error:', error);
    res.status(500).json({ message: 'Server error completing ambulance trip' });
  }
});

// @route   GET /api/ambulance/:id/tracking
// @desc    Track ambulance location
// @access  Private
router.get('/:id/tracking', async (req, res) => {
  try {
    const ambulanceId = req.params.id;

    const ambulance = await Ambulance.findById(ambulanceId)
      .select('vehicleNumber driverName status location currentAssignment performance');

    if (!ambulance) {
      return res.status(404).json({ message: 'Ambulance not found' });
    }

    res.json({
      ambulance: {
        vehicleNumber: ambulance.vehicleNumber,
        driverName: ambulance.driverName,
        status: ambulance.status,
        location: ambulance.location,
        currentAssignment: ambulance.currentAssignment,
        performance: ambulance.performance
      }
    });
  } catch (error) {
    console.error('Track ambulance error:', error);
    res.status(500).json({ message: 'Server error tracking ambulance' });
  }
});

// @route   GET /api/ambulance/performance
// @desc    Get ambulance performance statistics
// @access  Private
router.get('/performance', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const performanceStats = await Ambulance.aggregate([
      {
        $project: {
          vehicleNumber: 1,
          driverName: 1,
          totalTrips: '$performance.totalTrips',
          averageResponseTime: '$performance.averageResponseTime',
          rating: '$performance.rating',
          totalRating: '$performance.totalRating',
          ratingCount: '$performance.ratingCount'
        }
      },
      {
        $sort: { rating: -1, totalTrips: -1 }
      }
    ]);

    const overallStats = await Ambulance.aggregate([
      {
        $group: {
          _id: null,
          totalAmbulances: { $sum: 1 },
          averageRating: { $avg: '$performance.rating' },
          totalTrips: { $sum: '$performance.totalTrips' },
          averageResponseTime: { $avg: '$performance.averageResponseTime' }
        }
      }
    ]);

    res.json({
      period,
      performanceStats,
      overallStats: overallStats[0] || {
        totalAmbulances: 0,
        averageRating: 0,
        totalTrips: 0,
        averageResponseTime: 0
      }
    });
  } catch (error) {
    console.error('Get ambulance performance error:', error);
    res.status(500).json({ message: 'Server error fetching ambulance performance' });
  }
});

// @route   POST /api/ambulance/:id/report-issue
// @desc    Report ambulance issue
// @access  Private
router.post('/:id/report-issue', [
  body('description').notEmpty().withMessage('Issue description is required'),
  body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity level')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const ambulanceId = req.params.id;
    const { description, severity } = req.body;

    const ambulance = await Ambulance.findById(ambulanceId);
    if (!ambulance) {
      return res.status(404).json({ message: 'Ambulance not found' });
    }

    // Add issue to maintenance record
    ambulance.maintenance.issues.push({
      description,
      severity,
      reportedAt: new Date()
    });

    // Update ambulance status if critical issue
    if (severity === 'critical') {
      ambulance.status = 'maintenance';
    }

    await ambulance.save();

    // Emit real-time alert
    req.io.emit('ambulance-issue-reported', {
      ambulanceId: ambulance._id,
      vehicleNumber: ambulance.vehicleNumber,
      issue: { description, severity },
      timestamp: new Date()
    });

    res.json({
      message: 'Issue reported successfully',
      issue: {
        description,
        severity,
        reportedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Report ambulance issue error:', error);
    res.status(500).json({ message: 'Server error reporting issue' });
  }
});

// Helper function to calculate estimated wait time
function calculateEstimatedWaitTime(ambulance, pickupLocation) {
  const distance = ambulance.calculateDistance(
    pickupLocation.latitude,
    pickupLocation.longitude
  );
  
  // Assume average speed of 30 km/h in city traffic
  const averageSpeed = 30; // km/h
  const timeInHours = distance / averageSpeed;
  const timeInMinutes = Math.round(timeInHours * 60);
  
  return Math.max(5, timeInMinutes); // Minimum 5 minutes
}

module.exports = router;
