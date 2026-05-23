const cache = require('./snapshotCache');

const CACHE_KEY = 'analytics:growth';

function monthKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function compute(req) {
  const sb = req.sb;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalUsers },
    { data: profileRows },
    { data: appointmentRows },
    { data: leaveRows },
  ] = await Promise.all([
    sb.from('profiles').select('id', { count: 'exact', head: true }),
    sb.from('profiles').select('created_at, role'),
    sb.from('appointments').select('student_id').gte('appointment_date', thirtyDaysAgo.slice(0, 10)),
    sb.from('leave_requests').select('student_id').gte('created_at', thirtyDaysAgo),
  ]);

  // Registrations by month
  const monthMap = new Map();
  for (const r of profileRows || []) {
    if (!r.created_at) continue;
    const m = monthKey(r.created_at);
    monthMap.set(m, (monthMap.get(m) || 0) + 1);
  }
  const registrationsByMonth = [...monthMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({ month, count }));

  // Role distribution
  const roleMap = new Map();
  for (const r of profileRows || []) {
    const role = r.role || 'unknown';
    roleMap.set(role, (roleMap.get(role) || 0) + 1);
  }
  const roleDistribution = [...roleMap.entries()].map(([role, count]) => ({ role, count }));

  const activeIds = new Set([
    ...(appointmentRows || []).map((a) => a.student_id).filter(Boolean),
    ...(leaveRows || []).map((l) => l.student_id).filter(Boolean),
  ]);

  return {
    totalUsers: totalUsers || 0,
    registrationsByMonth,
    roleDistribution,
    activeUsers: activeIds.size,
  };
}

function getGrowthAnalytics(req) {
  return cache.getOrRun(CACHE_KEY, req, compute);
}

module.exports = { getGrowthAnalytics };
