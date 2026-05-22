const Appointment = require('../../models/Appointment');
const cache = require('./snapshotCache');

const CACHE_KEY = 'analytics:appointments';

async function compute() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [result] = await Appointment.aggregate([
    {
      $facet: {
        // Appointments per day (last 30 days)
        perDay: [
          { $match: { appointmentDate: { $gte: thirtyDaysAgo } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$appointmentDate' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { date: '$_id', count: 1, _id: 0 } },
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
        // appointmentTime is a String "HH:MM"; extract hour via $substr
        peakHour: [
          {
            $addFields: {
              hourStr: { $substr: ['$appointmentTime', 0, 2] },
            },
          },
          {
            $group: {
              _id: { $toInt: '$hourStr' },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { hour: '$_id', count: 1, _id: 0 } },
        ],
      },
    },
  ]);

  return {
    perDay: result.perDay,
    perDoctor: result.perDoctor,
    peakHour: result.peakHour,
  };
}

function getAppointmentAnalytics(req) {
  return cache.getOrRun(CACHE_KEY, req, compute);
}

module.exports = { getAppointmentAnalytics };
