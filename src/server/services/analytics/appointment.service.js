const cache = require('./snapshotCache');

const CACHE_KEY = 'analytics:appointments';

async function compute(req) {
  const sb = req.sb;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [{ data: rows30 }, { data: allRows }] = await Promise.all([
    sb.from('appointments').select('appointment_date, doctor_id, appointment_time').gte('appointment_date', thirtyDaysAgo),
    sb.from('appointments').select('doctor_id, appointment_time'),
  ]);

  // Appointments per day (last 30 days)
  const dayMap = new Map();
  for (const r of rows30 || []) {
    const day = r.appointment_date; // already YYYY-MM-DD
    if (!day) continue;
    dayMap.set(day, (dayMap.get(day) || 0) + 1);
  }
  const perDay = [...dayMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));

  // Per-doctor workload (all-time)
  const doctorMap = new Map();
  for (const r of allRows || []) {
    if (!r.doctor_id) continue;
    doctorMap.set(r.doctor_id, (doctorMap.get(r.doctor_id) || 0) + 1);
  }
  const doctorIds = [...doctorMap.keys()];
  let doctorNameMap = {};
  if (doctorIds.length) {
    const { data: profiles } = await sb.from('profiles').select('id, name').in('id', doctorIds);
    doctorNameMap = Object.fromEntries((profiles || []).map((p) => [p.id, p.name]));
  }
  const perDoctor = [...doctorMap.entries()]
    .map(([doctorId, count]) => ({
      doctorId,
      doctorName: doctorNameMap[doctorId] || 'Unknown',
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Peak hour-of-day
  const hourMap = new Map();
  for (const r of allRows || []) {
    if (!r.appointment_time) continue;
    const hour = parseInt(String(r.appointment_time).slice(0, 2), 10);
    if (Number.isNaN(hour)) continue;
    hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
  }
  const peakHour = [...hourMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([hour, count]) => ({ hour, count }));

  return { perDay, perDoctor, peakHour };
}

function getAppointmentAnalytics(req) {
  return cache.getOrRun(CACHE_KEY, req, compute);
}

module.exports = { getAppointmentAnalytics };
