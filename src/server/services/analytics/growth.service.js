const User = require('../../models/User');
const Student = require('../../models/Student');
const Appointment = require('../../models/Appointment');
const cache = require('./snapshotCache');

const CACHE_KEY = 'analytics:growth';

async function getGrowthAnalytics({ fresh = false } = {}) {
  if (!fresh) {
    const cached = cache.get(CACHE_KEY);
    if (cached) return cached;
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Run independent queries in parallel
  const [
    totalUsers,
    registrationsByMonth,
    roleDistribution,
    appointmentUserIds,
    leaveUserIds,
  ] = await Promise.all([
    // Total registered users
    User.countDocuments(),

    // Registrations by month (last 12 months from User collection)
    User.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, month: '$_id', count: 1 } },
    ]),

    // Role distribution across User collection
    User.aggregate([
      {
        $group: {
          _id: { $toLower: '$role' },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, role: '$_id', count: 1 } },
    ]),

    // Distinct student IDs with at least 1 appointment in last 30 days
    Appointment.distinct('student', {
      appointmentDate: { $gte: thirtyDaysAgo },
    }),

    // Distinct student IDs with at least 1 leave request in last 30 days
    Appointment.distinct('student', {
      'leaveRequest.requested': true,
      createdAt: { $gte: thirtyDaysAgo },
    }),
  ]);

  // Union the two ID sets in app code (avoids $lookup)
  const activeSet = new Set([
    ...appointmentUserIds.map(String),
    ...leaveUserIds.map(String),
  ]);
  const activeUsers = activeSet.size;

  const result = {
    totalUsers,
    registrationsByMonth,
    roleDistribution,
    activeUsers,
  };

  cache.set(CACHE_KEY, result);
  return result;
}

module.exports = { getGrowthAnalytics };
