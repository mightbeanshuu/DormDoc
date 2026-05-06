const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const axios = require('axios');
const nodemailer = require('nodemailer');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// @route   POST /api/erp/request-leave
// @desc    Request medical leave through ERP integration
// @access  Private
router.post('/request-leave', [
  body('appointmentId').isMongoId().withMessage('Valid appointment ID is required'),
  body('duration').isNumeric().withMessage('Duration must be a number'),
  body('reason').notEmpty().withMessage('Leave reason is required'),
  body('department').notEmpty().withMessage('Department is required'),
  body('year').notEmpty().withMessage('Year is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { appointmentId, duration, reason, department, year } = req.body;
    const studentId = req.user._id;

    // Find the appointment
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      student: studentId,
      status: 'completed'
    }).populate('doctor', 'name specialization');

    if (!appointment) {
      return res.status(404).json({ message: 'Completed appointment not found' });
    }

    // Check if leave request already exists
    if (appointment.leaveRequest.requested) {
      return res.status(400).json({ message: 'Leave request already submitted for this appointment' });
    }

    // Update appointment with leave request
    appointment.leaveRequest = {
      requested: true,
      duration: parseInt(duration),
      reason,
      status: 'pending',
      submittedAt: new Date()
    };

    await appointment.save();

    // Get HOD email for the department
    const hodEmail = await getHODEmail(department);

    // Send email notification to HOD
    await sendLeaveRequestEmail(hodEmail, {
      student: {
        name: req.user.name,
        studentId: req.user.studentId,
        department,
        year
      },
      appointment: {
        date: appointment.appointmentDate,
        doctor: appointment.doctor ? appointment.doctor.name : 'N/A',
        diagnosis: appointment.diagnosis,
        treatment: appointment.treatment
      },
      leaveRequest: {
        duration,
        reason,
        submittedAt: appointment.leaveRequest.submittedAt
      }
    });

    // Emit real-time update
    req.io.emit('leave-request-submitted', {
      studentId,
      appointmentId: appointment._id,
      duration,
      reason,
      timestamp: new Date()
    });

    res.json({
      message: 'Leave request submitted successfully',
      leaveRequest: {
        appointmentId: appointment._id,
        duration,
        reason,
        status: 'pending',
        submittedAt: appointment.leaveRequest.submittedAt
      }
    });
  } catch (error) {
    console.error('Leave request error:', error);
    res.status(500).json({ message: 'Server error submitting leave request' });
  }
});

// @route   GET /api/erp/leave-status
// @desc    Get leave request status
// @access  Private
router.get('/leave-status', async (req, res) => {
  try {
    const studentId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;

    let query = {
      student: studentId,
      'leaveRequest.requested': true
    };

    if (status) {
      query['leaveRequest.status'] = status;
    }

    const leaveRequests = await Appointment.find(query)
      .populate('doctor', 'name specialization')
      .select('appointmentDate leaveRequest diagnosis treatment')
      .sort({ 'leaveRequest.submittedAt': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Appointment.countDocuments(query);

    res.json({
      leaveRequests,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get leave status error:', error);
    res.status(500).json({ message: 'Server error fetching leave status' });
  }
});

// @route   PUT /api/erp/approve-leave
// @desc    Approve leave request (HOD action)
// @access  Private
router.put('/approve-leave', [
  body('appointmentId').isMongoId().withMessage('Valid appointment ID is required'),
  body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
  body('comments').optional().isString().withMessage('Comments must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { appointmentId, action, comments } = req.body;
    const approverId = req.user._id;

    const appointment = await Appointment.findById(appointmentId)
      .populate('student', 'name studentId email department year');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (!appointment.leaveRequest.requested) {
      return res.status(400).json({ message: 'No leave request found for this appointment' });
    }

    if (appointment.leaveRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Leave request has already been processed' });
    }

    // Update leave request status
    appointment.leaveRequest.status = action === 'approve' ? 'approved' : 'rejected';
    appointment.leaveRequest.approvedBy = req.user.name;
    appointment.leaveRequest.approvedAt = new Date();
    if (comments) {
      appointment.leaveRequest.comments = comments;
    }

    await appointment.save();

    // Send notification to student
    await sendLeaveDecisionEmail(appointment.student.email, {
      student: appointment.student,
      action,
      comments,
      approvedBy: req.user.name,
      approvedAt: appointment.leaveRequest.approvedAt
    });

    // Update ERP system if approved
    if (action === 'approve') {
      await updateERPSystem(appointment.student, appointment.leaveRequest);
    }

    // Emit real-time update
    req.io.emit('leave-request-processed', {
      studentId: appointment.student._id,
      appointmentId: appointment._id,
      action,
      approvedBy: req.user.name,
      timestamp: new Date()
    });

    res.json({
      message: `Leave request ${action}d successfully`,
      leaveRequest: {
        appointmentId: appointment._id,
        status: appointment.leaveRequest.status,
        approvedBy: appointment.leaveRequest.approvedBy,
        approvedAt: appointment.leaveRequest.approvedAt,
        comments: appointment.leaveRequest.comments
      }
    });
  } catch (error) {
    console.error('Approve leave error:', error);
    res.status(500).json({ message: 'Server error processing leave request' });
  }
});

// @route   GET /api/erp/attendance-report
// @desc    Get attendance report for ERP
// @access  Private
router.get('/attendance-report', async (req, res) => {
  try {
    const { studentId, startDate, endDate } = req.query;
    const student = studentId ? await User.findById(studentId) : req.user;

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const attendanceReport = await generateAttendanceReport(student._id, start, end);

    res.json({
      student: {
        name: student.name,
        studentId: student.studentId,
        department: student.department,
        year: student.year
      },
      period: { startDate: start, endDate: end },
      report: attendanceReport
    });
  } catch (error) {
    console.error('Get attendance report error:', error);
    res.status(500).json({ message: 'Server error generating attendance report' });
  }
});

// @route   POST /api/erp/sync-data
// @desc    Sync data with ERP system
// @access  Private
router.post('/sync-data', async (req, res) => {
  try {
    const { syncType = 'all' } = req.body;

    const syncResults = {};

    if (syncType === 'all' || syncType === 'students') {
      syncResults.students = await syncStudentData();
    }

    if (syncType === 'all' || syncType === 'attendance') {
      syncResults.attendance = await syncAttendanceData();
    }

    if (syncType === 'all' || syncType === 'leave-requests') {
      syncResults.leaveRequests = await syncLeaveRequests();
    }

    res.json({
      message: 'Data sync completed successfully',
      syncResults,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('ERP sync error:', error);
    res.status(500).json({ message: 'Server error syncing data with ERP' });
  }
});

// Helper functions

async function getHODEmail(department) {
  // This would typically fetch from a departments collection or ERP system
  const departmentHODs = {
    'Computer Science': 'hod.cs@college.edu',
    'Electronics': 'hod.electronics@college.edu',
    'Mechanical': 'hod.mechanical@college.edu',
    'Civil': 'hod.civil@college.edu',
    'Electrical': 'hod.electrical@college.edu'
  };

  return departmentHODs[department] || 'hod@college.edu';
}

async function sendLeaveRequestEmail(hodEmail, data) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: hodEmail,
      subject: `Medical Leave Request - ${data.student.name} (${data.student.studentId})`,
      html: `
        <h2>Medical Leave Request</h2>
        <p><strong>Student Details:</strong></p>
        <ul>
          <li>Name: ${data.student.name}</li>
          <li>Student ID: ${data.student.studentId}</li>
          <li>Department: ${data.student.department}</li>
          <li>Year: ${data.student.year}</li>
        </ul>
        
        <p><strong>Medical Details:</strong></p>
        <ul>
          <li>Appointment Date: ${data.appointment.date}</li>
          <li>Doctor: ${data.appointment.doctor}</li>
          <li>Diagnosis: ${data.appointment.diagnosis || 'Not provided'}</li>
          <li>Treatment: ${data.appointment.treatment || 'Not provided'}</li>
        </ul>
        
        <p><strong>Leave Request:</strong></p>
        <ul>
          <li>Duration: ${data.leaveRequest.duration} days</li>
          <li>Reason: ${data.leaveRequest.reason}</li>
          <li>Submitted At: ${data.leaveRequest.submittedAt}</li>
        </ul>
        
        <p>Please review and approve/reject this leave request through the admin portal.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Leave request email sent successfully');
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
}

async function sendLeaveDecisionEmail(studentEmail, data) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: studentEmail,
      subject: `Medical Leave Request ${data.action === 'approve' ? 'Approved' : 'Rejected'}`,
      html: `
        <h2>Medical Leave Request ${data.action === 'approve' ? 'Approved' : 'Rejected'}</h2>
        <p>Dear ${data.student.name},</p>
        
        <p>Your medical leave request has been <strong>${data.action}d</strong> by ${data.approvedBy}.</p>
        
        ${data.comments ? `<p><strong>Comments:</strong> ${data.comments}</p>` : ''}
        
        <p>Approved/Rejected on: ${data.approvedAt}</p>
        
        <p>If you have any questions, please contact your department office.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Leave decision email sent successfully');
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
}

async function updateERPSystem(student, leaveRequest) {
  try {
    // This would integrate with the actual ERP system
    const erpData = {
      studentId: student.studentId,
      leaveType: 'medical',
      duration: leaveRequest.duration,
      startDate: new Date(),
      endDate: new Date(Date.now() + leaveRequest.duration * 24 * 60 * 60 * 1000),
      reason: leaveRequest.reason,
      approvedBy: leaveRequest.approvedBy,
      approvedAt: leaveRequest.approvedAt
    };

    // Simulate ERP API call
    console.log('Updating ERP system with leave data:', erpData);
    
    // In production, this would be:
    // const response = await axios.post(`${process.env.ERP_API_URL}/leave-requests`, erpData, {
    //   headers: { 'Authorization': `Bearer ${process.env.ERP_API_KEY}` }
    // });

    return { success: true, message: 'ERP system updated successfully' };
  } catch (error) {
    console.error('ERP update error:', error);
    throw error;
  }
}

async function generateAttendanceReport(studentId, startDate, endDate) {
  const appointments = await Appointment.find({
    student: studentId,
    appointmentDate: { $gte: startDate, $lte: endDate },
    status: 'completed'
  }).populate('doctor', 'name specialization');

  const totalAppointments = appointments.length;
  const emergencyAppointments = appointments.filter(apt => apt.isEmergency).length;
  const regularAppointments = totalAppointments - emergencyAppointments;

  const averageWaitTime = appointments.reduce((sum, apt) => sum + (apt.actualWaitTime || 0), 0) / totalAppointments || 0;

  return {
    totalAppointments,
    emergencyAppointments,
    regularAppointments,
    averageWaitTime: Math.round(averageWaitTime),
    appointments: appointments.map(apt => ({
      date: apt.appointmentDate,
      doctor: apt.doctor ? apt.doctor.name : 'N/A',
      diagnosis: apt.diagnosis,
      treatment: apt.treatment,
      isEmergency: apt.isEmergency
    }))
  };
}

async function syncStudentData() {
  try {
    // This would sync student data with ERP system
    const students = await User.find({ role: 'student', isActive: true })
      .select('studentId name email department year phone bloodGroup');

    // Simulate ERP sync
    console.log(`Syncing ${students.length} students with ERP system`);
    
    return {
      synced: students.length,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Student data sync error:', error);
    throw error;
  }
}

async function syncAttendanceData() {
  try {
    // This would sync attendance data with ERP system
    const appointments = await Appointment.find({
      status: 'completed',
      appointmentDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    console.log(`Syncing ${appointments.length} completed appointments with ERP system`);
    
    return {
      synced: appointments.length,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Attendance data sync error:', error);
    throw error;
  }
}

async function syncLeaveRequests() {
  try {
    // This would sync leave requests with ERP system
    const leaveRequests = await Appointment.find({
      'leaveRequest.requested': true,
      'leaveRequest.status': 'approved'
    });

    console.log(`Syncing ${leaveRequests.length} approved leave requests with ERP system`);
    
    return {
      synced: leaveRequests.length,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Leave requests sync error:', error);
    throw error;
  }
}

module.exports = router;
