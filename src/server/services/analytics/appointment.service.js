const Appointment = require('../../models/Appointment');
const cache = require('./snapshotCache');

const CACHE_KEY = 'analytics:appointments';

async function getAppointmentAnalytics({ fresh = false } = {}) {
  if (!fresh) {
    const cached = cache.get(CACHE_KEY);
    if (cached) return cached;
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [facetResult] = await Appointment.aggregate([
    { $match: { appointmentDate: { $gte: thirtyDaysAgo } } },
    {
      $facet: {
        // Appointments per day (last 30 days)
        perDay: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$appointmentDate' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, date: '$_id', count: 1 } },
        ],

        // Per-doctor workload (counts)
        perDoctor: [
          {
            $group: {
              _id: '$doctor',
              count: { $sum: 1 },
            },
          },
          {
            $lookup: {
              from: 'doctors',
              localField: '_id',
              foreignField: '_id',
              as: 'doctorInfo',
            },
          },
          { $unwind: { path: '$doctorInfo', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              doctorId: '$_id',
              doctorName: { $ifNull: ['$doctorInfo.name', 'Unknown'] },
              count: 1,
            },
          },
          { $sort: { count: -1 } },
        ],

        // Peak hour-of-day distribution
        // appointmentTime is a String like "09:00", extract hour via $substr
        peakHours: [
          {
            $project: {
              hour: {
                $toInt: { $substr: ['$appointmentTime', 0, 2] },
              },
            },
          },
          {
            $group: {
              _id: '$hour',
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, hour: '$_id', count: 1 } },
        ],
      },
    },
  ]);

  const result = {
    perDay: facetResult.perDay,
    perDoctor: facetResult.perDoctor,
    peakHours: facetResult.peakHours,
  };

  cache.set(CACHE_KEY, result);
  return result;
}

module.exports = { getAppointmentAnalytics };
