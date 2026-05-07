/**
 * DormDoc Database Seed Script
 * Populates the database with:
 *   - 6,000 Students
 *   - 6,000 Parents (1 per student, linked)
 *   - 400 Faculty
 *   - 50 Dispensary Staff
 *
 * Run with: node scripts/seed.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Student = require('../src/server/models/Student');
const Parent = require('../src/server/models/Parent');
const Faculty = require('../src/server/models/Faculty');
const DispensaryStaff = require('../src/server/models/DispensaryStaff');

// ─── Constants ───────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  'Computer Science', 'Electronics & Communication', 'Electrical Engineering',
  'Mechanical Engineering', 'Civil Engineering', 'Information Technology',
  'Chemical Engineering', 'Production Engineering', 'Architecture',
  'Applied Mathematics', 'Applied Physics', 'Applied Chemistry',
  'Biotechnology', 'Food Technology', 'Pharmacy',
];

const HOSTELS = [
  'H-1 (Tagore Bhawan)', 'H-2 (Vivekananda Bhawan)', 'H-3 (Azad Bhawan)',
  'H-4 (Gandhi Bhawan)', 'H-5 (Nehru Bhawan)', 'H-6 (Patel Bhawan)',
  'H-7 (Subhash Bhawan)', 'H-8 (Bose Bhawan)', 'H-9 (Raman Bhawan)',
  'Girls Hostel 1 (Saraswati Bhawan)', 'Girls Hostel 2 (Lakshmi Bhawan)',
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const YEARS = ['1st', '2nd', '3rd', '4th'];
const PROGRAMMES = ['B.Tech', 'M.Tech', 'MCA', 'MBA', 'B.Pharm', 'M.Pharm'];
const BATCHES = ['2021-2025', '2022-2026', '2023-2027', '2024-2028', '2020-2024'];
const DESIGNATIONS = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer'];
const RELATIONS = ['father', 'mother', 'guardian'];
const STATES = [
  'Jharkhand', 'Bihar', 'West Bengal', 'Uttar Pradesh', 'Odisha',
  'Madhya Pradesh', 'Rajasthan', 'Delhi', 'Maharashtra', 'Karnataka',
];
const CITIES = [
  'Ranchi', 'Patna', 'Kolkata', 'Lucknow', 'Bhubaneswar',
  'Bhopal', 'Jaipur', 'Delhi', 'Mumbai', 'Bangalore',
];

const FIRST_NAMES = [
  'Aarav', 'Arjun', 'Vikram', 'Rohit', 'Amit', 'Raj', 'Sanjay', 'Ankit',
  'Deepak', 'Vikas', 'Priya', 'Neha', 'Pooja', 'Anjali', 'Kavita', 'Sneha',
  'Rahul', 'Karan', 'Varun', 'Suresh', 'Mahesh', 'Ramesh', 'Dinesh', 'Ganesh',
  'Sunita', 'Shweta', 'Rekha', 'Meena', 'Geeta', 'Lata', 'Radha', 'Sita',
  'Akash', 'Vivek', 'Abhishek', 'Manish', 'Pankaj', 'Nitin', 'Shivam', 'Tushar',
  'Kritika', 'Divya', 'Richa', 'Jyoti', 'Monika', 'Ritu', 'Nidhi', 'Swati',
  'Yash', 'Harsh', 'Ayush', 'Rishabh', 'Tanmay', 'Aditya', 'Rohan', 'Sahil',
  'Shreya', 'Riya', 'Ishita', 'Tanya', 'Palak', 'Aditi', 'Surbhi', 'Garima',
];

const LAST_NAMES = [
  'Kumar', 'Sharma', 'Singh', 'Verma', 'Gupta', 'Mishra', 'Jha', 'Yadav',
  'Pandey', 'Tiwari', 'Srivastava', 'Dubey', 'Shukla', 'Chauhan', 'Rai',
  'Das', 'Roy', 'Ghosh', 'Banerjee', 'Chatterjee', 'Mukherjee', 'Bose',
  'Patel', 'Shah', 'Mehta', 'Joshi', 'Desai', 'Parikh', 'Trivedi', 'Bhatt',
  'Reddy', 'Naidu', 'Raju', 'Iyer', 'Nair', 'Pillai', 'Menon', 'Krishnan',
  'Choudhury', 'Mallick', 'Nayak', 'Pradhan', 'Sahoo', 'Panda', 'Mohanty',
];

// ─── Utility Helpers ─────────────────────────────────────────────────────────

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randPhone = () => `9${randInt(100000000, 999999999)}`;
const randPin = () => String(randInt(100000, 999999));

const generateName = () => `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`;

const slugify = (name) => name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '');

// ─── Batch Processing ─────────────────────────────────────────────────────────

const BATCH_SIZE = 500;

async function insertInBatches(Model, docs, label) {
  console.log(`  ⏳ Inserting ${docs.length.toLocaleString()} ${label}...`);
  let inserted = 0;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    await Model.insertMany(batch, { ordered: false });
    inserted += batch.length;
    process.stdout.write(`\r  ✅ ${inserted.toLocaleString()} / ${docs.length.toLocaleString()} ${label} inserted`);
  }
  console.log();
}

// ─── Student Generator ────────────────────────────────────────────────────────

function generateStudents(count = 6000) {
  const students = [];
  for (let i = 1; i <= count; i++) {
    const name = generateName();
    const year = rand(YEARS);
    const batch = rand(BATCHES);
    const batchYear = batch.split('-')[0].slice(2); // e.g. '21'
    const dept = rand(DEPARTMENTS);
    const deptCode = dept.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3);
    const studentId = `BIT${batchYear}${deptCode}${String(i).padStart(4, '0')}`;
    const rollNo = `${batchYear}${deptCode}${String(i).padStart(4, '0')}`;

    students.push({
      studentId,
      rollNumber: rollNo,
      name,
      email: `${slugify(name)}.${rollNo.toLowerCase()}@students.bitmesra.ac.in`,
      phone: randPhone(),
      dob: new Date(1999 + randInt(0, 4), randInt(0, 11), randInt(1, 28)),
      gender: Math.random() > 0.4 ? 'male' : 'female',
      department: dept,
      year,
      programme: rand(PROGRAMMES),
      batch,
      hostel: rand(HOSTELS),
      roomNumber: `${randInt(1, 10)}${String(randInt(1, 50)).padStart(2, '0')}`,
      bloodGroup: rand(BLOOD_GROUPS),
      allergies: Math.random() > 0.8 ? [rand(['Penicillin', 'Aspirin', 'Dust', 'Pollen', 'Lactose'])] : [],
      chronicConditions: Math.random() > 0.9 ? [rand(['Asthma', 'Diabetes Type 2', 'Hypertension', 'Thyroid'])] : [],
      emergencyContact: {
        name: generateName(),
        phone: randPhone(),
        relation: rand(RELATIONS),
        email: `parent.${rollNo.toLowerCase()}@gmail.com`,
      },
      medicalHistory: [],
      isActive: true,
      insuranceId: `INS-BIT-${String(i).padStart(6, '0')}`,
    });
  }
  return students;
}

// ─── Parent Generator ─────────────────────────────────────────────────────────

function generateParents(students) {
  return students.map((s, i) => {
    const name = s.emergencyContact?.name || generateName();
    const idx = i + 1;
    return {
      parentId: `PAR-${String(idx).padStart(6, '0')}`,
      name,
      email: `parent.${s.rollNumber?.toLowerCase() || idx}@gmail.com`,
      phone: s.emergencyContact?.phone || randPhone(),
      alternatePhone: randPhone(),
      gender: s.emergencyContact?.relation === 'father' ? 'male' : 'female',
      occupation: rand(['Farmer', 'Teacher', 'Engineer', 'Doctor', 'Businessman', 'Government Employee', 'Retired']),
      address: {
        street: `${randInt(1, 999)}, ${rand(['MG Road', 'Station Road', 'Main Street', 'Nagar Colony'])}`,
        city: rand(CITIES),
        state: rand(STATES),
        pincode: randPin(),
        country: 'India',
      },
      relationToStudent: s.emergencyContact?.relation || rand(RELATIONS),
      students: [{
        studentId: s._id,
        rollNumber: s.rollNumber,
        name: s.name,
        relation: s.emergencyContact?.relation || 'parent',
        isPrimary: true,
      }],
      notifications: {
        smsEnabled: true,
        emailEnabled: true,
        emergencyAlerts: true,
        appointmentUpdates: Math.random() > 0.3,
        prescriptionAlerts: Math.random() > 0.3,
      },
      isVerified: false,
      isActive: true,
    };
  });
}

// ─── Faculty Generator ────────────────────────────────────────────────────────

function generateFaculty(count = 400) {
  const faculty = [];
  const hodTracker = {}; // one HOD per dept

  for (let i = 1; i <= count; i++) {
    const name = generateName();
    const dept = DEPARTMENTS[i % DEPARTMENTS.length];
    const designation = i <= 15 ? 'HOD' : rand(DESIGNATIONS);
    const role = designation === 'HOD' ? 'hod' : 'faculty';

    faculty.push({
      facultyId: `BIT-FAC-${String(i).padStart(4, '0')}`,
      name,
      email: `${slugify(name)}.f${String(i).padStart(4, '0')}@bitmesra.ac.in`,
      phone: randPhone(),
      dob: new Date(1965 + randInt(0, 20), randInt(0, 11), randInt(1, 28)),
      gender: Math.random() > 0.35 ? 'male' : 'female',
      department: dept,
      designation,
      specialization: [rand(['Machine Learning', 'VLSI', 'Structural Engineering', 'Thermodynamics', 'Data Science', 'Networks', 'Algorithms', 'Control Systems'])],
      qualification: [rand(['Ph.D', 'M.Tech', 'M.E']), 'B.Tech'],
      joiningDate: new Date(1990 + randInt(0, 30), randInt(0, 11), randInt(1, 28)),
      employeeType: Math.random() > 0.15 ? 'permanent' : 'contractual',
      cabinNumber: `Block-${rand(['A', 'B', 'C', 'D'])}-${randInt(100, 499)}`,
      bloodGroup: rand(BLOOD_GROUPS),
      role,
      hodDepartment: role === 'hod' ? dept : undefined,
      isActive: true,
    });
  }
  return faculty;
}

// ─── Dispensary Staff Generator ───────────────────────────────────────────────

function generateDispensaryStaff() {
  const staffProfiles = [
    // Medical Officers (Doctors) — 10
    ...Array.from({ length: 10 }, (_, i) => ({
      staffType: 'medical_officer',
      designation: i === 0 ? 'Chief Medical Officer' : 'Medical Officer',
      role: 'doctor',
      qualification: ['MBBS', i < 3 ? 'MD' : 'PGDM'],
      specialization: rand(['General Medicine', 'Orthopaedics', 'Dermatology', 'Gynaecology', 'ENT', 'Ophthalmology']),
      licenseNumber: `MCI-JH-${String(i + 1).padStart(5, '0')}`,
      maxPatientsPerDay: 40,
    })),
    // Nurses — 15
    ...Array.from({ length: 15 }, (_, i) => ({
      staffType: 'nurse',
      designation: i === 0 ? 'Head Nurse' : 'Staff Nurse',
      role: 'doctor',
      qualification: ['B.Sc Nursing'],
      licenseNumber: `NCI-JH-${String(i + 1).padStart(5, '0')}`,
    })),
    // Pharmacists — 8
    ...Array.from({ length: 8 }, (_, i) => ({
      staffType: 'pharmacist',
      designation: i === 0 ? 'Chief Pharmacist' : 'Pharmacist',
      role: 'admin',
      qualification: ['B.Pharm'],
      licenseNumber: `PCI-JH-${String(i + 1).padStart(5, '0')}`,
    })),
    // Lab Technicians — 5
    ...Array.from({ length: 5 }, (_, i) => ({
      staffType: 'lab_technician',
      designation: 'Lab Technician',
      role: 'admin',
      qualification: ['DMLT'],
    })),
    // Admin Staff — 7
    ...Array.from({ length: 7 }, (_, i) => ({
      staffType: 'admin_staff',
      designation: i === 0 ? 'Dispensary Manager' : 'Administrative Staff',
      role: 'admin',
      qualification: ['B.Com', 'BBA'],
    })),
    // Ambulance Drivers — 3
    ...Array.from({ length: 3 }, () => ({
      staffType: 'ambulance_driver',
      designation: 'Ambulance Driver',
      role: 'admin',
      qualification: ['Valid Driving License'],
    })),
    // Counsellors — 2
    ...Array.from({ length: 2 }, () => ({
      staffType: 'counsellor',
      designation: 'Mental Health Counsellor',
      role: 'doctor',
      qualification: ['M.Sc Psychology', 'MSW'],
    })),
  ];

  return staffProfiles.map((profile, i) => {
    const name = generateName();
    return {
      staffId: `DISP-${String(i + 1).padStart(3, '0')}`,
      name,
      email: `${slugify(name)}.d${String(i + 1).padStart(3, '0')}@bitmesra.ac.in`,
      phone: randPhone(),
      dob: new Date(1970 + randInt(0, 25), randInt(0, 11), randInt(1, 28)),
      gender: Math.random() > 0.5 ? 'male' : 'female',
      experience: randInt(1, 25),
      joiningDate: new Date(2000 + randInt(0, 23), randInt(0, 11), randInt(1, 28)),
      shift: rand(['morning', 'evening', 'rotating']),
      shiftTiming: { start: '09:00', end: '17:00' },
      isOnDuty: Math.random() > 0.5,
      bloodGroup: rand(BLOOD_GROUPS),
      emergencyContact: {
        name: generateName(),
        phone: randPhone(),
        relation: rand(RELATIONS),
      },
      totalConsultations: randInt(0, 5000),
      rating: parseFloat((Math.random() * 2 + 3).toFixed(1)), // 3.0 – 5.0
      isActive: true,
      ...profile,
    };
  });
}

// ─── Main Seed Runner ─────────────────────────────────────────────────────────

async function seed() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/college-dispensary';
    console.log('\n🌱 DormDoc Seed Script (Faculty + Staff only)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📡 Connecting to MongoDB at ${uri}`);

    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB\n');

    // Only clear Faculty and Staff (Students/Parents already in Atlas)
    console.log('🗑  Clearing Faculty and Staff...');
    await Promise.all([
      Faculty.deleteMany({}),
      DispensaryStaff.deleteMany({}),
    ]);
    console.log('✅ Cleared\n');

    // ── Faculty
    console.log('👨‍🏫 Generating Faculty (400)...');
    const facultyDocs = generateFaculty(400);
    await insertInBatches(Faculty, facultyDocs, 'Faculty');
    console.log(`✅ ${facultyDocs.length} Faculty inserted\n`);

    // ── Dispensary Staff
    console.log('🏥 Generating Dispensary Staff (50)...');
    const staffDocs = generateDispensaryStaff();
    await DispensaryStaff.insertMany(staffDocs, { ordered: false });
    console.log(`✅ ${staffDocs.length} Dispensary Staff inserted\n`);

    // ── Summary
    const counts = await Promise.all([
      Student.countDocuments(),
      Parent.countDocuments(),
      Faculty.countDocuments(),
      DispensaryStaff.countDocuments(),
    ]);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Database Summary (Atlas)');
    console.log(`   Students:          ${counts[0].toLocaleString()}`);
    console.log(`   Parents:           ${counts[1].toLocaleString()}`);
    console.log(`   Faculty:           ${counts[2].toLocaleString()}`);
    console.log(`   Dispensary Staff:  ${counts[3].toLocaleString()}`);
    console.log(`   TOTAL:             ${(counts[0] + counts[1] + counts[2] + counts[3]).toLocaleString()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

seed();

