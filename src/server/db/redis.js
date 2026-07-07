// Optional Redis client for the auth-profile cache. When REDIS_URL is unset
// (plain `npm run dev`, Vercel) or Redis is unreachable, every helper here is
// a best-effort no-op and the server behaves exactly as without Redis — a
// cache problem must never fail a request or block startup.
const REDIS_URL = process.env.REDIS_URL;

let client = null;
let lastErrorLogAt = 0;

if (REDIS_URL) {
  const Redis = require('ioredis');
  client = new Redis(REDIS_URL, {
    enableOfflineQueue: false, // fail fast while disconnected instead of buffering
    maxRetriesPerRequest: 1,
    commandTimeout: 300, // ms — a hung Redis adds at most this once, then status != 'ready'
    retryStrategy: (times) => Math.min(times * 500, 15000), // keep reconnecting in background
  });
  // ioredis emits 'error' events; without a listener the process crashes on
  // the first refused connection. Throttle the log so a down Redis doesn't spam.
  client.on('error', (err) => {
    const now = Date.now();
    if (now - lastErrorLogAt > 60_000) {
      lastErrorLogAt = now;
      console.warn('[redis] unavailable, auth cache disabled until it recovers:', err.message);
    }
  });
  client.on('ready', () => console.log('[redis] connected — auth cache enabled'));
} else {
  console.log('[redis] REDIS_URL not set — auth cache disabled (direct Supabase lookups)');
}

const ready = () => client && client.status === 'ready';

async function cacheGetJson(key) {
  if (!ready()) return null;
  try {
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function cacheSetJson(key, value, ttlSeconds) {
  if (!ready()) return;
  try {
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    /* best-effort */
  }
}

async function cacheDel(key) {
  if (!ready()) return;
  try {
    await client.del(key);
  } catch {
    /* best-effort */
  }
}

const authUserKey = (userId) => `dormdoc:authuser:${userId}`;

async function invalidateAuthUserCache(userId) {
  if (userId) await cacheDel(authUserKey(userId));
}

module.exports = { cacheGetJson, cacheSetJson, cacheDel, authUserKey, invalidateAuthUserCache };
