/**
 * Simple in-memory TTL cache for analytics snapshots.
 * Keyed by endpoint name; stores { value, timestamp }.
 * Default TTL: 10 minutes. Bypass with ?fresh=true.
 */

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes

const store = new Map();

function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > DEFAULT_TTL_MS) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function set(key, value) {
  store.set(key, { value, timestamp: Date.now() });
}

function shouldBypass(req) {
  return req.query.fresh === 'true';
}

function getOrRun(key, req, computeFn) {
  if (!shouldBypass(req)) {
    const cached = get(key);
    if (cached) return Promise.resolve(cached);
  }
  return computeFn(req).then((result) => {
    set(key, result);
    return result;
  });
}

module.exports = { get, set, shouldBypass, getOrRun };
