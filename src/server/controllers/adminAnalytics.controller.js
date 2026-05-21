const { getGrowthAnalytics } = require('../services/analytics/growth.service');
const { getLeaveAnalytics } = require('../services/analytics/leave.service');
const { getAppointmentAnalytics } = require('../services/analytics/appointment.service');
const { getSosAnalytics } = require('../services/analytics/sos.service');
const toCsv = require('../utils/toCsv');

function buildResponse(data) {
  return { success: true, data, generatedAt: new Date().toISOString() };
}

// GET /api/admin/analytics/growth
async function growth(req, res) {
  try {
    const fresh = req.query.fresh === 'true';
    const data = await getGrowthAnalytics({ fresh });
    res.json(buildResponse(data));
  } catch (err) {
    console.error('Analytics growth error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch growth analytics' });
  }
}

// GET /api/admin/analytics/leave
async function leave(req, res) {
  try {
    const fresh = req.query.fresh === 'true';
    const data = await getLeaveAnalytics({ fresh });
    res.json(buildResponse(data));
  } catch (err) {
    console.error('Analytics leave error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch leave analytics' });
  }
}

// GET /api/admin/analytics/appointments
async function appointments(req, res) {
  try {
    const fresh = req.query.fresh === 'true';
    const data = await getAppointmentAnalytics({ fresh });
    res.json(buildResponse(data));
  } catch (err) {
    console.error('Analytics appointments error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch appointment analytics' });
  }
}

// GET /api/admin/analytics/sos
async function sos(req, res) {
  try {
    const fresh = req.query.fresh === 'true';
    const data = await getSosAnalytics({ fresh });
    res.json(buildResponse(data));
  } catch (err) {
    console.error('Analytics SOS error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch SOS analytics' });
  }
}

// GET /api/admin/analytics/export/:dataset
const DATASET_FETCHERS = {
  growth: getGrowthAnalytics,
  leave: getLeaveAnalytics,
  appointments: getAppointmentAnalytics,
  sos: getSosAnalytics,
};

async function exportCsv(req, res) {
  try {
    const { dataset } = req.params;
    const fetcher = DATASET_FETCHERS[dataset];
    if (!fetcher) {
      return res.status(400).json({ success: false, message: `Invalid dataset: ${dataset}. Valid options: ${Object.keys(DATASET_FETCHERS).join(', ')}` });
    }

    const data = await fetcher({ fresh: true });

    // Flatten the data into rows suitable for CSV
    const rows = flattenForCsv(dataset, data);
    const csv = toCsv(rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${dataset}-analytics.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('Analytics export error:', err);
    res.status(500).json({ success: false, message: 'Failed to export analytics' });
  }
}

/**
 * Flatten analytics data objects into flat row arrays for CSV export.
 */
function flattenForCsv(dataset, data) {
  switch (dataset) {
    case 'growth':
      return [
        { metric: 'Total Users', value: data.totalUsers },
        { metric: 'Active Users (30d)', value: data.activeUsers },
        ...data.roleDistribution.map((r) => ({ metric: `Role: ${r.role}`, value: r.count })),
        ...data.registrationsByMonth.map((r) => ({ metric: `Registrations ${r.month}`, value: r.count })),
      ];

    case 'leave':
      return [
        { metric: 'Total Leave Requests', value: data.total },
        ...data.byStatus.map((s) => ({ metric: `Status: ${s.status}`, value: s.count })),
        ...data.monthlyTrend.map((m) => ({ metric: `Month ${m.month}`, value: m.count })),
      ];

    case 'appointments':
      return [
        ...data.perDay.map((d) => ({ type: 'daily', date: d.date, count: d.count })),
        ...data.perDoctor.map((d) => ({ type: 'doctor_workload', doctor: d.doctorName, count: d.count })),
        ...data.peakHours.map((h) => ({ type: 'peak_hour', hour: h.hour, count: h.count })),
      ];

    case 'sos':
      return [
        { metric: 'Total SOS', value: data.total },
        ...data.trend.map((t) => ({ metric: `Month ${t.month}`, value: t.count })),
      ];

    default:
      return [];
  }
}

module.exports = { growth, leave, appointments, sos, exportCsv };
