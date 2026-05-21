const Appointment = require('../../models/Appointment');
const AmbulanceTrip = require('../../models/AmbulanceTrip');
const cache = require('./snapshotCache');

const CACHE_KEY = 'analytics:sos';

async function compute() {
  const [emergencyAppointments, ambulanceTrips] = await Promise.all([
    // Emergency appointments — count + monthly trend
    Appointment.aggregate([
      { $match: { isEmergency: true } },
      {
        $facet: {
          total: [{ $count: 'count' }],
          trend: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$appointmentDate' } },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            { $project: { month: '$_id', count: 1, _id: 0 } },
          ],
        },
      },
    ]),

    // Ambulance trips — count + monthly trend
    AmbulanceTrip.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          trend: [
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
    ]),
  ]);

  const emResult = emergencyAppointments[0] || { total: [], trend: [] };
  const atResult = ambulanceTrips[0] || { total: [], trend: [] };

  const emergencyTotal = emResult.total[0]?.count || 0;
  const ambulanceTotal = atResult.total[0]?.count || 0;

  // Merge monthly trends from both sources
  const trendMap = new Map();
  for (const entry of [...emResult.trend, ...atResult.trend]) {
    trendMap.set(entry.month, (trendMap.get(entry.month) || 0) + entry.count);
  }
  const combinedTrend = Array.from(trendMap.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalSOS: emergencyTotal + ambulanceTotal,
    emergencyAppointments: emergencyTotal,
    ambulanceTrips: ambulanceTotal,
    frequencyTrend: combinedTrend,
  };
}

function getSosAnalytics(req) {
  return cache.getOrRun(CACHE_KEY, req, compute);
}

module.exports = { getSosAnalytics };
