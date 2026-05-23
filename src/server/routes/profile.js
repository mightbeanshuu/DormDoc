const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const { supabaseAdmin } = require('../db/supabase');

const ROLE_TABLES = {
  student: 'students',
  faculty: 'faculty',
  hod: 'faculty',
  dean: 'faculty',
  admin: 'dispensary_staff',
  doctor: 'dispensary_staff',
  dispensary_staff: 'dispensary_staff',
  parent: 'parents',
};

const PROFILE_COLUMNS = new Set(['name', 'phone', 'photo_url']);
const STUDENT_COLUMNS = new Set([
  'department', 'year', 'hostel', 'room_number', 'blood_group',
  'allergies', 'current_medications', 'chronic_conditions',
  'emergency_contact', 'roll_number', 'section', 'programme', 'batch',
]);
const FACULTY_COLUMNS = new Set([
  'department', 'designation', 'specialization', 'qualification',
  'cabin_number', 'campus_address', 'blood_group', 'emergency_contact',
]);
const STAFF_COLUMNS = new Set([
  'staff_type', 'designation', 'license_number', 'specialization',
  'qualification', 'blood_group', 'emergency_contact',
]);

const roleColumnSet = (role) => {
  if (role === 'student') return STUDENT_COLUMNS;
  if (role === 'faculty' || role === 'hod' || role === 'dean') return FACULTY_COLUMNS;
  if (role === 'admin' || role === 'doctor' || role === 'dispensary_staff') return STAFF_COLUMNS;
  return new Set();
};

const splitPatch = (body, role) => {
  const roleCols = roleColumnSet(role);
  const profilePatch = {};
  const rolePatch = {};
  for (const [key, value] of Object.entries(body)) {
    if (PROFILE_COLUMNS.has(key)) profilePatch[key] = value;
    else if (roleCols.has(key)) rolePatch[key] = value;
    // Silently drop unknown keys so old clients sending legacy field names
    // (medicalHistory, address, etc.) don't 400 — Phase 3 follow-up can
    // re-enable them as the schema evolves.
  }
  return { profilePatch, rolePatch };
};

// GET /api/student/profile — caller's combined profile + role-specific row
router.get('/profile', auth, async (req, res) => {
  try {
    const sb = req.sb;
    const { data: profile, error: profileErr } = await sb
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .maybeSingle();
    if (profileErr) throw profileErr;
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    const roleTable = ROLE_TABLES[profile.role];
    let roleRow = null;
    if (roleTable) {
      const { data } = await sb.from(roleTable).select('*').eq('id', req.user.id).maybeSingle();
      roleRow = data;
    }

    res.json({ ...profile, ...(roleRow || {}) });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// PUT /api/student/profile — patch profiles + role-specific row
router.put('/profile', auth, async (req, res) => {
  try {
    const { profilePatch, rolePatch } = splitPatch(req.body, req.user.role);
    const sb = req.sb;

    if (Object.keys(profilePatch).length) {
      const { error } = await sb.from('profiles').update(profilePatch).eq('id', req.user.id);
      if (error) throw error;
    }

    const roleTable = ROLE_TABLES[req.user.role];
    if (roleTable && Object.keys(rolePatch).length) {
      const { error } = await sb.from(roleTable).update(rolePatch).eq('id', req.user.id);
      if (error) throw error;
    }

    // Re-read so the caller gets the post-write state.
    const { data: profile } = await sb.from('profiles').select('*').eq('id', req.user.id).single();
    let roleRow = null;
    if (roleTable) {
      const { data } = await sb.from(roleTable).select('*').eq('id', req.user.id).maybeSingle();
      roleRow = data;
    }

    res.json({ message: 'Profile updated successfully', user: { ...profile, ...(roleRow || {}) } });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(400).json({ message: error.message || 'Server error updating profile' });
  }
});

// POST /api/student/upload-profile-picture — accepts a URL, persists to profiles.photo_url
router.post('/upload-profile-picture', auth, async (req, res) => {
  try {
    const { profilePictureUrl } = req.body;
    if (!profilePictureUrl) return res.status(400).json({ message: 'Profile picture URL is required' });

    const sb = req.sb;
    const { error } = await sb.from('profiles').update({ photo_url: profilePictureUrl }).eq('id', req.user.id);
    if (error) throw error;

    res.json({ message: 'Profile picture updated successfully', profilePicture: profilePictureUrl });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({ message: 'Server error uploading profile picture' });
  }
});

// GET /api/student/medical-history — caller's recent appointments + prescriptions.
router.get('/medical-history', auth, async (req, res) => {
  try {
    const sb = req.sb;

    const [appointmentsResult, prescriptionsResult] = await Promise.all([
      sb
        .from('appointments')
        .select('id, appointment_date, status, symptoms, doctor_id')
        .eq('student_id', req.user.id)
        .order('appointment_date', { ascending: false })
        .limit(10),
      sb
        .from('prescriptions')
        .select('id, created_at, status, medications, doctor_id')
        .eq('student_id', req.user.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    if (appointmentsResult.error) throw appointmentsResult.error;
    if (prescriptionsResult.error) throw prescriptionsResult.error;

    const doctorIds = [
      ...new Set([
        ...appointmentsResult.data?.map((a) => a.doctor_id).filter(Boolean) || [],
        ...prescriptionsResult.data?.map((p) => p.doctor_id).filter(Boolean) || [],
      ]),
    ];
    const doctorNames = {};
    if (doctorIds.length) {
      const { data: doctorRows } = await supabaseAdmin
        .from('profiles')
        .select('id, name')
        .in('id', doctorIds);
      for (const row of doctorRows || []) doctorNames[row.id] = row.name;
    }

    res.json({
      appointments: (appointmentsResult.data || []).map((a) => ({
        id: a.id,
        date: a.appointment_date,
        doctor: doctorNames[a.doctor_id] || 'Unknown',
        reason: a.symptoms,
        status: a.status,
      })),
      prescriptions: (prescriptionsResult.data || []).map((p) => ({
        id: p.id,
        date: p.created_at,
        doctor: doctorNames[p.doctor_id] || 'Unknown',
        medications: p.medications,
        status: p.status,
      })),
    });
  } catch (error) {
    console.error('Get medical history error:', error);
    res.status(500).json({ message: 'Server error fetching medical history' });
  }
});

// PUT /api/student/notifications — notification_settings column doesn't exist
// yet on profiles/students. Accept and ignore so the UI keeps working; persist
// once a settings table or jsonb column lands in a future migration.
router.put('/notifications', auth, (req, res) => {
  res.json({
    message: 'Notification preferences accepted (storage pending — Phase 3 follow-up)',
    notificationSettings: req.body,
  });
});

// GET /api/student/activity-history — placeholder, login_logs ingestion is a follow-up
router.get('/activity-history', auth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('login_logs')
      .select('id, action, status, ip_address, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    res.json({
      activities: (data || []).map((row) => ({
        id: row.id,
        type: row.action,
        description: `${row.action} (${row.status})`,
        timestamp: row.created_at,
        icon: row.action === 'password_change' ? 'security' : 'event',
      })),
    });
  } catch (error) {
    console.error('Get activity history error:', error);
    res.status(500).json({ message: 'Server error fetching activity history' });
  }
});

// PUT /api/student/change-password — removed in Phase 2 (Supabase Auth, no
// password). Surface a clear 410 so any stale UI gets a useful message.
router.put('/change-password', auth, (req, res) => {
  res.status(410).json({
    message: 'Passwords are gone — sign in is via 6-digit email OTP. Nothing to change.',
  });
});

module.exports = router;
