const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const AmbulanceTrip = require('../models/AmbulanceTrip');
const Ambulance = require('../models/Ambulance');
const User = require('../models/User');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// @route   GET /api/admin/ambulance-trips
// @desc    Get all ambulance trips
// @access  Private (Admin only)
router.get('/admin/ambulance-trips', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const trips = await AmbulanceTrip.find()
      .populate('ambulance', 'vehicleNumber driverName driverPhone')
      .populate('student', 'name email studentId')
      .sort({ createdAt: -1 });

    res.json(trips);
  } catch (error) {
    console.error('Get ambulance trips error:', error);
    res.status(500).json({ message: 'Server error fetching ambulance trips' });
  }
});

// @route   POST /api/admin/ambulance-trips
// @desc    Create new ambulance trip
// @access  Private (Admin only)
router.post('/admin/ambulance-trips', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const {
      patientName,
      patientPhone,
      pickupLocation,
      destination,
      emergencyType,
      priority,
      ambulanceId,
      driverId,
      estimatedTime,
      notes
    } = req.body;

    if (!patientName || !pickupLocation || !destination || !ambulanceId) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const ambulance = await Ambulance.findById(ambulanceId);
    if (!ambulance) {
      return res.status(404).json({ message: 'Ambulance not found' });
    }

    const trip = new AmbulanceTrip({
      patientName,
      patientPhone,
      pickupLocation,
      destination,
      emergencyType,
      priority,
      ambulance: ambulanceId,
      driver: driverId,
      estimatedTime: estimatedTime ? parseInt(estimatedTime) : null,
      notes,
      status: 'pending',
      createdBy: req.user.id
    });

    await trip.save();
    await trip.populate('ambulance', 'vehicleNumber driverName driverPhone');
    await trip.populate('student', 'name email studentId');

    res.json(trip);
  } catch (error) {
    console.error('Create ambulance trip error:', error);
    res.status(500).json({ message: 'Server error creating ambulance trip' });
  }
});

// @route   PUT /api/admin/ambulance-trips/:id/status
// @desc    Update trip status
// @access  Private (Admin only)
router.put('/admin/ambulance-trips/:id/status', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { status, location, timestamp } = req.body;
    const trip = await AmbulanceTrip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    trip.status = status;
    if (location) {
      trip.currentLocation = location;
    }
    if (timestamp) {
      trip.lastUpdated = new Date(timestamp);
    } else {
      trip.lastUpdated = new Date();
    }

    // Add status history
    trip.statusHistory.push({
      status,
      timestamp: trip.lastUpdated,
      updatedBy: req.user.id
    });

    await trip.save();
    res.json(trip);
  } catch (error) {
    console.error('Update trip status error:', error);
    res.status(500).json({ message: 'Server error updating trip status' });
  }
});

// @route   PUT /api/admin/ambulance-trips/:id/complete
// @desc    Complete trip
// @access  Private (Admin only)
router.put('/admin/ambulance-trips/:id/complete', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { completionNotes, completedAt } = req.body;
    const trip = await AmbulanceTrip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    trip.status = 'completed';
    trip.completionNotes = completionNotes;
    trip.completedAt = completedAt ? new Date(completedAt) : new Date();
    trip.lastUpdated = new Date();

    // Calculate duration
    if (trip.createdAt) {
      trip.duration = Math.round((trip.completedAt - trip.createdAt) / (1000 * 60)); // in minutes
    }

    // Add status history
    trip.statusHistory.push({
      status: 'completed',
      timestamp: trip.completedAt,
      updatedBy: req.user.id
    });

    await trip.save();
    res.json(trip);
  } catch (error) {
    console.error('Complete trip error:', error);
    res.status(500).json({ message: 'Server error completing trip' });
  }
});

// @route   GET /api/admin/ambulance-trips/:id
// @desc    Get trip by ID
// @access  Private (Admin only)
router.get('/admin/ambulance-trips/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const trip = await AmbulanceTrip.findById(req.params.id)
      .populate('ambulance', 'vehicleNumber driverName driverPhone')
      .populate('student', 'name email studentId');

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    res.json(trip);
  } catch (error) {
    console.error('Get trip error:', error);
    res.status(500).json({ message: 'Server error fetching trip' });
  }
});

// @route   DELETE /api/admin/ambulance-trips/:id
// @desc    Delete trip
// @access  Private (Admin only)
router.delete('/admin/ambulance-trips/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const trip = await AmbulanceTrip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    await AmbulanceTrip.findByIdAndDelete(req.params.id);
    res.json({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Delete trip error:', error);
    res.status(500).json({ message: 'Server error deleting trip' });
  }
});

// @route   GET /api/admin/ambulances
// @desc    Get all ambulances
// @access  Private (Admin only)
router.get('/admin/ambulances', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const ambulances = await Ambulance.find({ isActive: true }).sort({ vehicleNumber: 1 });
    res.json(ambulances);
  } catch (error) {
    console.error('Get ambulances error:', error);
    res.status(500).json({ message: 'Server error fetching ambulances' });
  }
});

// @route   GET /api/admin/drivers
// @desc    Get all drivers
// @access  Private (Admin only)
router.get('/admin/drivers', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const drivers = await User.find({ role: 'driver', isActive: true }).sort({ name: 1 });
    res.json(drivers);
  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({ message: 'Server error fetching drivers' });
  }
});

// @route   GET /api/admin/ambulance-trips/active
// @desc    Get active trips
// @access  Private (Admin only)
router.get('/admin/ambulance-trips/active', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const activeTrips = await AmbulanceTrip.find({
      status: { $in: ['pending', 'dispatched', 'en-route', 'arrived'] }
    })
      .populate('ambulance', 'vehicleNumber driverName driverPhone')
      .populate('student', 'name email studentId')
      .sort({ createdAt: -1 });

    res.json(activeTrips);
  } catch (error) {
    console.error('Get active trips error:', error);
    res.status(500).json({ message: 'Server error fetching active trips' });
  }
});

// @route   GET /api/admin/ambulance-trips/completed
// @desc    Get completed trips
// @access  Private (Admin only)
router.get('/admin/ambulance-trips/completed', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const completedTrips = await AmbulanceTrip.find({ status: 'completed' })
      .populate('ambulance', 'vehicleNumber driverName driverPhone')
      .populate('student', 'name email studentId')
      .sort({ completedAt: -1 });

    res.json(completedTrips);
  } catch (error) {
    console.error('Get completed trips error:', error);
    res.status(500).json({ message: 'Server error fetching completed trips' });
  }
});

// @route   GET /api/admin/ambulance-trips/statistics
// @desc    Get trip statistics
// @access  Private (Admin only)
router.get('/admin/ambulance-trips/statistics', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

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

    const [
      totalTrips,
      completedTrips,
      activeTrips,
      averageDuration,
      highPriorityTrips
    ] = await Promise.all([
      AmbulanceTrip.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      AmbulanceTrip.countDocuments({
        status: 'completed',
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      AmbulanceTrip.countDocuments({
        status: { $in: ['pending', 'dispatched', 'en-route', 'arrived'] }
      }),
      AmbulanceTrip.aggregate([
        {
          $match: {
            status: 'completed',
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            averageDuration: { $avg: '$duration' }
          }
        }
      ]),
      AmbulanceTrip.countDocuments({
        priority: 'high',
        createdAt: { $gte: startDate, $lte: endDate }
      })
    ]);

    res.json({
      totalTrips,
      completedTrips,
      activeTrips,
      averageDuration: averageDuration[0]?.averageDuration || 0,
      highPriorityTrips,
      completionRate: totalTrips > 0 ? (completedTrips / totalTrips) * 100 : 0
    });
  } catch (error) {
    console.error('Get trip statistics error:', error);
    res.status(500).json({ message: 'Server error fetching trip statistics' });
  }
});

module.exports = router;
