const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const Doctor = require('../models/Doctor');
const Ambulance = require('../models/Ambulance');
const Appointment = require('../models/Appointment');
const User = require('../models/User');

const router = express.Router();

// Apply authentication and admin role check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard data
// @access  Private (Admin)
router.get('/dashboard', async (req, res) => {
  try {
    // Get all doctors with their current status
    const doctors = await Doctor.find({ isActive: true })
      .select('name specialization isOnDuty currentPatientCount currentQueueNumber averageConsultationTime rating');

    // Get ambulance status
    const ambulances = await Ambulance.find({ isActive: true })
      .select('vehicleNumber driverName status location currentAssignment performance');

    // Get current student queue
    const studentQueue = await Appointment.find({
      status: { $in: ['scheduled', 'confirmed', 'in-progress'] }
    })
    .populate('student', 'name studentId department')
    .populate('doctor', 'name specialization')
    .sort({ priority: -1, queueNumber: 1 });

    // Get today's statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStats = await Appointment.aggregate([
      {
        $match: {
          appointmentDate: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get emergency alerts
    const emergencyAlerts = await Appointment.find({
      isEmergency: true,
      status: { $in: ['scheduled', 'confirmed', 'in-progress'] }
    })
    .populate('student', 'name studentId phone emergencyContact')
    .sort({ priority: -1, appointmentDate: 1 });

    // Get system metrics
    const systemMetrics = await getSystemMetrics();

    res.json({
      doctors,
      ambulances,
      studentQueue,
      todayStats,
      emergencyAlerts,
      systemMetrics
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ message: 'Server error loading admin dashboard' });
  }
});

// @route   GET /api/admin/doctors
// @desc    Get all doctors
// @access  Private (Admin)
router.get('/doctors', async (req, res) => {
  try {
    const doctors = await Doctor.find({ isActive: true })
      .sort({ name: 1 });

    res.json({ doctors });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({ message: 'Server error fetching doctors' });
  }
});

// @route   POST /api/admin/doctors
// @desc    Add a new doctor
// @access  Private (Admin)
router.post('/doctors', [
  body('name').notEmpty().withMessage('Doctor name is required'),
  body('specialization').notEmpty().withMessage('Specialization is required'),
  body('qualification').notEmpty().withMessage('Qualification is required'),
  body('experience').isNumeric().withMessage('Experience must be a number'),
  body('licenseNumber').notEmpty().withMessage('License number is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const doctor = new Doctor(req.body);
    await doctor.save();

    res.status(201).json({
      message: 'Doctor added successfully',
      doctor
    });
  } catch (error) {
    console.error('Add doctor error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Doctor with this email or license number already exists' });
    }
    res.status(500).json({ message: 'Server error adding doctor' });
  }
});

// @route   PUT /api/admin/doctors/:id
// @desc    Update doctor information
// @access  Private (Admin)
router.put('/doctors/:id', async (req, res) => {
  try {
    const doctorId = req.params.id;
    const updates = req.body;

    const doctor = await Doctor.findByIdAndUpdate(
      doctorId,
      updates,
      { new: true, runValidators: true }
    );

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json({
      message: 'Doctor updated successfully',
      doctor
    });
  } catch (error) {
    console.error('Update doctor error:', error);
    res.status(500).json({ message: 'Server error updating doctor' });
  }
});

// @route   PUT /api/admin/doctors/:id/toggle-duty
// @desc    Toggle doctor duty status
// @access  Private (Admin)
router.put('/doctors/:id/toggle-duty', async (req, res) => {
  try {
    const doctorId = req.params.id;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    doctor.isOnDuty = !doctor.isOnDuty;
    if (doctor.isOnDuty) {
      doctor.currentQueueNumber = 0;
    } else {
      doctor.currentPatientCount = 0;
    }

    await doctor.save();

    // Emit real-time update
    req.io.emit('doctor-duty-changed', {
      doctorId: doctor._id,
      isOnDuty: doctor.isOnDuty,
      doctorName: doctor.name
    });

    res.json({
      message: `Doctor ${doctor.isOnDuty ? 'started' : 'ended'} duty`,
      doctor
    });
  } catch (error) {
    console.error('Toggle doctor duty error:', error);
    res.status(500).json({ message: 'Server error toggling doctor duty' });
  }
});

// @route   GET /api/admin/ambulances
// @desc    Get all ambulances
// @access  Private (Admin)
router.get('/ambulances', async (req, res) => {
  try {
    const ambulances = await Ambulance.find({ isActive: true })
      .sort({ vehicleNumber: 1 });

    res.json({ ambulances });
  } catch (error) {
    console.error('Get ambulances error:', error);
    res.status(500).json({ message: 'Server error fetching ambulances' });
  }
});

// @route   POST /api/admin/ambulances
// @desc    Add a new ambulance
// @access  Private (Admin)
router.post('/ambulances', [
  body('vehicleNumber').notEmpty().withMessage('Vehicle number is required'),
  body('driverName').notEmpty().withMessage('Driver name is required'),
  body('driverPhone').notEmpty().withMessage('Driver phone is required'),
  body('driverLicense').notEmpty().withMessage('Driver license is required'),
  body('capacity').isNumeric().withMessage('Capacity must be a number'),
  body('location.latitude').isNumeric().withMessage('Latitude is required'),
  body('location.longitude').isNumeric().withMessage('Longitude is required'),
  body('location.address').notEmpty().withMessage('Address is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const ambulance = new Ambulance(req.body);
    await ambulance.save();

    res.status(201).json({
      message: 'Ambulance added successfully',
      ambulance
    });
  } catch (error) {
    console.error('Add ambulance error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Ambulance with this vehicle number or driver license already exists' });
    }
    res.status(500).json({ message: 'Server error adding ambulance' });
  }
});

// @route   PUT /api/admin/ambulances/:id/status
// @desc    Update ambulance status
// @access  Private (Admin)
router.put('/ambulances/:id/status', [
  body('status').isIn(['available', 'in-use', 'maintenance', 'out-of-service']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const ambulanceId = req.params.id;
    const { status } = req.body;

    const ambulance = await Ambulance.findById(ambulanceId);
    if (!ambulance) {
      return res.status(404).json({ message: 'Ambulance not found' });
    }

    ambulance.status = status;
    await ambulance.save();

    // Emit real-time update
    req.io.emit('ambulance-status-changed', {
      ambulanceId: ambulance._id,
      status: ambulance.status,
      vehicleNumber: ambulance.vehicleNumber
    });

    res.json({
      message: 'Ambulance status updated successfully',
      ambulance
    });
  } catch (error) {
    console.error('Update ambulance status error:', error);
    res.status(500).json({ message: 'Server error updating ambulance status' });
  }
});

// @route   GET /api/admin/queue
// @desc    Get current student queue
// @access  Private (Admin)
router.get('/queue', async (req, res) => {
  try {
    const { doctorId, status } = req.query;
    
    const query = {};
    if (doctorId) query.doctor = doctorId;
    if (status) query.status = status;

    const queue = await Appointment.find(query)
      .populate('student', 'name studentId department phone')
      .populate('doctor', 'name specialization')
      .sort({ priority: -1, queueNumber: 1 });

    res.json({ queue });
  } catch (error) {
    console.error('Get queue error:', error);
    res.status(500).json({ message: 'Server error fetching queue' });
  }
});

// @route   PUT /api/admin/queue/:id/status
// @desc    Update appointment status
// @access  Private (Admin)
router.put('/queue/:id/status', [
  body('status').isIn(['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const appointmentId = req.params.id;
    const { status, consultationNotes, prescription, diagnosis, treatment } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    appointment.status = status;
    if (consultationNotes) appointment.consultationNotes = consultationNotes;
    if (prescription) appointment.prescription = prescription;
    if (diagnosis) appointment.diagnosis = diagnosis;
    if (treatment) appointment.treatment = treatment;

    await appointment.updateStatus(status);

    // Emit real-time update
    req.io.emit('appointment-status-changed', {
      appointmentId: appointment._id,
      status: appointment.status,
      studentId: appointment.student
    });

    res.json({
      message: 'Appointment status updated successfully',
      appointment
    });
  } catch (error) {
    console.error('Update appointment status error:', error);
    res.status(500).json({ message: 'Server error updating appointment status' });
  }
});

// @route   GET /api/admin/analytics
// @desc    Get system analytics
// @access  Private (Admin)
router.get('/analytics', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '1d':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    // Get appointment statistics
    const appointmentStats = await Appointment.aggregate([
      {
        $match: {
          appointmentDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgWaitTime: { $avg: '$actualWaitTime' }
        }
      }
    ]);

    // Get doctor performance
    const doctorPerformance = await Appointment.aggregate([
      {
        $match: {
          appointmentDate: { $gte: startDate, $lte: endDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$doctor',
          totalAppointments: { $sum: 1 },
          avgConsultationTime: { $avg: '$consultationDuration' },
          avgRating: { $avg: '$feedback.rating' }
        }
      },
      {
        $lookup: {
          from: 'doctors',
          localField: '_id',
          foreignField: '_id',
          as: 'doctor'
        }
      },
      {
        $unwind: '$doctor'
      },
      {
        $project: {
          doctorName: '$doctor.name',
          specialization: '$doctor.specialization',
          totalAppointments: 1,
          avgConsultationTime: 1,
          avgRating: 1
        }
      }
    ]);

    // Get ambulance performance
    const ambulancePerformance = await Ambulance.aggregate([
      {
        $project: {
          vehicleNumber: 1,
          driverName: 1,
          totalTrips: '$performance.totalTrips',
          avgResponseTime: '$performance.averageResponseTime',
          rating: '$performance.rating'
        }
      }
    ]);

    // Get emergency statistics
    const emergencyStats = await Appointment.aggregate([
      {
        $match: {
          appointmentDate: { $gte: startDate, $lte: endDate },
          isEmergency: true
        }
      },
      {
        $group: {
          _id: null,
          totalEmergencies: { $sum: 1 },
          avgResponseTime: { $avg: '$actualWaitTime' }
        }
      }
    ]);

    res.json({
      period,
      appointmentStats,
      doctorPerformance,
      ambulancePerformance,
      emergencyStats: emergencyStats[0] || { totalEmergencies: 0, avgResponseTime: 0 }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Server error fetching analytics' });
  }
});

// @route   GET /api/admin/leave-requests
// @desc    Get pending leave requests
// @access  Private (Admin)
router.get('/leave-requests', async (req, res) => {
  try {
    const leaveRequests = await Appointment.find({
      'leaveRequest.requested': true,
      'leaveRequest.status': 'pending'
    })
    .populate('student', 'name studentId department year')
    .populate('doctor', 'name specialization')
    .sort({ appointmentDate: -1 });

    res.json({ leaveRequests });
  } catch (error) {
    console.error('Get leave requests error:', error);
    res.status(500).json({ message: 'Server error fetching leave requests' });
  }
});

// @route   PUT /api/admin/leave-requests/:id/approve
// @desc    Approve or reject leave request
// @access  Private (Admin)
router.put('/leave-requests/:id/approve', [
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('comments').optional().isString().withMessage('Comments must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const appointmentId = req.params.id;
    const { status, comments } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (!appointment.leaveRequest.requested) {
      return res.status(400).json({ message: 'No leave request found for this appointment' });
    }

    appointment.leaveRequest.status = status;
    appointment.leaveRequest.approvedBy = req.user.name;
    appointment.leaveRequest.approvedAt = new Date();
    if (comments) {
      appointment.leaveRequest.comments = comments;
    }

    await appointment.save();

    // Emit real-time update
    req.io.emit('leave-request-updated', {
      appointmentId: appointment._id,
      status: appointment.leaveRequest.status,
      studentId: appointment.student
    });

    res.json({
      message: `Leave request ${status} successfully`,
      appointment
    });
  } catch (error) {
    console.error('Update leave request error:', error);
    res.status(500).json({ message: 'Server error updating leave request' });
  }
});

// Helper function to get system metrics
async function getSystemMetrics() {
  const totalStudents = await User.countDocuments({ role: 'student', isActive: true });
  const totalDoctors = await Doctor.countDocuments({ isActive: true });
  const totalAmbulances = await Ambulance.countDocuments({ isActive: true });
  const activeAppointments = await Appointment.countDocuments({
    status: { $in: ['scheduled', 'confirmed', 'in-progress'] }
  });
  const todayAppointments = await Appointment.countDocuments({
    appointmentDate: {
      $gte: new Date().setHours(0, 0, 0, 0),
      $lt: new Date().setHours(23, 59, 59, 999)
    }
  });

  return {
    totalStudents,
    totalDoctors,
    totalAmbulances,
    activeAppointments,
    todayAppointments
  };
}

module.exports = router;
