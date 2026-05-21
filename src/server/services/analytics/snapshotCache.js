/**
 * Simple in-memory TTL cache for analytics snapshots.
 * Keyed by endpoint name; stores { value, timestamp }.
 * Default TTL: 10 minutes.
 */

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes

const store = new Map();

/**
 * Get a cached value if it exists and hasn't expired.
 * @param {string} key
 * @returns {*|null} cached value or null on miss
 */
function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > (entry.ttl || DEFAULT_TTL_MS)) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

/**
 * Store a value in the cache.
 * @param {string} key
 * @param {*} value
 * @param {number} [ttl] optional TTL in ms (defaults to 10 min)
 */
function set(key, value, ttl) {
  store.set(key, { value, timestamp: Date.now(), ttl: ttl || DEFAULT_TTL_MS });
}

/**
 * Invalidate a single key.
 */
function invalidate(key) {
  store.delete(key);
}

/**
 * Clear the entire cache.
 */
function clear() {
  store.clear();
}

module.exports = { get, set, invalidate, clear };
