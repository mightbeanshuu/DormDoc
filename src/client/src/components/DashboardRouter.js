import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { AccountBalance, FamilyRestroom } from '@mui/icons-material';
import { Navigate } from 'react-router-dom';
import { useClerkAuth } from '../contexts/ClerkAuthContext';
import StudentDashboard from '../pages/Student/StudentDashboard';
import DoctorDashboard from '../pages/Doctor/DoctorDashboard';
import AdminDashboard from '../pages/Admin/AdminDashboard';

// Temporary HOD Dashboard
const HodDashboard = () => (
  <Box sx={{ p: 3 }}>
    <Typography variant="h4" gutterBottom color="#1A365D" fontWeight="bold">
      Head of Department Dashboard
    </Typography>
    <Paper sx={{ p: 4, textAlign: 'center', mt: 4, borderRadius: 3 }}>
      <AccountBalance sx={{ fontSize: 60, color: '#f59e0b', mb: 2 }} />
      <Typography variant="h5" color="text.secondary">
        Welcome, HOD. Departmental medical oversight features are coming soon.
      </Typography>
    </Paper>
  </Box>
);

// Temporary Parent Dashboard
const ParentDashboard = () => (
  <Box sx={{ p: 3 }}>
    <Typography variant="h4" gutterBottom color="#1A365D" fontWeight="bold">
      Parent Portal
    </Typography>
    <Paper sx={{ p: 4, textAlign: 'center', mt: 4, borderRadius: 3 }}>
      <FamilyRestroom sx={{ fontSize: 60, color: '#ec4899', mb: 2 }} />
      <Typography variant="h5" color="text.secondary">
        Welcome. Ward medical tracking and alerts are coming soon.
      </Typography>
    </Paper>
  </Box>
);

const DashboardRouter = () => {
  const { user } = useClerkAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  switch (user.role) {
    case 'student':
      return <StudentDashboard />;
    case 'doctor':
      return <DoctorDashboard />;
    case 'admin':
      return <AdminDashboard />; 
    case 'hod':
      return <HodDashboard />;
    case 'parent':
      return <ParentDashboard />;
    default:
      return <StudentDashboard />;
  }
};

export default DashboardRouter;
