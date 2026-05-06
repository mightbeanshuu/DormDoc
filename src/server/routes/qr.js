const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const qrcode = require('qrcode');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// @route   POST /api/qr/scan
// @desc    Scan QR code and process check-in
// @access  Private
router.post('/scan', [
  body('qrData').notEmpty().withMessage('QR code data is required'),
  body('scanType').isIn(['check-in', 'ambulance-pickup', 'appointment-verification']).withMessage('Invalid scan type'),
  body('location').optional().isObject().withMessage('Location must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { qrData, scanType, location, additionalInfo = {} } = req.body;
    const scannerId = req.user._id; // Admin or staff member scanning

    // Parse QR code data
    let studentData;
    try {
      studentData = JSON.parse(qrData);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid QR code format' });
    }

    // Find student by student ID
    const student = await User.findOne({ 
      studentId: studentData.studentId,
      isActive: true 
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found or inactive' });
    }

    // Process based on scan type
    let result;
    switch (scanType) {
      case 'check-in':
        result = await processCheckIn(student, scannerId, location, additionalInfo);
        break;
      case 'ambulance-pickup':
        result = await processAmbulancePickup(student, scannerId, location, additionalInfo);
        break;
      case 'appointment-verification':
        result = await processAppointmentVerification(student, scannerId, additionalInfo);
        break;
      default:
        return res.status(400).json({ message: 'Invalid scan type' });
    }

    // Emit real-time update
    req.io.emit('qr-scan-processed', {
      scanType,
      studentId: student._id,
      studentName: student.name,
      timestamp: new Date(),
      result
    });

    res.json({
      message: 'QR code processed successfully',
      student: {
        name: student.name,
        studentId: student.studentId,
        department: student.department,
        bloodGroup: student.bloodGroup
      },
      result
    });
  } catch (error) {
    console.error('QR scan processing error:', error);
    res.status(500).json({ message: 'Server error processing QR scan' });
  }
});

// @route   GET /api/qr/generate/:studentId
// @desc    Generate QR code for student
// @access  Private
router.get('/generate/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await User.findOne({ 
      studentId: studentId,
      isActive: true 
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Generate QR code data
    const qrData = student.generateQRCode();
    
    // Generate QR code image
    const qrCodeImage = await qrcode.toDataURL(qrData, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({
      qrData,
      qrCodeImage,
      student: {
        name: student.name,
        studentId: student.studentId,
        department: student.department
      }
    });
  } catch (error) {
    console.error('QR code generation error:', error);
    res.status(500).json({ message: 'Server error generating QR code' });
  }
});

// @route   GET /api/qr/scan-history
// @desc    Get QR scan history
// @access  Private
router.get('/scan-history', async (req, res) => {
  try {
    const { studentId, scanType, page = 1, limit = 10 } = req.query;

    // This would typically be stored in a separate QRScanLog model
    // For now, we'll return a placeholder response
    const scanHistory = {
      scans: [],
      totalPages: 0,
      currentPage: page,
      total: 0
    };

    res.json(scanHistory);
  } catch (error) {
    console.error('Get scan history error:', error);
    res.status(500).json({ message: 'Server error fetching scan history' });
  }
});

// @route   POST /api/qr/bulk-scan
// @desc    Process multiple QR scans
// @access  Private
router.post('/bulk-scan', [
  body('scans').isArray().withMessage('Scans must be an array'),
  body('scans.*.qrData').notEmpty().withMessage('QR data is required for each scan'),
  body('scans.*.scanType').isIn(['check-in', 'ambulance-pickup', 'appointment-verification']).withMessage('Invalid scan type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { scans } = req.body;
    const results = [];
    const scanErrors = [];

    for (let i = 0; i < scans.length; i++) {
      try {
        const scan = scans[i];
        const { qrData, scanType, location, additionalInfo = {} } = scan;

        // Parse QR code data
        let studentData;
        try {
          studentData = JSON.parse(qrData);
        } catch (error) {
          scanErrors.push({
            index: i,
            error: 'Invalid QR code format',
            qrData
          });
          continue;
        }

        // Find student
        const student = await User.findOne({ 
          studentId: studentData.studentId,
          isActive: true 
        });

        if (!student) {
          scanErrors.push({
            index: i,
            error: 'Student not found',
            studentId: studentData.studentId
          });
          continue;
        }

        // Process scan
        let result;
        switch (scanType) {
          case 'check-in':
            result = await processCheckIn(student, req.user._id, location, additionalInfo);
            break;
          case 'ambulance-pickup':
            result = await processAmbulancePickup(student, req.user._id, location, additionalInfo);
            break;
          case 'appointment-verification':
            result = await processAppointmentVerification(student, req.user._id, additionalInfo);
            break;
        }

        results.push({
          index: i,
          student: {
            name: student.name,
            studentId: student.studentId
          },
          result
        });
        } catch (error) {
          scanErrors.push({
            index: i,
            error: error.message,
            qrData: scans[i].qrData
          });
        }
    }

    // Emit bulk scan completion
    req.io.emit('bulk-qr-scan-completed', {
      totalScans: scans.length,
      successfulScans: results.length,
      failedScans: errors.length,
      timestamp: new Date()
    });

    res.json({
      message: 'Bulk scan processing completed',
      results,
      errors: scanErrors,
      summary: {
        total: scans.length,
        successful: results.length,
        failed: scanErrors.length
      }
    });
  } catch (error) {
    console.error('Bulk QR scan error:', error);
    res.status(500).json({ message: 'Server error processing bulk scans' });
  }
});

// Helper functions

async function processCheckIn(student, scannerId, location, additionalInfo) {
  try {
    // Find student's current appointment
    const appointment = await Appointment.findOne({
      student: student._id,
      status: { $in: ['scheduled', 'confirmed'] }
    }).populate('doctor', 'name specialization');

    if (!appointment) {
      return {
        success: false,
        message: 'No active appointment found for this student',
        action: 'Schedule an appointment first'
      };
    }

    // Update appointment status to in-progress
    appointment.status = 'in-progress';
    appointment.checkInTime = new Date();
    await appointment.save();

    // Update doctor's current patient count
    if (appointment.doctor) {
      const doctor = await Doctor.findById(appointment.doctor._id);
      if (doctor) {
        doctor.currentPatientCount += 1;
        await doctor.save();
      }
    }

    // Update system metrics (increment students in clinic)
    // This would typically update a system metrics collection

    return {
      success: true,
      message: 'Student checked in successfully',
      appointment: {
        id: appointment._id,
        doctor: appointment.doctor ? appointment.doctor.name : 'TBD',
        queueNumber: appointment.queueNumber,
        estimatedWaitTime: appointment.estimatedWaitTime
      },
      action: 'Student added to queue'
    };
  } catch (error) {
    console.error('Check-in processing error:', error);
    return {
      success: false,
      message: 'Error processing check-in',
      action: 'Try again or contact support'
    };
  }
}

async function processAmbulancePickup(student, scannerId, location, additionalInfo) {
  try {
    // Find student's ambulance assignment
    const appointment = await Appointment.findOne({
      student: student._id,
      isEmergency: true,
      status: { $in: ['scheduled', 'confirmed'] }
    });

    if (!appointment) {
      return {
        success: false,
        message: 'No ambulance assignment found for this student',
        action: 'Book an ambulance first'
      };
    }

    // Update appointment status
    appointment.status = 'in-progress';
    appointment.checkInTime = new Date();
    await appointment.save();

    // Update ambulance status (this would typically be done by the ambulance driver)
    // The ambulance status would be updated to 'in-use' and location tracked

    return {
      success: true,
      message: 'Ambulance pickup confirmed',
      appointment: {
        id: appointment._id,
        symptoms: appointment.symptoms,
        priority: appointment.priority
      },
      action: 'Ambulance en route to destination'
    };
  } catch (error) {
    console.error('Ambulance pickup processing error:', error);
    return {
      success: false,
      message: 'Error processing ambulance pickup',
      action: 'Contact ambulance driver'
    };
  }
}

async function processAppointmentVerification(student, scannerId, additionalInfo) {
  try {
    // Find student's appointment
    const appointment = await Appointment.findOne({
      student: student._id,
      status: { $in: ['scheduled', 'confirmed', 'in-progress'] }
    }).populate('doctor', 'name specialization');

    if (!appointment) {
      return {
        success: false,
        message: 'No active appointment found',
        action: 'Schedule an appointment'
      };
    }

    // Verify appointment details
    const verificationResult = {
      student: {
        name: student.name,
        studentId: student.studentId,
        department: student.department,
        bloodGroup: student.bloodGroup
      },
      appointment: {
        id: appointment._id,
        date: appointment.appointmentDate,
        time: appointment.appointmentTime,
        doctor: appointment.doctor ? appointment.doctor.name : 'TBD',
        symptoms: appointment.symptoms,
        priority: appointment.priority,
        status: appointment.status
      },
      medicalInfo: {
        allergies: student.allergies,
        currentMedications: student.currentMedications,
        emergencyContact: student.emergencyContact
      }
    };

    return {
      success: true,
      message: 'Appointment verified successfully',
      verification: verificationResult,
      action: 'Proceed with consultation'
    };
  } catch (error) {
    console.error('Appointment verification error:', error);
    return {
      success: false,
      message: 'Error verifying appointment',
      action: 'Contact support'
    };
  }
}

module.exports = router;
