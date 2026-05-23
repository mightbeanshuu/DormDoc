const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { supabaseAdmin } = require('../db/supabase');

// Phase 2: signup, login, OTP, password reset, and password change moved to
// Supabase Auth (client-side via @supabase/supabase-js). The endpoints below
// only cover what still belongs on the server.

// Current user — replaces /api/auth/me. JWT already verified by middleware.
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Profile read/write — service-role so we can return whatever the route needs
// without fighting RLS for self-reads. RLS still protects all other writes.
router.get('/profile', authenticateToken, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(500).json({ message: 'Failed to load profile' });
  res.json({ user: data });
});

router.put('/profile', authenticateToken, async (req, res) => {
  const { name, phone, photo_url: photoUrl } = req.body;
  const patch = {};
  if (name !== undefined) patch.name = name;
  if (phone !== undefined) patch.phone = phone;
  if (photoUrl !== undefined) patch.photo_url = photoUrl;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(patch)
    .eq('id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ message: 'Failed to update profile' });
  res.json({ message: 'Profile updated', user: data });
});

// Legacy endpoints — surfaced clearly so any stale client gets a useful error.
const legacy = (req, res) => res.status(410).json({
  message: 'Endpoint removed — signup/login/OTP/password are now handled by Supabase Auth on the client.',
});
router.post('/register', legacy);
router.post('/login', legacy);
router.post('/send-otp', legacy);
router.post('/verify-otp', legacy);
router.post('/reset-password', legacy);
router.put('/change-password', legacy);

module.exports = router;
