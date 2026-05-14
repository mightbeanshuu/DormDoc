/**
 * Provider-agnostic SMS sender for OTPs.
 *
 * Priority order (first configured wins):
 *   1. Fast2SMS   — Indian provider, free signup gives ~₹50 / ~50 SMS credit.
 *                   Set FAST2SMS_API_KEY in .env.
 *   2. Twilio     — global, ~$15 free trial credit. Set TWILIO_ACCOUNT_SID,
 *                   TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.
 *   3. TextBelt   — global, no signup needed. Uses the public free key, which
 *                   allows 1 SMS per IP per day. Enable with
 *                   SMS_PROVIDER=textbelt (or as automatic fallback when
 *                   nothing else is configured AND NODE_ENV=production).
 *   4. Console    — development fallback. Prints "[MOCK SMS] …" to the
 *                   server log so a developer can copy the code from the
 *                   console without configuring a provider.
 */
const axios = require('axios');

const ENV_PROVIDER = (process.env.SMS_PROVIDER || '').toLowerCase();

function pickProvider() {
  if (ENV_PROVIDER) return ENV_PROVIDER;
  if (process.env.FAST2SMS_API_KEY) return 'fast2sms';
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  ) {
    return 'twilio';
  }
  if (process.env.NODE_ENV === 'production') return 'textbelt';
  return 'console';
}

function normalisePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  // Drop a leading country code 91 if it looks like an Indian 10-digit number
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits;
}

function withCountryCode(raw) {
  const local = normalisePhone(raw);
  if (local.length === 10) return `+91${local}`;
  if (String(raw).startsWith('+')) return String(raw);
  return `+${String(raw).replace(/\D/g, '')}`;
}

async function sendViaFast2SMS({ phone, otp }) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  const number = normalisePhone(phone);
  if (number.length !== 10) {
    throw new Error('Fast2SMS supports 10-digit Indian numbers only');
  }
  const route = process.env.FAST2SMS_ROUTE || 'otp';
  const url = 'https://www.fast2sms.com/dev/bulkV2';
  const params = {
    authorization: apiKey,
    route,
    numbers: number,
    variables_values: otp,
  };
  // The 'q' (quick SMS) route uses a `message` field; the 'otp' route uses
  // `variables_values` with a sender's pre-approved template on Fast2SMS.
  if (route === 'q') {
    params.message = `Your DormDoc verification code is ${otp}. Valid for 10 minutes.`;
    delete params.variables_values;
  }
  const { data } = await axios.get(url, { params, timeout: 10_000 });
  if (data?.return === false || data?.status_code === 412) {
    throw new Error(data?.message?.[0] || 'Fast2SMS rejected the request');
  }
  return { provider: 'fast2sms', id: data?.request_id || null };
}

async function sendViaTwilio({ phone, otp }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  const to = withCountryCode(phone);
  const body = `Your DormDoc verification code is ${otp}. Valid for 10 minutes.`;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const form = new URLSearchParams({ To: to, From: from, Body: body });
  const { data } = await axios.post(url, form, {
    auth: { username: sid, password: token },
    timeout: 10_000,
  });
  return { provider: 'twilio', id: data?.sid || null };
}

async function sendViaTextBelt({ phone, otp }) {
  const to = withCountryCode(phone);
  const key = process.env.TEXTBELT_KEY || 'textbelt';
  const body = `DormDoc code: ${otp}. Valid for 10 minutes.`;
  const { data } = await axios.post(
    'https://textbelt.com/text',
    { phone: to, message: body, key },
    { timeout: 10_000 }
  );
  if (!data?.success) {
    const reason = data?.error || 'TextBelt rejected the request';
    const err = new Error(reason);
    err.quotaRemaining = data?.quotaRemaining;
    throw err;
  }
  return { provider: 'textbelt', id: data?.textId || null };
}

async function sendOtp({ phone, otp }) {
  const provider = pickProvider();
  try {
    if (provider === 'fast2sms') return await sendViaFast2SMS({ phone, otp });
    if (provider === 'twilio') return await sendViaTwilio({ phone, otp });
    if (provider === 'textbelt') return await sendViaTextBelt({ phone, otp });
    console.log(`[MOCK SMS] To ${phone}: code ${otp} (set SMS_PROVIDER to enable real delivery)`);
    return { provider: 'console', id: null };
  } catch (err) {
    // Always log the code in dev so a stuck provider doesn't block testing
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[SMS FALLBACK · ${provider}] To ${phone}: code ${otp} (delivery failed: ${err.message})`);
    }
    throw err;
  }
}

module.exports = { sendOtp, pickProvider };
