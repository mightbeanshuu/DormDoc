# Running DormDoc with Docker

A production-style setup with two containers:

| Service | Image | Role |
| :--- | :--- | :--- |
| `web` | nginx 1.27 (alpine) | Serves the built React app, proxies `/api/*` to the API |
| `api` | Node 22 (alpine) | Express API (`src/server/server.js`) |
| `redis` | Redis 7 (alpine) | Auth-profile cache (optional — the API falls back to direct Supabase queries if it's down) |

The database is your cloud Supabase project — no local database container is needed.
This setup is independent of the Vercel deployment (`vercel.json` / `api/` are untouched).

## Prerequisites

- Docker Engine 24+ with the Compose plugin (`docker compose version`)
- A Supabase project (URL, anon key, service-role key, JWT secret)

## 1. Configure environment

```bash
cp .env.example .env
```

Fill in at least:

```dotenv
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
REACT_APP_SUPABASE_URL=https://<ref>.supabase.co
REACT_APP_SUPABASE_ANON_KEY=...
```

Notes:

- If you already keep secrets in `.env.local` (the dev-server convention), the API
  container picks it up too — compose layers `.env.local` over `.env`, same as dotenv.
  The two `REACT_APP_*` values must be in `.env` itself, though: they are **build args**
  and compose only reads `.env` when interpolating them. Both are safe to put there
  (the anon key is public by design).
- `CLIENT_URL` defaults to `http://localhost:8080` (the nginx origin). When deploying
  behind a real domain, set it in `.env` as a comma-separated list, e.g.
  `CLIENT_URL=http://localhost:8080,https://dormdoc.example.com` — otherwise browser
  POST/PUT requests fail CORS.

## 2. Build and run

```bash
docker compose up --build -d
```

Open http://localhost:8080. Health check:

```bash
curl http://localhost:8080/api/health
```

## Baked vs. runtime configuration

- **Baked at image build time** (client bundle): `REACT_APP_SUPABASE_URL`,
  `REACT_APP_SUPABASE_ANON_KEY`. Changing them requires `docker compose build web`.
- **Runtime** (API container): everything else — Supabase service keys, email/SMS/AI
  keys, `CLIENT_URL`, etc. Changing them only requires `docker compose up -d` again.

## Redis cache

The `redis` container caches the per-request auth profile lookups (5-minute TTL,
tunable via `AUTH_CACHE_TTL_SECONDS`). It is strictly optional: `docker compose
stop redis` degrades gracefully to direct Supabase queries. Details:

- No host port is published — cached auth objects contain PII (email, phone,
  emergency contacts), so Redis is reachable only on the internal network.
- No persistence (`--save ""`), 64 MB memory cap with `allkeys-lru` eviction —
  losing it on restart just means a cold cache.
- Inspect the cache: `docker compose exec redis redis-cli --scan --pattern 'dormdoc:*'`
- Flush it: `docker compose exec redis redis-cli flushall`

## Architecture notes

- The API container publishes **no host port** — it is reachable only through the
  nginx proxy at `/api/*`. nginx allows request bodies up to 10 MB to match the
  server's upload limit.
- nginx serves the SPA with a `try_files` fallback to `index.html`, so deep-route
  refreshes work; CRA's content-hashed `/static/` assets are cached immutably.
- The API container runs as the non-root `node` user and has a Docker `HEALTHCHECK`
  on `/api/health`; `web` waits for `api` to be healthy before starting.

## Troubleshooting

| Symptom | Likely cause |
| :--- | :--- |
| Blank page, console error about Supabase | `REACT_APP_*` build args missing — set them in `.env` and `docker compose build web` |
| POST/PUT return 500 with a CORS message | `CLIENT_URL` doesn't include the origin you're browsing from |
| 413 on file upload | Request over 10 MB (`client_max_body_size` in `docker/nginx.conf`) |
| `api` never becomes healthy | `docker compose logs api` — usually missing Supabase env vars |
| Stale name/role right after an admin edit | Cache invalidation covers server-side writes; direct DB edits are stale for up to `AUTH_CACHE_TTL_SECONDS` — flush with `docker compose exec redis redis-cli flushall` |
