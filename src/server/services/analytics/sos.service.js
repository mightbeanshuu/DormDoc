const cache = require('./snapshotCache');

const CACHE_KEY = 'analytics:sos';

function monthKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function compute(req) {
  const sb = req.sb;

  const [{ data: emergencyAppts }, { data: trips }] = await Promise.all([
    sb.from('appointments').select('appointment_date').eq('is_emergency', true),
    sb.from('ambulance_trips').select('created_at'),
  ]);

  const trendMap = new Map();
  for (const r of emergencyAppts || []) {
    if (!r.appointment_date) continue;
    const m = monthKey(r.appointment_date);
    trendMap.set(m, (trendMap.get(m) || 0) + 1);
  }
  for (const r of trips || []) {
    if (!r.created_at) continue;
    const m = monthKey(r.created_at);
    trendMap.set(m, (trendMap.get(m) || 0) + 1);
  }
  const frequencyTrend = [...trendMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({ month, count }));

  return {
    totalSOS: (emergencyAppts || []).length + (trips || []).length,
    emergencyAppointments: (emergencyAppts || []).length,
    ambulanceTrips: (trips || []).length,
    frequencyTrend,
  };
}

function getSosAnalytics(req) {
  return cache.getOrRun(CACHE_KEY, req, compute);
}

module.exports = { getSosAnalytics };
