const Appointment = require('../../models/Appointment');
const cache = require('./snapshotCache');

const CACHE_KEY = 'analytics:leave';

async function compute() {
  // Use $facet to get multiple cuts in one round-trip
  const [result] = await Appointment.aggregate([
    { $match: { 'leaveRequest.requested': true } },
    {
      $facet: {
        // Total leave requests
        total: [{ $count: 'count' }],

        // Counts by status
        byStatus: [
          {
            $group: {
              _id: '$leaveRequest.status',
              count: { $sum: 1 },
            },
          },
          { $project: { status: '$_id', count: 1, _id: 0 } },
        ],

        // Monthly trend (based on appointment creation date)
        monthlyTrend: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { month: '$_id', count: 1, _id: 0 } },
        ],
      },
    },
  ]);

  return {
    total: result.total[0]?.count || 0,
    byStatus: result.byStatus,
    monthlyTrend: result.monthlyTrend,
  };
}

function getLeaveAnalytics(req) {
  return cache.getOrRun(CACHE_KEY, req, compute);
}

module.exports = { getLeaveAnalytics };
