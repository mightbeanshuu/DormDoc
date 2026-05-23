/**
 * hodService.js
 *
 * All HOD business logic lives here. Route handlers stay thin.
 *
 * SECURITY INVARIANT: every exported function receives `department` from
 * req.scope.department (injected by scopeToDepartment middleware). No function
 * here ever reads req.query.department or req.body.department — the caller
 * is responsible for passing only the scoped value.
 */

// ─── Internal helpers ─────────────────────────────────────────────────────────

const ACTIVE_APPT_STATUSES = ['scheduled', 'confirmed', 'in_progress'];

/**
 * Returns student UUIDs that belong to `department`, plus a lookup map from
 * id → { name, student_id, year, email, phone, blood_group, emergency_contact }.
 */
async function getDeptStudentIndex(sb, department) {
  const { data: students, error } = await sb
    .from('students')
    .select('id, student_id, department, year, hostel, blood_group, chronic_conditions, is_currently_admitted, emergency_contact')
    .eq('department', department);
  if (error) throw error;
  const ids = (students || []).map((s) => s.id);
  if (!ids.length) return { ids: [], byId: {} };

  const { data: profiles } = await sb
    .from('profiles')
    .select('id, name, email, phone, is_active')
    .in('id', ids);
  const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

  const byId = {};
  for (const s of students || []) {
    const p = profileMap[s.id] || {};
    byId[s.id] = {
      ...s,
      name: p.name || null,
      email: p.email || null,
      phone: p.phone || null,
      isActive: p.is_active,
    };
  }
  return { ids, byId };
}

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function csvCell(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function csvRow(fields) {
  return fields.map(csvCell).join(',');
}

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const isUuid = (id) => typeof id === 'string' && UUID_RE.test(id);

async function hydrateDoctorNames(sb, doctorIds) {
  const unique = [...new Set((doctorIds || []).filter(Boolean))];
  if (!unique.length) return {};
  const [{ data: profiles }, { data: staff }] = await Promise.all([
    sb.from('profiles').select('id, name').in('id', unique),
    sb.from('dispensary_staff').select('id, specialization').in('id', unique),
  ]);
  const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p.name]));
  const staffMap = Object.fromEntries((staff || []).map((s) => [s.id, s.specialization]));
  return Object.fromEntries(
    unique.map((id) => [id, { name: profileMap[id] || null, specialization: staffMap[id] || null }])
  );
}

// ─── 1. Dashboard stats ───────────────────────────────────────────────────────

async function getDashboardStats(sb, department) {
  const { ids, byId } = await getDeptStudentIndex(sb, department);
  if (!ids.length) {
    return {
      pendingLeaves: 0,
      approvedThisMonth: 0,
      activeCases: 0,
      emergencyCases: 0,
      topSymptoms: [],
      recentLeaveActivity: [],
    };
  }

  const { start, end } = currentMonthRange();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [
    pendingRes,
    approvedRes,
    activeRes,
    emergencyRes,
    recentLeavesRes,
    recentSymptomsRes,
  ] = await Promise.all([
    sb.from('leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending').in('student_id', ids),
    sb
      .from('leave_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')
      .gte('decided_at', start.toISOString())
      .lte('decided_at', end.toISOString())
      .in('student_id', ids),
    sb
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .in('status', ACTIVE_APPT_STATUSES)
      .in('student_id', ids),
    sb
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('is_emergency', true)
      .not('status', 'in', '("completed","cancelled")')
      .in('student_id', ids),
    sb
      .from('leave_requests')
      .select('*')
      .in('student_id', ids)
      .order('created_at', { ascending: false })
      .limit(10),
    sb
      .from('appointments')
      .select('symptoms')
      .gte('created_at', ninetyDaysAgo)
      .neq('symptoms', '')
      .in('student_id', ids),
  ]);

  // Top symptoms — node-side group_by (PostgREST has no group_by)
  const symptomCounts = new Map();
  for (const row of recentSymptomsRes.data || []) {
    const s = (row.symptoms || '').trim();
    if (!s) continue;
    symptomCounts.set(s, (symptomCounts.get(s) || 0) + 1);
  }
  const topSymptoms = [...symptomCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([symptom, count]) => ({ symptom, count }));

  const recentLeaveActivity = (recentLeavesRes.data || []).map((lr) => {
    const s = byId[lr.student_id] || {};
    return {
      _id: lr.id,
      studentName: s.name || 'Unknown',
      studentId: s.student_id || '',
      year: s.year || '',
      reason: lr.reason || '',
      duration: lr.duration_days,
      status: lr.status,
      requestedAt: lr.created_at,
    };
  });

  return {
    pendingLeaves: pendingRes.count || 0,
    approvedThisMonth: approvedRes.count || 0,
    activeCases: activeRes.count || 0,
    emergencyCases: emergencyRes.count || 0,
    topSymptoms,
    recentLeaveActivity,
  };
}

// ─── 2. Leave request list ────────────────────────────────────────────────────

async function getLeaveRequests(sb, department, { page = 1, limit = 15, status } = {}) {
  const { ids, byId } = await getDeptStudentIndex(sb, department);
  if (!ids.length) return { items: [], total: 0, page: Number(page), totalPages: 0 };

  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(limit) || 15, 1), 200);
  const offset = (pageNum - 1) * limitNum;

  let query = sb.from('leave_requests').select('*', { count: 'exact' }).in('student_id', ids);
  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    query = query.eq('status', status);
  }

  const { data: rows, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limitNum - 1);
  if (error) throw error;

  const appointmentIds = (rows || []).map((r) => r.appointment_id);
  const { data: appointments } =
    appointmentIds.length
      ? await sb
          .from('appointments')
          .select('id, doctor_id, appointment_date, symptoms, diagnosis')
          .in('id', appointmentIds)
      : { data: [] };
  const apptMap = Object.fromEntries((appointments || []).map((a) => [a.id, a]));
  const doctorMap = await hydrateDoctorNames(sb, (appointments || []).map((a) => a.doctor_id));

  const items = (rows || []).map((lr) => {
    const appt = apptMap[lr.appointment_id];
    const s = byId[lr.student_id] || {};
    return {
      _id: lr.id,
      leaveRequest: {
        requested: true,
        status: lr.status,
        reason: lr.reason,
        duration: lr.duration_days,
        decidedAt: lr.decided_at,
        decidedBy: lr.decided_by,
        decidedByName: lr.decided_by_name,
        decisionRole: lr.decision_role,
        decisionComments: lr.decision_comments,
      },
      symptoms: appt?.symptoms || '',
      diagnosis: appt?.diagnosis || '',
      createdAt: lr.created_at,
      student: {
        _id: lr.student_id,
        name: s.name,
        studentId: s.student_id,
        department: s.department,
        year: s.year,
        email: s.email,
        phone: s.phone,
      },
      doctor: appt?.doctor_id
        ? { _id: appt.doctor_id, ...(doctorMap[appt.doctor_id] || {}) }
        : null,
      appointmentId: lr.appointment_id,
    };
  });

  return {
    items,
    total: count || 0,
    page: pageNum,
    totalPages: Math.ceil((count || 0) / limitNum),
  };
}

// ─── 3. Leave request detail ──────────────────────────────────────────────────

async function getLeaveRequestDetail(sb, leaveRequestId, department) {
  const { data: lr } = await sb.from('leave_requests').select('*').eq('id', leaveRequestId).maybeSingle();
  if (!lr) return null;

  // Department scope guard
  const { data: studentRow } = await sb
    .from('students')
    .select('id, student_id, department, year, blood_group, chronic_conditions, emergency_contact, is_currently_admitted')
    .eq('id', lr.student_id)
    .maybeSingle();
  if (!studentRow || studentRow.department !== department) return null;

  const { data: profile } = await sb
    .from('profiles')
    .select('name, email, phone')
    .eq('id', lr.student_id)
    .maybeSingle();

  const { data: appointment } =
    lr.appointment_id
      ? await sb.from('appointments').select('*').eq('id', lr.appointment_id).maybeSingle()
      : { data: null };

  let doctorMap = {};
  if (appointment?.doctor_id) doctorMap = await hydrateDoctorNames(sb, [appointment.doctor_id]);

  const { data: history } = await sb
    .from('leave_decisions')
    .select('*')
    .eq('leave_request_id', leaveRequestId)
    .order('decided_at', { ascending: false });

  return {
    appointment: {
      _id: appointment?.id,
      ...appointment,
      student: {
        _id: lr.student_id,
        name: profile?.name,
        studentId: studentRow.student_id,
        department: studentRow.department,
        year: studentRow.year,
        email: profile?.email,
        phone: profile?.phone,
        bloodGroup: studentRow.blood_group,
        emergencyContact: studentRow.emergency_contact,
      },
      doctor: appointment?.doctor_id
        ? { _id: appointment.doctor_id, ...(doctorMap[appointment.doctor_id] || {}) }
        : null,
      leaveRequest: {
        requested: true,
        _id: lr.id,
        status: lr.status,
        reason: lr.reason,
        duration: lr.duration_days,
        decidedAt: lr.decided_at,
        decidedBy: lr.decided_by,
        decidedByName: lr.decided_by_name,
        decisionRole: lr.decision_role,
        decisionComments: lr.decision_comments,
      },
    },
    approvalHistory: history || [],
  };
}

// ─── 4. Process leave decision (approve / reject) ─────────────────────────────

async function processLeaveDecision(
  sb,
  leaveRequestId,
  department,
  { deciderId, deciderName, action, comments, ipAddress, userAgent }
) {
  if (!['approved', 'rejected'].includes(action)) {
    throw Object.assign(new Error('action must be "approved" or "rejected"'), { status: 400 });
  }
  if (action === 'rejected' && !comments?.trim()) {
    throw Object.assign(new Error('Comments are required when rejecting a leave request'), { status: 400 });
  }

  const { data: lr } = await sb.from('leave_requests').select('*').eq('id', leaveRequestId).maybeSingle();
  if (!lr) {
    throw Object.assign(new Error('Leave request not found or not in your department'), { status: 404 });
  }

  // Department scope guard
  const { data: studentRow } = await sb
    .from('students')
    .select('department')
    .eq('id', lr.student_id)
    .maybeSingle();
  if (!studentRow || studentRow.department !== department) {
    throw Object.assign(new Error('Leave request not found or not in your department'), { status: 404 });
  }
  const { data: profile } = await sb
    .from('profiles')
    .select('name')
    .eq('id', lr.student_id)
    .maybeSingle();

  if (lr.status !== 'pending') {
    throw Object.assign(
      new Error(`This leave request has already been ${lr.status}. Re-decisions are not permitted.`),
      { status: 409 }
    );
  }

  const now = new Date().toISOString();

  const { data: updated, error: updErr } = await sb
    .from('leave_requests')
    .update({
      status: action,
      decided_by: deciderId,
      decided_by_name: deciderName,
      decided_at: now,
      decision_role: 'hod',
      decision_comments: comments || '',
      hod_reviewed_at: now,
    })
    .eq('id', leaveRequestId)
    .select()
    .single();
  if (updErr) throw updErr;

  const { data: auditRow, error: auditErr } = await sb
    .from('leave_decisions')
    .insert({
      leave_request_id: leaveRequestId,
      student_id: lr.student_id,
      student_name: profile?.name || '',
      student_department: studentRow.department,
      decider_id: deciderId,
      decider_name: deciderName,
      decider_role: 'hod',
      action,
      comments: comments || '',
      leave_snapshot: { duration: updated.duration_days, reason: updated.reason, status: action },
      ip_address: ipAddress || '',
      user_agent: userAgent || '',
    })
    .select()
    .single();
  if (auditErr) throw auditErr;

  return { appointment: updated, auditRecord: { _id: auditRow.id, ...auditRow } };
}

// ─── 5. Department student roster ─────────────────────────────────────────────

async function getDepartmentStudents(sb, department, { page = 1, limit = 20, search = '' } = {}) {
  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 200);
  const offset = (pageNum - 1) * limitNum;

  let restrictIds = null;
  if (search.trim()) {
    const term = `%${search.trim().replace(/[%_,()]/g, '\\$&')}%`;
    const [{ data: matchedProfiles }, { data: matchedStudents }] = await Promise.all([
      sb.from('profiles').select('id').or(`name.ilike.${term},email.ilike.${term}`),
      sb.from('students').select('id').ilike('student_id', term),
    ]);
    restrictIds = new Set([
      ...(matchedProfiles || []).map((r) => r.id),
      ...(matchedStudents || []).map((r) => r.id),
    ]);
  }

  let query = sb
    .from('students')
    .select('id, student_id, department, year, programme, hostel, blood_group, chronic_conditions, is_currently_admitted', {
      count: 'exact',
    })
    .eq('department', department);
  if (restrictIds) {
    const list = [...restrictIds];
    if (!list.length) return { students: [], total: 0, page: pageNum, totalPages: 0 };
    query = query.in('id', list);
  }

  const { data: studentRows, count, error } = await query
    .order('student_id', { ascending: true })
    .range(offset, offset + limitNum - 1);
  if (error) throw error;

  const ids = (studentRows || []).map((r) => r.id);
  let profileMap = {};
  if (ids.length) {
    const { data: profiles } = await sb
      .from('profiles')
      .select('id, name, email, phone, is_active')
      .in('id', ids);
    profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
  }

  const students = (studentRows || []).map((s) => {
    const p = profileMap[s.id] || {};
    return {
      _id: s.id,
      name: p.name || null,
      studentId: s.student_id,
      email: p.email || null,
      phone: p.phone || null,
      department: s.department,
      year: s.year,
      programme: s.programme,
      hostel: s.hostel,
      bloodGroup: s.blood_group,
      chronicConditions: s.chronic_conditions || [],
      isActive: p.is_active ?? true,
      isCurrentlyAdmitted: s.is_currently_admitted,
    };
  });

  return { students, total: count || 0, page: pageNum, totalPages: Math.ceil((count || 0) / limitNum) };
}

// ─── 6. Individual student medical summary ────────────────────────────────────

async function getStudentMedicalSummary(sb, studentId, department) {
  const { data: studentRow } = await sb
    .from('students')
    .select('*')
    .eq('id', studentId)
    .maybeSingle();
  if (!studentRow || studentRow.department !== department) return null;

  const { data: profile } = await sb
    .from('profiles')
    .select('id, name, email, phone, is_active, last_login_at')
    .eq('id', studentId)
    .maybeSingle();

  const [{ data: appointments }, { data: leaveHistory }, { data: leaveRequests }] = await Promise.all([
    sb
      .from('appointments')
      .select('id, doctor_id, appointment_date, status, symptoms, diagnosis, treatment, created_at')
      .eq('student_id', studentId)
      .order('appointment_date', { ascending: false })
      .limit(20),
    sb
      .from('leave_decisions')
      .select('*')
      .eq('student_id', studentId)
      .order('decided_at', { ascending: false })
      .limit(10),
    sb.from('leave_requests').select('id, status').eq('student_id', studentId),
  ]);

  const doctorMap = await hydrateDoctorNames(sb, (appointments || []).map((a) => a.doctor_id));

  const totalLeaveRequests = (leaveRequests || []).length;
  const approvedLeaves = (leaveRequests || []).filter((l) => l.status === 'approved').length;

  const profileBlock = {
    ...studentRow,
    _id: studentRow.id,
    name: profile?.name,
    email: profile?.email,
    phone: profile?.phone,
    isActive: profile?.is_active ?? true,
    studentId: studentRow.student_id,
    bloodGroup: studentRow.blood_group,
    chronicConditions: studentRow.chronic_conditions || [],
    emergencyContact: studentRow.emergency_contact || {},
  };

  return {
    profile: profileBlock,
    appointments: (appointments || []).map((a) => ({
      _id: a.id,
      appointmentDate: a.appointment_date,
      status: a.status,
      symptoms: a.symptoms,
      diagnosis: a.diagnosis,
      treatment: a.treatment,
      createdAt: a.created_at,
      doctor: a.doctor_id ? { _id: a.doctor_id, ...(doctorMap[a.doctor_id] || {}) } : null,
    })),
    leaveHistory: leaveHistory || [],
    summary: {
      totalAppointments: (appointments || []).length,
      totalLeaveRequests,
      approvedLeaves,
      chronicConditions: studentRow.chronic_conditions || [],
    },
  };
}

// ─── 7. Active medical cases ──────────────────────────────────────────────────

async function getActiveCases(sb, department) {
  const { ids, byId } = await getDeptStudentIndex(sb, department);
  if (!ids.length) return [];

  const { data: cases, error } = await sb
    .from('appointments')
    .select(
      'id, appointment_date, appointment_time, status, symptoms, diagnosis, treatment, is_emergency, priority, doctor_id, student_id'
    )
    .in('student_id', ids)
    .in('status', ACTIVE_APPT_STATUSES)
    .order('priority', { ascending: false })
    .order('appointment_date', { ascending: true });
  if (error) throw error;

  const doctorMap = await hydrateDoctorNames(sb, (cases || []).map((c) => c.doctor_id));

  return (cases || []).map((c) => {
    const s = byId[c.student_id] || {};
    return {
      _id: c.id,
      appointmentDate: c.appointment_date,
      appointmentTime: c.appointment_time,
      status: c.status,
      symptoms: c.symptoms,
      diagnosis: c.diagnosis,
      treatment: c.treatment,
      isEmergency: c.is_emergency,
      priority: c.priority,
      student: {
        _id: c.student_id,
        name: s.name,
        studentId: s.student_id,
        department: s.department,
        year: s.year,
        hostel: s.hostel,
      },
      doctor: c.doctor_id ? { _id: c.doctor_id, ...(doctorMap[c.doctor_id] || {}) } : null,
    };
  });
}

// ─── 8. Department analytics ──────────────────────────────────────────────────

async function getDepartmentAnalytics(sb, department) {
  const { ids, byId } = await getDeptStudentIndex(sb, department);
  if (!ids.length) {
    return {
      monthlyLeaves: [],
      topSymptoms: [],
      demographics: [],
      recoveryRate: 0,
      totalAppointments: 0,
      completedAppointments: 0,
      emergencyCount: 0,
      yearWiseLeaves: [],
    };
  }

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: leaves12mo },
    { data: symptoms90 },
    { data: appointmentSummary },
    { data: yearLeaves },
  ] = await Promise.all([
    sb
      .from('leave_requests')
      .select('created_at, status')
      .in('student_id', ids)
      .gte('created_at', twelveMonthsAgo.toISOString()),
    sb
      .from('appointments')
      .select('symptoms')
      .in('student_id', ids)
      .gte('created_at', ninetyDaysAgo)
      .neq('symptoms', ''),
    sb.from('appointments').select('status, is_emergency').in('student_id', ids),
    sb.from('leave_requests').select('student_id').in('student_id', ids),
  ]);

  // Monthly leaves bucket
  const monthBuckets = new Map();
  for (const lr of leaves12mo || []) {
    const d = new Date(lr.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthBuckets.has(key)) {
      monthBuckets.set(key, {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: key,
        total: 0,
        approved: 0,
        rejected: 0,
        pending: 0,
      });
    }
    const b = monthBuckets.get(key);
    b.total += 1;
    if (b[lr.status] != null) b[lr.status] += 1;
  }
  const monthlyLeaves = [...monthBuckets.values()].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month
  );

  // Top symptoms
  const symptomCounts = new Map();
  for (const row of symptoms90 || []) {
    const s = (row.symptoms || '').trim();
    if (!s) continue;
    symptomCounts.set(s, (symptomCounts.get(s) || 0) + 1);
  }
  const topSymptoms = [...symptomCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([symptom, count]) => ({ symptom, count }));

  // Recovery stats
  let total = 0, completed = 0, cancelled = 0, emergency = 0;
  for (const row of appointmentSummary || []) {
    total += 1;
    if (row.status === 'completed') completed += 1;
    if (row.status === 'cancelled') cancelled += 1;
    if (row.is_emergency) emergency += 1;
  }
  const recoveryRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Demographics by year (from byId map)
  const yearDemoBuckets = new Map();
  for (const s of Object.values(byId)) {
    const y = s.year || 'Unknown';
    yearDemoBuckets.set(y, (yearDemoBuckets.get(y) || 0) + 1);
  }
  const demographics = [...yearDemoBuckets.entries()]
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .map(([year, count]) => ({ year, count }));

  // Year-wise leaves
  const yearLeaveBuckets = new Map();
  for (const row of yearLeaves || []) {
    const y = byId[row.student_id]?.year || 'Unknown';
    yearLeaveBuckets.set(y, (yearLeaveBuckets.get(y) || 0) + 1);
  }
  const yearWiseLeaves = [...yearLeaveBuckets.entries()]
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .map(([year, count]) => ({ year, count }));

  return {
    monthlyLeaves,
    topSymptoms,
    demographics,
    recoveryRate,
    totalAppointments: total,
    completedAppointments: completed,
    emergencyCount: emergency,
    yearWiseLeaves,
  };
}

// ─── 9. Monthly CSV report ────────────────────────────────────────────────────

async function getMonthlyReportCsv(sb, department, year, month) {
  const monthNum = Number(month);
  const yearNum = Number(year);

  if (
    !monthNum || monthNum < 1 || monthNum > 12 ||
    !yearNum || yearNum < 2000 || yearNum > 2100
  ) {
    throw Object.assign(
      new Error('Valid year (2000–2100) and month (1–12) are required'),
      { status: 400 }
    );
  }

  const start = new Date(yearNum, monthNum - 1, 1);
  const end = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

  const { ids, byId } = await getDeptStudentIndex(sb, department);
  if (!ids.length) {
    return {
      csv: csvRow([
        'Date', 'Student Name', 'Student ID', 'Year', 'Email', 'Department',
        'Symptoms', 'Diagnosis', 'Status', 'Leave Requested', 'Leave Duration (days)',
        'Leave Status', 'Leave Reason', 'Doctor', 'Specialization', 'Is Emergency',
      ]),
      filename: `hod-report-${department.replace(/\s+/g, '_')}-${yearNum}-${String(monthNum).padStart(2, '0')}.csv`,
      recordCount: 0,
    };
  }

  const { data: appointments } = await sb
    .from('appointments')
    .select('id, appointment_date, doctor_id, status, symptoms, diagnosis, is_emergency, student_id, created_at')
    .in('student_id', ids)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  const appointmentIds = (appointments || []).map((a) => a.id);
  const { data: leaveRequestsForMonth } =
    appointmentIds.length
      ? await sb
          .from('leave_requests')
          .select('appointment_id, duration_days, reason, status')
          .in('appointment_id', appointmentIds)
      : { data: [] };
  const leaveMap = Object.fromEntries(
    (leaveRequestsForMonth || []).map((lr) => [lr.appointment_id, lr])
  );

  const doctorMap = await hydrateDoctorNames(sb, (appointments || []).map((a) => a.doctor_id));

  const headers = [
    'Date', 'Student Name', 'Student ID', 'Year', 'Email', 'Department',
    'Symptoms', 'Diagnosis', 'Status', 'Leave Requested', 'Leave Duration (days)',
    'Leave Status', 'Leave Reason', 'Doctor', 'Specialization', 'Is Emergency',
  ];

  const rows = (appointments || []).map((a) => {
    const s = byId[a.student_id] || {};
    const lr = leaveMap[a.id];
    const doc = a.doctor_id ? doctorMap[a.doctor_id] || {} : {};
    return [
      a.appointment_date || '',
      s.name || '',
      s.student_id || '',
      s.year || '',
      s.email || '',
      s.department || department,
      a.symptoms || '',
      a.diagnosis || '',
      a.status || '',
      lr ? 'Yes' : 'No',
      lr ? lr.duration_days : '',
      lr ? lr.status : '',
      lr ? lr.reason : '',
      doc.name || '',
      doc.specialization || '',
      a.is_emergency ? 'Yes' : 'No',
    ];
  });

  const csvLines = [csvRow(headers), ...rows.map(csvRow)];
  return {
    csv: csvLines.join('\r\n'),
    filename: `hod-report-${department.replace(/\s+/g, '_')}-${yearNum}-${String(monthNum).padStart(2, '0')}.csv`,
    recordCount: rows.length,
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  isUuid,
  getDashboardStats,
  getLeaveRequests,
  getLeaveRequestDetail,
  processLeaveDecision,
  getDepartmentStudents,
  getStudentMedicalSummary,
  getActiveCases,
  getDepartmentAnalytics,
  getMonthlyReportCsv,
};
