const cache = require('./snapshotCache');

const CACHE_KEY = 'analytics:leave';

function monthKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function compute(req) {
  const sb = req.sb;

  const { data: rows, error } = await sb.from('leave_requests').select('status, created_at');
  if (error) throw error;

  const total = (rows || []).length;

  const statusMap = new Map();
  for (const r of rows || []) {
    statusMap.set(r.status, (statusMap.get(r.status) || 0) + 1);
  }
  const byStatus = [...statusMap.entries()].map(([status, count]) => ({ status, count }));

  const monthMap = new Map();
  for (const r of rows || []) {
    if (!r.created_at) continue;
    const m = monthKey(r.created_at);
    monthMap.set(m, (monthMap.get(m) || 0) + 1);
  }
  const monthlyTrend = [...monthMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({ month, count }));

  return { total, byStatus, monthlyTrend };
}

function getLeaveAnalytics(req) {
  return cache.getOrRun(CACHE_KEY, req, compute);
}

module.exports = { getLeaveAnalytics };
