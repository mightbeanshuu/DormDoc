const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.warn('[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing — server-side Supabase calls will fail.');
}

// Service-role client: bypasses RLS. Use for signup triggers, admin tasks,
// and any flow that needs to span policies. Never expose to the browser.
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// User-scoped client: respects RLS using the caller's JWT.
// Use this from request handlers when you want the DB to enforce the user's policies.
function supabaseForUser(accessToken) {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

module.exports = { supabaseAdmin, supabaseForUser };
