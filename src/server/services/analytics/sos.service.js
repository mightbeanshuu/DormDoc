const Appointment = require('../../models/Appointment');
const cache = require('./snapshotCache');

const CACHE_KEY = 'analytics:sos';

async function getSosAnalytics({ fresh = false } = {}) {
  if (!fresh) {
    const cached = cache.get(CACHE_KEY);
    if (cached) return cached;
  }

  const [facetResult] = await Appointment.aggregate([
    { $match: { isEmergency: true } },
    {
      $facet: {
        // Total SOS count
        total: [{ $count: 'count' }],

        // Frequency trend over time (monthly)
        trend: [
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
    trend: facetResult.trend,
  };

  cache.set(CACHE_KEY, result);
  return result;
}

module.exports = { getSosAnalytics };
