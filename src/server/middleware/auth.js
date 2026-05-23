const jwt = require('jsonwebtoken');
const { supabaseAdmin, supabaseForUser } = require('../db/supabase');

const DEV_STUDENT_UUID = '00000000-0000-0000-0000-000000000001';
const DEV_HOD_UUID = '00000000-0000-0000-0000-000000000002';
const DEV_ADMIN_UUID = '00000000-0000-0000-0000-000000000003';

const devStudentUser = {
  id: DEV_STUDENT_UUID,
  _id: DEV_STUDENT_UUID,
  name: 'Test Student',
  email: 'dev-student@bitmesra.local',
  role: 'student',
  studentId: 'BIT123',
  department: 'Computer Science',
  bloodGroup: 'O+',
};

const devHodUser = {
  id: DEV_HOD_UUID,
  _id: DEV_HOD_UUID,
  name: 'Test HOD',
  email: 'dev-hod@bitmesra.local',
  role: 'hod',
  facultyId: 'BIT-FAC-HOD-001',
  department: 'Computer Science',
  hodDepartment: 'Computer Science',
  designation: 'HOD',
  hodPermissions: {
    canApproveLeave: true,
    canViewMedicalHistory: true,
    canExportReports: true,
  },
};

const devAdminUser = {
  id: DEV_ADMIN_UUID,
  _id: DEV_ADMIN_UUID,
  name: 'Test Admin',
  email: 'dev-admin@bitmesra.local',
  role: 'admin',
  staffId: 'BIT-DISP-ADMIN-001',
  staffType: 'admin_staff',
  designation: 'Admin',
};

// Pull the role-specific row alongside the profile so downstream routes see the
// fields they used to read off the Mongo User document. Phase 3 will replace
// these joins with per-route Supabase calls; this is the transition shim.
const ROLE_TABLES = {
  student: { table: 'students', select: 'student_id, department, year, hostel, room_number, blood_group, allergies, chronic_conditions, emergency_contact, qr_code, is_currently_admitted' },
  faculty: { table: 'faculty', select: 'faculty_id, department, designation, hod_department, hod_permissions, blood_group, emergency_contact' },
  hod: { table: 'faculty', select: 'faculty_id, department, designation, hod_department, hod_permissions, blood_group, emergency_contact' },
  dean: { table: 'faculty', select: 'faculty_id, department, designation, blood_group, emergency_contact' },
  admin: { table: 'dispensary_staff', select: 'staff_id, staff_type, designation, blood_group, emergency_contact' },
  doctor: { table: 'dispensary_staff', select: 'staff_id, staff_type, designation, license_number, specialization, blood_group, emergency_contact' },
  dispensary_staff: { table: 'dispensary_staff', select: 'staff_id, staff_type, designation, blood_group, emergency_contact' },
  parent: { table: 'parents', select: 'parent_id, relation_to_student, is_verified, alternate_phone' },
};

const snakeToCamel = (key) => key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const toCamel = (row) => {
  if (!row || typeof row !== 'object') return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) out[snakeToCamel(k)] = v;
  return out;
};

async function loadUserFromProfile(userId) {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id, role, name, email, phone, photo_url, is_active, last_login_at')
    .eq('id', userId)
    .single();

  if (error || !profile) return null;
  if (!profile.is_active) return { inactive: true };

  const roleInfo = ROLE_TABLES[profile.role];
  let roleRow = null;
  if (roleInfo) {
    const { data } = await supabaseAdmin
      .from(roleInfo.table)
      .select(roleInfo.select)
      .eq('id', userId)
      .maybeSingle();
    roleRow = data;
  }

  return {
    id: profile.id,
    _id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    phone: profile.phone,
    photoUrl: profile.photo_url,
    isActive: profile.is_active,
    lastLoginAt: profile.last_login_at,
    ...toCamel(roleRow || {}),
  };
}

function verifySupabaseJwt(token) {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error('SUPABASE_JWT_SECRET not configured');
  return jwt.verify(token, secret, { algorithms: ['HS256'] });
}

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const isDev = process.env.NODE_ENV === 'development';

    if (!token) {
      if (isDev) {
        req.user = devStudentUser;
        req.sb = supabaseAdmin;
        return next();
      }
      return res.status(401).json({ message: 'Access token required' });
    }

    if (isDev && token === 'dev_token') {
      req.user = devStudentUser;
      req.sb = supabaseAdmin;
      return next();
    }
    if (isDev && token === 'hod_dev_token') {
      req.user = devHodUser;
      req.sb = supabaseAdmin;
      return next();
    }
    if (isDev && token === 'admin_dev_token') {
      req.user = devAdminUser;
      req.sb = supabaseAdmin;
      return next();
    }

    const decoded = verifySupabaseJwt(token);
    const user = await loadUserFromProfile(decoded.sub);

    if (!user) return res.status(401).json({ message: 'Profile not found' });
    if (user.inactive) return res.status(401).json({ message: 'Account deactivated' });

    req.user = user;
    req.accessToken = token;
    req.sb = supabaseForUser(token);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Invalid token' });
    }
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: 'Auth check failed' });
  }
};

const requireRole = (roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Access restricted to: ${roles.join(', ')}`,
    });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

const requireStudent = (req, res, next) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Student access required' });
  }
  next();
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifySupabaseJwt(token);
      const user = await loadUserFromProfile(decoded.sub);
      if (user && !user.inactive) {
        req.user = user;
        req.accessToken = token;
        req.sb = supabaseForUser(token);
      }
    }
    next();
  } catch (error) {
    next();
  }
};

const sensitiveOperationLimit = (req, res, next) => {
  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireStudent,
  optionalAuth,
  sensitiveOperationLimit,
  verifySupabaseJwt,
  loadUserFromProfile,
};
