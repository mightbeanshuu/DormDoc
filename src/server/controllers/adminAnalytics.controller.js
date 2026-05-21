const { getGrowthAnalytics } = require('../services/analytics/growth.service');
const { getLeaveAnalytics } = require('../services/analytics/leave.service');
const { getAppointmentAnalytics } = require('../services/analytics/appointment.service');
const { getSosAnalytics } = require('../services/analytics/sos.service');
const { toCsv } = require('../utils/toCsv');

function wrap(serviceFn) {
  return async (req, res) => {
    try {
      const data = await serviceFn(req);
      res.json({ success: true, data, generatedAt: new Date().toISOString() });
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ message: 'Failed to fetch analytics' });
    }
  };
}

const growth = wrap(getGrowthAnalytics);
const leave = wrap(getLeaveAnalytics);
const appointments = wrap(getAppointmentAnalytics);
const sos = wrap(getSosAnalytics);

const DATASET_MAP = {
  growth: getGrowthAnalytics,
  leave: getLeaveAnalytics,
  appointments: getAppointmentAnalytics,
  sos: getSosAnalytics,
};

// Flatten nested analytics data into a CSV-friendly array of rows
function flattenForCsv(dataset, data) {
  switch (dataset) {
    case 'growth':
      return data.registrationsByMonth.map((r) => ({
        month: r.month,
        registrations: r.count,
      }));
    case 'leave':
      return data.monthlyTrend.map((r) => ({
        month: r.month,
        leaveRequests: r.count,
      }));
    case 'appointments':
      return data.perDay.map((r) => ({
        date: r.date,
        appointments: r.count,
      }));
    case 'sos':
      return data.frequencyTrend.map((r) => ({
        month: r.month,
        sosEvents: r.count,
      }));
    default:
      return [];
  }
}

async function exportCsv(req, res) {
  try {
    const { dataset } = req.params;
    const serviceFn = DATASET_MAP[dataset];
    if (!serviceFn) {
      return res.status(400).json({ message: `Invalid dataset: ${dataset}. Must be one of: ${Object.keys(DATASET_MAP).join(', ')}` });
    }
    const data = await serviceFn(req);
    const rows = flattenForCsv(dataset, data);
    const csv = toCsv(rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${dataset}-analytics.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ message: 'Failed to export CSV' });
  }
}

module.exports = { growth, leave, appointments, sos, exportCsv };
