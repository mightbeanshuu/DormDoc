const Appointment = require('../../models/Appointment');
const cache = require('./snapshotCache');

const CACHE_KEY = 'analytics:leave';

async function getLeaveAnalytics({ fresh = false } = {}) {
  if (!fresh) {
    const cached = cache.get(CACHE_KEY);
    if (cached) return cached;
  }

  // Use $facet to get multiple cuts in one round-trip
  const [facetResult] = await Appointment.aggregate([
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
          { $project: { _id: 0, status: '$_id', count: 1 } },
        ],

        // Monthly trend (based on appointment createdAt)
        monthlyTrend: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, month: '$_id', count: 1 } },
        ],
      },
    },
  ]);

  const result = {
    total: facetResult.total[0]?.count || 0,
    byStatus: facetResult.byStatus,
    monthlyTrend: facetResult.monthlyTrend,
  };

  cache.set(CACHE_KEY, result);
  return result;
}

module.exports = { getLeaveAnalytics };
