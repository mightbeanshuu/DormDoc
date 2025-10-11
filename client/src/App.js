import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';

import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import StudentDashboard from './pages/Student/StudentDashboard';
import AdminDashboard from './pages/Admin/AdminDashboard';
import Profile from './pages/Profile/Profile';
import Appointments from './pages/Student/Appointments';
import BookAppointment from './pages/Student/BookAppointment';
import EmergencySOS from './pages/Student/EmergencySOS';
import AmbulanceBooking from './pages/Student/AmbulanceBooking';
import Prescriptions from './pages/Student/Prescriptions';
import Chatbot from './pages/Student/Chatbot';
import DoctorManagement from './pages/Admin/DoctorManagement';
import AmbulanceManagement from './pages/Admin/AmbulanceManagement';
import QueueManagement from './pages/Admin/QueueManagement';
import Analytics from './pages/Admin/Analytics';
import LeaveRequests from './pages/Admin/LeaveRequests';
import QRScanner from './pages/Admin/QRScanner';
import PrescriptionManagement from './pages/Student/PrescriptionManagement';
import LeaveApplication from './pages/Student/LeaveApplication';
import AdminPrescriptionManagement from './pages/Admin/AdminPrescriptionManagement';
import InventoryManagement from './pages/Admin/InventoryManagement';
import AmbulanceTracking from './pages/Admin/AmbulanceTracking';
import DoctorDashboard from './pages/Doctor/DoctorDashboard';
import PatientChat from './pages/Doctor/PatientChat';
import ProtectedRoute from './components/Auth/ProtectedRoute';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <div>Loading...</div>
      </Box>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
      
      {/* Protected Routes */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                {/* Student Routes */}
                <Route
                  path="/"
                  element={
                    user?.role === 'student' ? (
                      <StudentDashboard />
                    ) : user?.role === 'doctor' ? (
                      <DoctorDashboard />
                    ) : (
                      <AdminDashboard />
                    )
                  }
                />
                
                {/* Student-specific routes */}
                {user?.role === 'student' && (
                  <>
                    <Route path="/appointments" element={<Appointments />} />
                    <Route path="/book-appointment" element={<BookAppointment />} />
                    <Route path="/emergency-sos" element={<EmergencySOS />} />
                    <Route path="/ambulance-booking" element={<AmbulanceBooking />} />
                    <Route path="/prescriptions" element={<PrescriptionManagement />} />
                    <Route path="/leave-application" element={<LeaveApplication />} />
                    <Route path="/chatbot" element={<Chatbot />} />
                    <Route path="/profile" element={<Profile />} />
                  </>
                )}
                
                {/* Admin-specific routes */}
                {user?.role === 'admin' && (
                  <>
                    <Route path="/doctors" element={<DoctorManagement />} />
                    <Route path="/ambulances" element={<AmbulanceManagement />} />
                    <Route path="/queue" element={<QueueManagement />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/admin-prescriptions" element={<AdminPrescriptionManagement />} />
                    <Route path="/inventory" element={<InventoryManagement />} />
                    <Route path="/ambulance-tracking" element={<AmbulanceTracking />} />
                    <Route path="/leave-requests" element={<LeaveRequests />} />
                    <Route path="/qr-scanner" element={<QRScanner />} />
                    <Route path="/profile" element={<Profile />} />
                  </>
                )}
                
                {/* Doctor-specific routes */}
                {user?.role === 'doctor' && (
                  <>
                    <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
                    <Route path="/patient-chat" element={<PatientChat />} />
                    <Route path="/profile" element={<Profile />} />
                  </>
                )}
                
                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
