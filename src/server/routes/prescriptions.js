const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/prescriptions');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + suffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
    return ok ? cb(null, true) : cb(new Error('Only images and PDF files are allowed'));
  },
});

router.use(authenticateToken);

const PRESCRIPTION_SELECT = '*, medications:prescription_medications(id, name, dosage, frequency, duration, instructions, position)';

const parseMedications = (raw) => {
  if (!raw) return [];
  const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!Array.isArray(arr)) return [];
  return arr.map((m, i) => ({
    name: m.name ?? '',
    dosage: m.dosage ?? '',
    frequency: m.frequency ?? '',
    duration: m.duration ?? '',
    instructions: m.instructions ?? '',
    position: m.position ?? i,
  }));
};

const writeMedications = async (sb, prescriptionId, meds) => {
  if (!meds.length) return;
  const rows = meds.map((m) => ({ ...m, prescription_id: prescriptionId }));
  const { error } = await sb.from('prescription_medications').insert(rows);
  if (error) throw error;
};

// Hydrate doctor + student names for admin/doctor listings. Avoids the
// embedded-relationship-name footgun by joining via service-role since
// these endpoints already require staff access.
const hydrateNames = async (req, rows) => {
  const ids = [
    ...new Set(
      rows.flatMap((r) => [r.student_id, r.doctor_id]).filter(Boolean)
    ),
  ];
  if (!ids.length) return {};
  const { data } = await req.sb.from('profiles').select('id, name, email').in('id', ids);
  const map = {};
  for (const row of data || []) map[row.id] = row;
  return map;
};

// === STUDENT ROUTES ===
router.get('/student/prescriptions', async (req, res) => {
  const { data, error } = await req.sb
    .from('prescriptions')
    .select(PRESCRIPTION_SELECT)
    .eq('student_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

router.post('/student/prescriptions/upload', upload.single('prescriptionFile'), async (req, res) => {
  try {
    const { doctorName, date, medications, notes } = req.body;
    if (!doctorName || !date || !medications) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const { data: prescription, error } = await req.sb
      .from('prescriptions')
      .insert({
        student_id: req.user.id,
        doctor_name: doctorName,
        date,
        notes: notes ?? '',
        file_url: req.file ? `/uploads/prescriptions/${req.file.filename}` : null,
        status: 'pending',
      })
      .select()
      .single();
    if (error) throw error;

    await writeMedications(req.sb, prescription.id, parseMedications(medications));

    const { data: hydrated } = await req.sb
      .from('prescriptions')
      .select(PRESCRIPTION_SELECT)
      .eq('id', prescription.id)
      .single();
    res.json(hydrated);
  } catch (error) {
    console.error('Upload prescription error:', error);
    res.status(500).json({ message: error.message || 'Server error uploading prescription' });
  }
});

router.delete('/student/prescriptions/:id', async (req, res) => {
  const { data: prescription, error: readErr } = await req.sb
    .from('prescriptions')
    .select('id, student_id, file_url')
    .eq('id', req.params.id)
    .maybeSingle();
  if (readErr) return res.status(500).json({ message: readErr.message });
  if (!prescription) return res.status(404).json({ message: 'Prescription not found' });
  if (prescription.student_id !== req.user.id) return res.status(403).json({ message: 'Not authorized to delete this prescription' });

  if (prescription.file_url) {
    const filePath = path.join(__dirname, '..', prescription.file_url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  const { error } = await req.sb.from('prescriptions').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: 'Prescription deleted successfully' });
});

// === ADMIN ROUTES ===
router.get('/admin/prescriptions', requireRole(['admin']), async (req, res) => {
  const { data, error } = await req.sb
    .from('prescriptions')
    .select(PRESCRIPTION_SELECT)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ message: error.message });

  const names = await hydrateNames(req, data || []);
  res.json((data || []).map((p) => ({
    ...p,
    student: names[p.student_id] || null,
    doctor: names[p.doctor_id] || null,
  })));
});

router.put('/admin/prescriptions/:id/status', requireRole(['admin']), async (req, res) => {
  const { status } = req.body;
  const { data, error } = await req.sb
    .from('prescriptions')
    .update({ status })
    .eq('id', req.params.id)
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ message: error.message });
  if (!data) return res.status(404).json({ message: 'Prescription not found' });
  res.json(data);
});

router.delete('/admin/prescriptions/:id', requireRole(['admin']), async (req, res) => {
  const { data: prescription, error: readErr } = await req.sb
    .from('prescriptions')
    .select('id, file_url')
    .eq('id', req.params.id)
    .maybeSingle();
  if (readErr) return res.status(500).json({ message: readErr.message });
  if (!prescription) return res.status(404).json({ message: 'Prescription not found' });

  if (prescription.file_url) {
    const filePath = path.join(__dirname, '..', prescription.file_url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  const { error } = await req.sb.from('prescriptions').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: 'Prescription deleted successfully' });
});

// === DOCTOR ROUTES ===
router.get('/doctor/prescriptions', requireRole(['doctor']), async (req, res) => {
  const { data, error } = await req.sb
    .from('prescriptions')
    .select(PRESCRIPTION_SELECT)
    .eq('doctor_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ message: error.message });

  const names = await hydrateNames(req, data || []);
  res.json((data || []).map((p) => ({ ...p, student: names[p.student_id] || null })));
});

router.post('/doctor/prescriptions', requireRole(['doctor']), async (req, res) => {
  try {
    const { studentId, date, medications, notes } = req.body;
    if (!studentId || !date || !medications) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const { data: student } = await req.sb.from('profiles').select('id').eq('id', studentId).maybeSingle();
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const { data: prescription, error } = await req.sb
      .from('prescriptions')
      .insert({
        student_id: studentId,
        doctor_id: req.user.id,
        doctor_name: req.user.name,
        date,
        notes: notes ?? '',
        status: 'active',
      })
      .select()
      .single();
    if (error) throw error;

    await writeMedications(req.sb, prescription.id, parseMedications(medications));

    const { data: hydrated } = await req.sb
      .from('prescriptions')
      .select(PRESCRIPTION_SELECT)
      .eq('id', prescription.id)
      .single();
    res.json(hydrated);
  } catch (error) {
    console.error('Create prescription error:', error);
    res.status(500).json({ message: error.message || 'Server error creating prescription' });
  }
});

// === GET BY ID ===
router.get('/:id', async (req, res) => {
  const { data: prescription, error } = await req.sb
    .from('prescriptions')
    .select(PRESCRIPTION_SELECT)
    .eq('id', req.params.id)
    .maybeSingle();
  if (error) return res.status(500).json({ message: error.message });
  if (!prescription) return res.status(404).json({ message: 'Prescription not found' });

  if (req.user.role === 'student' && prescription.student_id !== req.user.id) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const names = await hydrateNames(req, [prescription]);
  res.json({
    ...prescription,
    student: names[prescription.student_id] || null,
    doctor: names[prescription.doctor_id] || null,
  });
});

module.exports = router;
