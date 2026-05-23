const User = require('../../models/User');
const Appointment = require('../../models/Appointment');
const cache = require('./snapshotCache');

const CACHE_KEY = 'analytics:growth';

async function compute() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalUsers, registrationsByMonth, roleDistribution, activeFromAppointments, activeFromLeave] =
    await Promise.all([
      // Total users
      User.countDocuments(),

      // Registrations by month
      User.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { month: '$_id', count: 1, _id: 0 } },
      ]),

      // Role distribution
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
          },
        },
        { $project: { role: '$_id', count: 1, _id: 0 } },
      ]),

      // Distinct students with ≥1 appointment in last 30 days
      Appointment.distinct('student', {
        appointmentDate: { $gte: thirtyDaysAgo },
      }),

      // Distinct students with ≥1 leave request in last 30 days
      Appointment.distinct('student', {
        'leaveRequest.requested': true,
        createdAt: { $gte: thirtyDaysAgo },
      }),
    ]);

  // Union the two sets for active users
  const activeUserIds = new Set([
    ...activeFromAppointments.map(String),
    ...activeFromLeave.map(String),
  ]);

  return {
    totalUsers,
    registrationsByMonth,
    roleDistribution,
    activeUsers: activeUserIds.size,
  };
}

function getGrowthAnalytics(req) {
  return cache.getOrRun(CACHE_KEY, req, compute);
}

module.exports = { getGrowthAnalytics };
