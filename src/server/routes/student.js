const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireStudent } = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Ambulance = require('../models/Ambulance');
const User = require('../models/User');

const router = express.Router();

// Apply authentication and student role check to all routes
router.use(authenticateToken);
router.use(requireStudent);

// @route   GET /api/student/dashboard
// @desc    Get student dashboard data
// @access  Private (Student)
router.get('/dashboard', async (req, res) => {
  try {
    const studentId = req.user._id;

    // Get current doctor on duty
    const doctorOnDuty = await Doctor.findOne({ isOnDuty: true })
      .select('name specialization currentPatientCount currentQueueNumber averageConsultationTime');

    // Get student's current appointments
    const currentAppointments = await Appointment.find({
      student: studentId,
      status: { $in: ['scheduled', 'confirmed', 'in-progress'] }
    })
    .populate('doctor', 'name specialization')
    .sort({ appointmentDate: 1, appointmentTime: 1 });

    // Get student's appointment history
    const appointmentHistory = await Appointment.find({
      student: studentId,
      status: 'completed'
    })
    .populate('doctor', 'name specialization')
    .sort({ appointmentDate: -1 })
    .limit(5);

    // Simplified available slots - just return basic info
    const availableSlots = [];

    // Simplified queue status
    const queueStatus = [];

    res.json({
      doctorOnDuty,
      currentAppointments,
      appointmentHistory,
      availableSlots,
      queueStatus,
      studentInfo: {
        name: req.user.name,
        studentId: req.user.studentId,
        department: req.user.department,
        bloodGroup: req.user.bloodGroup
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error loading dashboard' });
  }
});

// @route   POST /api/student/book-appointment
// @desc    Book a new appointment
// @access  Private (Student)
router.post('/book-appointment', [
  body('doctorId').isMongoId().withMessage('Valid doctor ID is required'),
  body('appointmentDate').isISO8601().withMessage('Valid appointment date is required'),
  body('appointmentTime').notEmpty().withMessage('Appointment time is required'),
  body('symptoms').notEmpty().withMessage('Symptoms description is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { doctorId, appointmentDate, appointmentTime, symptoms, isEmergency = false } = req.body;
    const studentId = req.user._id;

    // Check if doctor exists and is available
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Check if appointment date is in the future
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    if (appointmentDateTime <= new Date()) {
      return res.status(400).json({ message: 'Appointment must be scheduled for future date and time' });
    }

    // Check if doctor is available at the requested time
    const dayOfWeek = appointmentDateTime.toLocaleDateString('en-US', { weekday: 'lowercase' });
    if (!doctor.isAvailableAt(dayOfWeek, appointmentTime)) {
      return res.status(400).json({ message: 'Doctor is not available at the requested time' });
    }

    // Check for existing appointment at the same time
    const existingAppointment = await Appointment.findOne({
      doctor: doctorId,
      appointmentDate: appointmentDateTime,
      appointmentTime,
      status: { $in: ['scheduled', 'confirmed', 'in-progress'] }
    });

    if (existingAppointment) {
      return res.status(400).json({ message: 'Time slot is already booked' });
    }

    // Get next queue number
    const lastAppointment = await Appointment.findOne({
      doctor: doctorId,
      appointmentDate: appointmentDateTime
    }).sort({ queueNumber: -1 });

    const queueNumber = lastAppointment ? lastAppointment.queueNumber + 1 : 1;

    // Calculate priority based on symptoms (AI integration will be added later)
    const priority = isEmergency ? 10 : calculatePriority(symptoms);

    // Create appointment
    const appointment = new Appointment({
      student: studentId,
      doctor: doctorId,
      appointmentDate: appointmentDateTime,
      appointmentTime,
      symptoms,
      priority,
      queueNumber,
      isEmergency
    });

    await appointment.save();

    // Update doctor's current patient count
    doctor.currentPatientCount += 1;
    await doctor.save();

    // Populate appointment with doctor details
    await appointment.populate('doctor', 'name specialization');

    // Emit real-time update
    req.io.emit('appointment-booked', {
      appointment: appointment,
      doctorId: doctorId
    });

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment
    });
  } catch (error) {
    console.error('Appointment booking error:', error);
    res.status(500).json({ message: 'Server error booking appointment' });
  }
});

// @route   GET /api/student/appointments
// @desc    Get student's appointments
// @access  Private (Student)
router.get('/appointments', async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const studentId = req.user._id;

    const query = { student: studentId };
    if (status) {
      query.status = status;
    }

    const appointments = await Appointment.find(query)
      .populate('doctor', 'name specialization')
      .sort({ appointmentDate: -1, appointmentTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Appointment.countDocuments(query);

    res.json({
      appointments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ message: 'Server error fetching appointments' });
  }
});

// @route   PUT /api/student/appointments/:id/cancel
// @desc    Cancel an appointment
// @access  Private (Student)
router.put('/appointments/:id/cancel', async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const studentId = req.user._id;

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      student: studentId
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot cancel completed or already cancelled appointment' });
    }

    // Check if appointment is within 2 hours (cannot cancel)
    const appointmentDateTime = new Date(`${appointment.appointmentDate.toISOString().split('T')[0]}T${appointment.appointmentTime}`);
    const timeDiff = appointmentDateTime - new Date();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff < 2) {
      return res.status(400).json({ message: 'Cannot cancel appointment within 2 hours of scheduled time' });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    // Update doctor's patient count
    const doctor = await Doctor.findById(appointment.doctor);
    if (doctor) {
      doctor.currentPatientCount = Math.max(0, doctor.currentPatientCount - 1);
      await doctor.save();
    }

    res.json({ message: 'Appointment cancelled successfully' });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ message: 'Server error cancelling appointment' });
  }
});

// @route   POST /api/student/book-ambulance
// @desc    Book an ambulance
// @access  Private (Student)
router.post('/book-ambulance', [
  body('symptoms').notEmpty().withMessage('Symptoms description is required'),
  body('pickupLocation').notEmpty().withMessage('Pickup location is required'),
  body('destination').optional().notEmpty().withMessage('Destination is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { symptoms, pickupLocation, destination, isEmergency = false } = req.body;
    const studentId = req.user._id;

    // Find nearest available ambulance
    const nearestAmbulance = await Ambulance.findNearestAvailable(
      pickupLocation.latitude,
      pickupLocation.longitude
    );

    if (nearestAmbulance.length === 0) {
      return res.status(400).json({ message: 'No ambulances available at the moment' });
    }

    const ambulance = nearestAmbulance[0];

    // Calculate priority based on symptoms
    const priority = isEmergency ? 10 : calculatePriority(symptoms);

    // Assign ambulance to student
    await ambulance.assignToStudent(studentId, pickupLocation, destination);

    // Create appointment record for ambulance service
    const appointment = new Appointment({
      student: studentId,
      doctor: null, // Will be assigned when ambulance arrives
      appointmentDate: new Date(),
      appointmentTime: new Date().toTimeString().slice(0, 5),
      symptoms,
      priority,
      queueNumber: 1,
      isEmergency: true,
      status: 'scheduled'
    });

    await appointment.save();

    // Emit real-time update
    req.io.emit('ambulance-assigned', {
      studentId,
      ambulanceId: ambulance._id,
      estimatedArrival: ambulance.currentAssignment.estimatedArrival
    });

    res.status(201).json({
      message: 'Ambulance booked successfully',
      ambulance: {
        vehicleNumber: ambulance.vehicleNumber,
        driverName: ambulance.driverName,
        driverPhone: ambulance.driverPhone,
        estimatedArrival: ambulance.currentAssignment.estimatedArrival
      },
      appointment
    });
  } catch (error) {
    console.error('Ambulance booking error:', error);
    res.status(500).json({ message: 'Server error booking ambulance' });
  }
});

// @route   POST /api/student/emergency-sos
// @desc    Send emergency SOS alert
// @access  Private (Student)
router.post('/emergency-sos', [
  body('symptoms').notEmpty().withMessage('Symptoms description is required'),
  body('location').notEmpty().withMessage('Current location is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { symptoms, location } = req.body;
    const studentId = req.user._id;

    // Create high-priority emergency appointment
    const appointment = new Appointment({
      student: studentId,
      appointmentDate: new Date(),
      appointmentTime: new Date().toTimeString().slice(0, 5),
      symptoms,
      priority: 10, // Highest priority
      queueNumber: 0, // Emergency queue
      isEmergency: true,
      status: 'scheduled',
      emergencyReason: 'SOS Alert'
    });

    await appointment.save();

    // Find and assign nearest ambulance immediately
    const nearestAmbulance = await Ambulance.findNearestAvailable(
      location.latitude,
      location.longitude,
      20 // Extended search radius for emergency
    );

    if (nearestAmbulance.length > 0) {
      const ambulance = nearestAmbulance[0];
      await ambulance.assignToStudent(studentId, location, {
        latitude: 0, // Will be updated when destination is known
        longitude: 0,
        address: 'Emergency pickup'
      });
    }

    // Emit emergency alert to all connected admin users
    req.io.emit('emergency-sos', {
      studentId,
      studentName: req.user.name,
      symptoms,
      location,
      timestamp: new Date(),
      appointmentId: appointment._id
    });

    res.status(201).json({
      message: 'Emergency SOS sent successfully',
      appointment
    });
  } catch (error) {
    console.error('Emergency SOS error:', error);
    res.status(500).json({ message: 'Server error sending emergency SOS' });
  }
});

// @route   GET /api/student/available-slots/:doctorId
// @desc    Get available time slots for a doctor on a specific date
// @access  Private (Student)
router.get('/available-slots/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required' });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const daySchedule = doctor.availability[dayOfWeek];

    if (!daySchedule.isAvailable) {
      return res.json([]);
    }

    // Generate time slots for the day
    const slots = [];
    const start = new Date(`${date}T${daySchedule.startTime}`);
    const end = new Date(`${date}T${daySchedule.endTime}`);
    const slotDuration = 30; // 30 minutes per slot
    const current = new Date(start);

    while (current < end) {
      const timeString = current.toTimeString().slice(0, 5);
      
      // Check if slot is available
      const existingAppointment = await Appointment.findOne({
        doctor: doctorId,
        appointmentDate: appointmentDate,
        appointmentTime: timeString,
        status: { $in: ['scheduled', 'confirmed', 'in-progress'] }
      });
      
      if (!existingAppointment) {
        slots.push(timeString);
      }
      
      current.setMinutes(current.getMinutes() + slotDuration);
    }

    res.json(slots);
  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({ message: 'Server error fetching available slots' });
  }
});

// @route   GET /api/student/prescriptions
// @desc    Get student's prescription history
// @access  Private (Student)
router.get('/prescriptions', async (req, res) => {
  try {
    const studentId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const appointments = await Appointment.find({
      student: studentId,
      status: 'completed',
      'prescription.medications': { $exists: true, $not: { $size: 0 } }
    })
    .populate('doctor', 'name specialization')
    .select('appointmentDate prescription diagnosis treatment')
    .sort({ appointmentDate: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Appointment.countDocuments({
      student: studentId,
      status: 'completed',
      'prescription.medications': { $exists: true, $not: { $size: 0 } }
    });

    res.json({
      prescriptions: appointments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get prescriptions error:', error);
    res.status(500).json({ message: 'Server error fetching prescriptions' });
  }
});

// @route   POST /api/student/upload-prescription
// @desc    Upload prescription document
// @access  Private (Student)
router.post('/upload-prescription', async (req, res) => {
  try {
    // This would typically handle file upload using multer
    // For now, we'll just return a success message
    res.json({ message: 'Prescription upload functionality will be implemented with file handling' });
  } catch (error) {
    console.error('Prescription upload error:', error);
    res.status(500).json({ message: 'Server error uploading prescription' });
  }
});

// Helper functions
async function getAvailableTimeSlots() {
  const doctors = await Doctor.find({ isActive: true });
  const slots = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' });

    for (const doctor of doctors) {
      const daySchedule = doctor.availability[dayOfWeek];
      if (daySchedule.isAvailable) {
        slots.push({
          date: date.toISOString().split('T')[0],
          doctorId: doctor._id,
          doctorName: doctor.name,
          specialization: doctor.specialization,
          startTime: daySchedule.startTime,
          endTime: daySchedule.endTime,
          availableSlots: await getTimeSlotsForDay(doctor, date, daySchedule)
        });
      }
    }
  }

  return slots;
}

async function getTimeSlotsForDay(doctor, date, daySchedule) {
  const slots = [];
  const start = new Date(`${date.toISOString().split('T')[0]}T${daySchedule.startTime}`);
  const end = new Date(`${date.toISOString().split('T')[0]}T${daySchedule.endTime}`);
  
  const slotDuration = 30; // 30 minutes per slot
  const current = new Date(start);
  
  while (current < end) {
    const timeString = current.toTimeString().slice(0, 5);
    
    // Check if slot is available
    const existingAppointment = await Appointment.findOne({
      doctor: doctor._id,
      appointmentDate: date,
      appointmentTime: timeString,
      status: { $in: ['scheduled', 'confirmed', 'in-progress'] }
    });
    
    if (!existingAppointment) {
      slots.push(timeString);
    }
    
    current.setMinutes(current.getMinutes() + slotDuration);
  }
  
  return slots;
}

async function getQueueStatus() {
  const doctors = await Doctor.find({ isOnDuty: true });
  const queueStatus = [];

  for (const doctor of doctors) {
    const appointments = await Appointment.find({
      doctor: doctor._id,
      status: { $in: ['scheduled', 'confirmed', 'in-progress'] }
    }).sort({ priority: -1, queueNumber: 1 });

    queueStatus.push({
      doctorId: doctor._id,
      doctorName: doctor.name,
      currentQueue: appointments.length,
      averageWaitTime: doctor.averageConsultationTime * appointments.length,
      nextInQueue: appointments[0] ? appointments[0].queueNumber : null
    });
  }

  return queueStatus;
}

function calculatePriority(symptoms) {
  // Basic priority calculation - will be enhanced with AI
  const emergencyKeywords = ['emergency', 'urgent', 'severe', 'critical', 'bleeding', 'unconscious'];
  const highPriorityKeywords = ['pain', 'fever', 'nausea', 'dizziness'];
  
  const symptomsLower = symptoms.toLowerCase();
  
  if (emergencyKeywords.some(keyword => symptomsLower.includes(keyword))) {
    return 9;
  } else if (highPriorityKeywords.some(keyword => symptomsLower.includes(keyword))) {
    return 7;
  } else {
    return 5;
  }
}

module.exports = router;
