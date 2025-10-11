const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Ambulance = require('../models/Ambulance');
const User = require('../models/User');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// @route   GET /api/analytics/dashboard
// @desc    Get analytics dashboard data
// @access  Private
router.get('/dashboard', async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    
    switch (range) {
      case '1d':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setDate(startDate.getDate() - 365);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    // Get comprehensive dashboard data
    const [
      totalPatients,
      todayAppointments,
      emergencyCases,
      activeDoctors,
      completedAppointments,
      pendingAppointments,
      cancelledAppointments,
      emergencyAlerts,
      departmentStats,
      recentActivity,
      doctorStats,
      activeEmergencies,
      resolvedEmergencies
    ] = await Promise.all([
      User.countDocuments({ role: 'student', isActive: true }),
      Appointment.countDocuments({ 
        appointmentDate: { 
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }),
      Appointment.countDocuments({ 
        isEmergency: true,
        appointmentDate: { $gte: startDate, $lte: endDate }
      }),
      Doctor.countDocuments({ isOnDuty: true }),
      Appointment.countDocuments({ 
        status: 'completed',
        appointmentDate: { 
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }),
      Appointment.countDocuments({ 
        status: { $in: ['scheduled', 'confirmed'] },
        appointmentDate: { 
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }),
      Appointment.countDocuments({ 
        status: 'cancelled',
        appointmentDate: { 
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }),
      Appointment.countDocuments({ 
        isEmergency: true,
        appointmentDate: { 
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }),
      getDepartmentStats(startDate, endDate),
      getRecentActivity(),
      getDoctorStats(),
      Appointment.countDocuments({ 
        isEmergency: true,
        status: { $in: ['scheduled', 'confirmed', 'in-progress'] }
      }),
      Appointment.countDocuments({ 
        isEmergency: true,
        status: 'completed',
        appointmentDate: { 
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      })
    ]);

    res.json({
      totalPatients,
      todayAppointments,
      emergencyCases,
      activeDoctors,
      completedAppointments,
      pendingAppointments,
      cancelledAppointments,
      emergencyAlerts,
      departmentStats,
      recentActivity,
      doctorStats,
      activeEmergencies,
      resolvedEmergencies,
      scheduledAppointments: pendingAppointments,
      inProgressAppointments: Appointment.countDocuments({ status: 'in-progress' })
    });
  } catch (error) {
    console.error('Analytics dashboard error:', error);
    res.status(500).json({ message: 'Server error loading analytics dashboard' });
  }
});

// @route   GET /api/analytics/appointments
// @desc    Get appointment analytics
// @access  Private
router.get('/appointments', async (req, res) => {
  try {
    const { period = '30d', groupBy = 'day' } = req.query;
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

    const appointmentAnalytics = await Appointment.aggregate([
      {
        $match: {
          appointmentDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: groupBy === 'day' 
            ? { $dateToString: { format: '%Y-%m-%d', date: '$appointmentDate' } }
            : groupBy === 'week'
            ? { $dateToString: { format: '%Y-W%U', date: '$appointmentDate' } }
            : { $dateToString: { format: '%Y-%m', date: '$appointmentDate' } },
          totalAppointments: { $sum: 1 },
          completedAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          emergencyAppointments: {
            $sum: { $cond: [{ $eq: ['$isEmergency', true] }, 1, 0] }
          },
          averageWaitTime: { $avg: '$actualWaitTime' },
          averagePriority: { $avg: '$priority' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    res.json({ appointmentAnalytics });
  } catch (error) {
    console.error('Appointment analytics error:', error);
    res.status(500).json({ message: 'Server error fetching appointment analytics' });
  }
});

// @route   GET /api/analytics/doctors
// @desc    Get doctor performance analytics
// @access  Private
router.get('/doctors', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period.replace('d', '')));

    const doctorAnalytics = await Appointment.aggregate([
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
          averageConsultationTime: { $avg: '$consultationDuration' },
          averageWaitTime: { $avg: '$actualWaitTime' },
          averageRating: { $avg: '$feedback.rating' },
          emergencyCases: {
            $sum: { $cond: [{ $eq: ['$isEmergency', true] }, 1, 0] }
          }
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
          doctorId: '$_id',
          doctorName: '$doctor.name',
          specialization: '$doctor.specialization',
          totalAppointments: 1,
          averageConsultationTime: 1,
          averageWaitTime: 1,
          averageRating: 1,
          emergencyCases: 1,
          efficiency: {
            $divide: ['$totalAppointments', '$averageConsultationTime']
          }
        }
      },
      {
        $sort: { totalAppointments: -1 }
      }
    ]);

    res.json({ doctorAnalytics });
  } catch (error) {
    console.error('Doctor analytics error:', error);
    res.status(500).json({ message: 'Server error fetching doctor analytics' });
  }
});

// @route   GET /api/analytics/wait-times
// @desc    Get wait time predictions and analytics
// @access  Private
router.get('/wait-times', async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    
    let matchQuery = {};
    if (doctorId) matchQuery.doctor = doctorId;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      matchQuery.appointmentDate = { $gte: startDate, $lt: endDate };
    }

    const waitTimeAnalytics = await Appointment.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$doctor',
          averageWaitTime: { $avg: '$actualWaitTime' },
          minWaitTime: { $min: '$actualWaitTime' },
          maxWaitTime: { $max: '$actualWaitTime' },
          totalAppointments: { $sum: 1 },
          emergencyWaitTime: {
            $avg: {
              $cond: [
                { $eq: ['$isEmergency', true] },
                '$actualWaitTime',
                null
              ]
            }
          }
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
          doctorId: '$_id',
          doctorName: '$doctor.name',
          specialization: '$doctor.specialization',
          averageWaitTime: 1,
          minWaitTime: 1,
          maxWaitTime: 1,
          totalAppointments: 1,
          emergencyWaitTime: 1
        }
      }
    ]);

    // Get current queue predictions
    const currentQueuePredictions = await getCurrentQueuePredictions();

    res.json({
      waitTimeAnalytics,
      currentQueuePredictions
    });
  } catch (error) {
    console.error('Wait time analytics error:', error);
    res.status(500).json({ message: 'Server error fetching wait time analytics' });
  }
});

// @route   GET /api/analytics/emergency
// @desc    Get emergency response analytics
// @access  Private
router.get('/emergency', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period.replace('d', '')));

    const emergencyAnalytics = await Appointment.aggregate([
      {
        $match: {
          appointmentDate: { $gte: startDate, $lte: endDate },
          isEmergency: true
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$appointmentDate' }
          },
          totalEmergencies: { $sum: 1 },
          averageResponseTime: { $avg: '$actualWaitTime' },
          highPriorityEmergencies: {
            $sum: { $cond: [{ $gte: ['$priority', 8] }, 1, 0] }
          },
          criticalEmergencies: {
            $sum: { $cond: [{ $eq: ['$priority', 10] }, 1, 0] }
          }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    const emergencyTrends = await Appointment.aggregate([
      {
        $match: {
          appointmentDate: { $gte: startDate, $lte: endDate },
          isEmergency: true
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$appointmentDate' }
          },
          emergencyCount: { $sum: 1 },
          averagePriority: { $avg: '$priority' }
        }
      },
      {
        $sort: { '_id.hour': 1 }
      }
    ]);

    res.json({
      emergencyAnalytics,
      emergencyTrends
    });
  } catch (error) {
    console.error('Emergency analytics error:', error);
    res.status(500).json({ message: 'Server error fetching emergency analytics' });
  }
});

// @route   GET /api/analytics/predictions
// @desc    Get predictive analytics
// @access  Private
router.get('/predictions', async (req, res) => {
  try {
    const { type = 'all' } = req.query;
    
    const predictions = {};
    
    if (type === 'all' || type === 'appointments') {
      predictions.appointmentPredictions = await getAppointmentPredictions();
    }
    
    if (type === 'all' || type === 'wait-times') {
      predictions.waitTimePredictions = await getWaitTimePredictions();
    }
    
    if (type === 'all' || type === 'emergency') {
      predictions.emergencyPredictions = await getEmergencyPredictions();
    }
    
    if (type === 'all' || type === 'resource-utilization') {
      predictions.resourceUtilization = await getResourceUtilizationPredictions();
    }

    res.json({ predictions });
  } catch (error) {
    console.error('Predictions analytics error:', error);
    res.status(500).json({ message: 'Server error fetching predictions' });
  }
});

// Helper functions

async function getAppointmentTrends(startDate, endDate) {
  return await Appointment.aggregate([
    {
      $match: {
        appointmentDate: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$appointmentDate' } },
        totalAppointments: { $sum: 1 },
        completedAppointments: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        emergencyAppointments: {
          $sum: { $cond: [{ $eq: ['$isEmergency', true] }, 1, 0] }
        }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ]);
}

async function getDoctorPerformance(startDate, endDate) {
  return await Appointment.aggregate([
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
        averageConsultationTime: { $avg: '$consultationDuration' },
        averageRating: { $avg: '$feedback.rating' }
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
        averageConsultationTime: 1,
        averageRating: 1
      }
    }
  ]);
}

async function getAmbulanceStatistics(startDate, endDate) {
  return await Ambulance.aggregate([
    {
      $project: {
        vehicleNumber: 1,
        driverName: 1,
        status: 1,
        totalTrips: '$performance.totalTrips',
        averageResponseTime: '$performance.averageResponseTime',
        rating: '$performance.rating'
      }
    }
  ]);
}

async function getEmergencyStatistics(startDate, endDate) {
  return await Appointment.aggregate([
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
        averageResponseTime: { $avg: '$actualWaitTime' },
        criticalEmergencies: {
          $sum: { $cond: [{ $eq: ['$priority', 10] }, 1, 0] }
        }
      }
    }
  ]);
}

async function getWaitTimeAnalytics(startDate, endDate) {
  return await Appointment.aggregate([
    {
      $match: {
        appointmentDate: { $gte: startDate, $lte: endDate },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: '$doctor',
        averageWaitTime: { $avg: '$actualWaitTime' },
        minWaitTime: { $min: '$actualWaitTime' },
        maxWaitTime: { $max: '$actualWaitTime' }
      }
    }
  ]);
}

async function getSystemMetrics() {
  const totalStudents = await User.countDocuments({ role: 'student', isActive: true });
  const totalDoctors = await Doctor.countDocuments({ isActive: true });
  const totalAmbulances = await Ambulance.countDocuments({ isActive: true });
  const activeAppointments = await Appointment.countDocuments({
    status: { $in: ['scheduled', 'confirmed', 'in-progress'] }
  });

  return {
    totalStudents,
    totalDoctors,
    totalAmbulances,
    activeAppointments
  };
}

async function getCurrentQueuePredictions() {
  const doctors = await Doctor.find({ isOnDuty: true });
  const predictions = [];

  for (const doctor of doctors) {
    const currentQueue = await Appointment.countDocuments({
      doctor: doctor._id,
      status: { $in: ['scheduled', 'confirmed', 'in-progress'] }
    });

    const estimatedWaitTime = currentQueue * doctor.averageConsultationTime;
    
    predictions.push({
      doctorId: doctor._id,
      doctorName: doctor.name,
      currentQueue,
      estimatedWaitTime,
      predictedPeakTime: '14:00-16:00' // This would be calculated based on historical data
    });
  }

  return predictions;
}

async function getAppointmentPredictions() {
  // This would use machine learning models to predict future appointment patterns
  return {
    nextWeekPredictions: {
      expectedAppointments: 150,
      peakDays: ['Monday', 'Wednesday', 'Friday'],
      peakHours: ['09:00-11:00', '14:00-16:00']
    },
    seasonalTrends: {
      winter: 'Higher respiratory issues',
      summer: 'More heat-related problems',
      monsoon: 'Increased waterborne diseases'
    }
  };
}

async function getWaitTimePredictions() {
  // This would predict wait times based on historical patterns
  return {
    todayPredictions: {
      morning: '15-20 minutes',
      afternoon: '25-30 minutes',
      evening: '20-25 minutes'
    },
    tomorrowPredictions: {
      morning: '10-15 minutes',
      afternoon: '20-25 minutes',
      evening: '15-20 minutes'
    }
  };
}

async function getEmergencyPredictions() {
  // This would predict emergency patterns
  return {
    riskFactors: [
      'Weather changes',
      'Exam periods',
      'Festival seasons'
    ],
    predictedEmergencies: {
      nextWeek: 5,
      nextMonth: 20
    }
  };
}

async function getResourceUtilizationPredictions() {
  // This would predict resource utilization
  return {
    doctorUtilization: {
      current: '75%',
      predicted: '85%'
    },
    ambulanceUtilization: {
      current: '60%',
      predicted: '70%'
    },
    recommendations: [
      'Add one more doctor for peak hours',
      'Schedule maintenance for ambulances during low-usage periods'
    ]
  };
}

async function getDepartmentStats(startDate, endDate) {
  return await User.aggregate([
    {
      $match: {
        role: 'student',
        isActive: true,
        department: { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: '$department',
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        department: '$_id',
        count: 1,
        percentage: { $multiply: [{ $divide: ['$count', await User.countDocuments({ role: 'student', isActive: true })] }, 100] }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
}

async function getRecentActivity() {
  const activities = [];
  
  // Get recent appointments
  const recentAppointments = await Appointment.find()
    .populate('student', 'name')
    .populate('doctor', 'name')
    .sort({ createdAt: -1 })
    .limit(5);

  recentAppointments.forEach(appointment => {
    activities.push({
      title: `Appointment ${appointment.status} - ${appointment.student?.name}`,
      time: appointment.createdAt.toLocaleString(),
      color: appointment.status === 'completed' ? 'success.main' : 
             appointment.status === 'cancelled' ? 'error.main' : 'warning.main',
      icon: appointment.isEmergency ? 'Warning' : 'Schedule'
    });
  });

  // Get recent user registrations
  const recentUsers = await User.find({ role: 'student' })
    .sort({ createdAt: -1 })
    .limit(3);

  recentUsers.forEach(user => {
    activities.push({
      title: `New student registered - ${user.name}`,
      time: user.createdAt.toLocaleString(),
      color: 'primary.main',
      icon: 'Person'
    });
  });

  return activities.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);
}

async function getDoctorStats() {
  return await Doctor.aggregate([
    {
      $lookup: {
        from: 'appointments',
        localField: '_id',
        foreignField: 'doctor',
        as: 'appointments'
      }
    },
    {
      $project: {
        name: 1,
        specialization: 1,
        patientsSeen: { $size: '$appointments' },
        rating: { $avg: '$appointments.feedback.rating' },
        status: { $cond: ['$isOnDuty', 'Available', 'Off Duty'] }
      }
    },
    {
      $sort: { patientsSeen: -1 }
    }
  ]);
}

module.exports = router;
