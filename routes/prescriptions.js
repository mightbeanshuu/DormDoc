const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const Prescription = require('../models/Prescription');
const User = require('../models/User');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/prescriptions');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed'));
    }
  }
});

// Apply authentication to all routes
router.use(authenticateToken);

// @route   GET /api/student/prescriptions
// @desc    Get student prescriptions
// @access  Private
router.get('/student/prescriptions', async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ student: req.user.id })
      .populate('doctor', 'name specialization')
      .sort({ createdAt: -1 });

    res.json(prescriptions);
  } catch (error) {
    console.error('Get prescriptions error:', error);
    res.status(500).json({ message: 'Server error fetching prescriptions' });
  }
});

// @route   POST /api/student/prescriptions/upload
// @desc    Upload new prescription
// @access  Private
router.post('/student/prescriptions/upload', upload.single('prescriptionFile'), async (req, res) => {
  try {
    const { doctorName, date, medications, notes } = req.body;
    
    if (!doctorName || !date || !medications) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const prescription = new Prescription({
      student: req.user.id,
      doctorName,
      date: new Date(date),
      medications: JSON.parse(medications),
      notes,
      fileUrl: req.file ? `/uploads/prescriptions/${req.file.filename}` : null,
      status: 'pending'
    });

    await prescription.save();
    res.json(prescription);
  } catch (error) {
    console.error('Upload prescription error:', error);
    res.status(500).json({ message: 'Server error uploading prescription' });
  }
});

// @route   DELETE /api/student/prescriptions/:id
// @desc    Delete prescription
// @access  Private
router.delete('/student/prescriptions/:id', async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    if (prescription.student.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this prescription' });
    }

    // Delete file if exists
    if (prescription.fileUrl) {
      const filePath = path.join(__dirname, '..', prescription.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Prescription.findByIdAndDelete(req.params.id);
    res.json({ message: 'Prescription deleted successfully' });
  } catch (error) {
    console.error('Delete prescription error:', error);
    res.status(500).json({ message: 'Server error deleting prescription' });
  }
});

// @route   GET /api/admin/prescriptions
// @desc    Get all prescriptions for admin
// @access  Private (Admin only)
router.get('/admin/prescriptions', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const prescriptions = await Prescription.find()
      .populate('student', 'name email studentId')
      .populate('doctor', 'name specialization')
      .sort({ createdAt: -1 });

    res.json(prescriptions);
  } catch (error) {
    console.error('Get admin prescriptions error:', error);
    res.status(500).json({ message: 'Server error fetching prescriptions' });
  }
});

// @route   PUT /api/admin/prescriptions/:id/status
// @desc    Update prescription status
// @access  Private (Admin only)
router.put('/admin/prescriptions/:id/status', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { status } = req.body;
    const prescription = await Prescription.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    res.json(prescription);
  } catch (error) {
    console.error('Update prescription status error:', error);
    res.status(500).json({ message: 'Server error updating prescription status' });
  }
});

// @route   DELETE /api/admin/prescriptions/:id
// @desc    Delete prescription (Admin only)
// @access  Private (Admin only)
router.delete('/admin/prescriptions/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const prescription = await Prescription.findById(req.params.id);
    
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    // Delete file if exists
    if (prescription.fileUrl) {
      const filePath = path.join(__dirname, '..', prescription.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Prescription.findByIdAndDelete(req.params.id);
    res.json({ message: 'Prescription deleted successfully' });
  } catch (error) {
    console.error('Delete prescription error:', error);
    res.status(500).json({ message: 'Server error deleting prescription' });
  }
});

// @route   GET /api/doctor/prescriptions
// @desc    Get prescriptions for doctor
// @access  Private (Doctor only)
router.get('/doctor/prescriptions', async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Access denied. Doctor only.' });
    }

    const prescriptions = await Prescription.find({ doctor: req.user.id })
      .populate('student', 'name email studentId')
      .sort({ createdAt: -1 });

    res.json(prescriptions);
  } catch (error) {
    console.error('Get doctor prescriptions error:', error);
    res.status(500).json({ message: 'Server error fetching prescriptions' });
  }
});

// @route   POST /api/doctor/prescriptions
// @desc    Create prescription by doctor
// @access  Private (Doctor only)
router.post('/doctor/prescriptions', async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Access denied. Doctor only.' });
    }

    const { studentId, date, medications, notes } = req.body;
    
    if (!studentId || !date || !medications) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const prescription = new Prescription({
      student: studentId,
      doctor: req.user.id,
      doctorName: req.user.name,
      date: new Date(date),
      medications,
      notes,
      status: 'active'
    });

    await prescription.save();
    res.json(prescription);
  } catch (error) {
    console.error('Create prescription error:', error);
    res.status(500).json({ message: 'Server error creating prescription' });
  }
});

// @route   GET /api/prescriptions/:id
// @desc    Get prescription by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('student', 'name email studentId')
      .populate('doctor', 'name specialization');

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    // Check if user has access to this prescription
    if (req.user.role === 'student' && prescription.student._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(prescription);
  } catch (error) {
    console.error('Get prescription error:', error);
    res.status(500).json({ message: 'Server error fetching prescription' });
  }
});

module.exports = router;
