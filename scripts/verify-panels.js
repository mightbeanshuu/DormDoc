#!/usr/bin/env node
/**
 * End-to-end panel sign-in smoke test.
 *
 * For each seeded role:
 *   1. admin.generateLink → get a single-use email OTP
 *   2. anon-client verifyOtp → get an access_token (real Supabase session)
 *   3. GET http://localhost:5001/api/auth/me with Bearer token
 *   4. Assert response role + email match what we seeded
 *
 * Run from repo root: `npm run verify:panels`. Express must be running.
 */

const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const API_BASE = process.env.API_BASE || 'http://localhost:5001';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  console.error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or REACT_APP_SUPABASE_ANON_KEY');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PANELS = [
  { role: 'student',          email: 'btech10001.23@bitmesra.ac.in' },
  { role: 'faculty',          email: 'faculty.cse.demo@bitmesra.ac.in' },
  { role: 'hod',              email: 'hod.cse.demo@bitmesra.ac.in' },
  { role: 'doctor',           email: 'doctor.demo@bitmesra.ac.in' },
  { role: 'dispensary_staff', email: 'nurse.demo@bitmesra.ac.in' },
  { role: 'admin',            email: 'admin.demo@bitmesra.ac.in' },
  { role: 'parent',           email: 'parent.demo@example.com' },
];

async function signInAsRole(email) {
  // anon client so verifyOtp goes through the same path as the browser.
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkErr) throw new Error(`generateLink: ${linkErr.message}`);
  const token = linkData?.properties?.email_otp;
  if (!token) throw new Error('no email_otp in generateLink response');
  const { data, error } = await anon.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw new Error(`verifyOtp: ${error.message}`);
  return data.session.access_token;
}

async function callMe(token) {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`/api/auth/me ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

(async () => {
  console.log(`Verifying ${PANELS.length} panel sign-ins via ${API_BASE}\n`);
  let pass = 0;
  let fail = 0;
  for (const panel of PANELS) {
    process.stdout.write(`• ${panel.role.padEnd(18)} ${panel.email.padEnd(40)} `);
    try {
      const token = await signInAsRole(panel.email);
      const me = await callMe(token);
      const gotRole = me?.user?.role;
      const gotEmail = me?.user?.email;
      const ok = gotRole === panel.role && (gotEmail || '').toLowerCase() === panel.email.toLowerCase();
      console.log(ok ? `OK · role=${gotRole}` : `FAIL · role=${gotRole} email=${gotEmail}`);
      ok ? pass++ : fail++;
    } catch (err) {
      console.log(`ERROR · ${err.message}`);
      fail++;
    }
  }
  console.log(`\n${pass}/${PANELS.length} panels signed in cleanly${fail ? `, ${fail} failed` : ''}.`);
  process.exit(fail ? 1 : 0);
})().catch((err) => {
  console.error('Verify failed:', err);
  process.exit(1);
});
