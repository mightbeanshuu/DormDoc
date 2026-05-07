import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  LocalHospital,
  DirectionsCar,
  Warning,
  Schedule,
  Person,
  AccessTime,
  Queue,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import axios from 'axios';
import { useClerkAuth } from '../../contexts/ClerkAuthContext';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { mongoUser } = useClerkAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const { data: dashboardData, isLoading, error } = useQuery(
    'studentDashboard',
    async () => {
      const response = await axios.get('/api/student/dashboard');
      return response.data;
    },
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load dashboard data. Please try again.
      </Alert>
    );
  }

  const {
    doctorOnDuty,
    currentAppointments,
    availableSlots,
    queueStatus,
    studentInfo,
  } = dashboardData || {};

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome back, {studentInfo?.name}!
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        {currentTime.toLocaleString()}
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Current Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Current Status
              </Typography>
              {doctorOnDuty ? (
                <Box>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                      <LocalHospital />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">
                        Dr. {doctorOnDuty.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {doctorOnDuty.specialization}
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" gap={1} mb={2}>
                    <Chip
                      label={`Queue: ${doctorOnDuty.currentQueueNumber}`}
                      color="primary"
                      size="small"
                    />
                    <Chip
                      label={`Patients: ${doctorOnDuty.currentPatientCount}`}
                      color="secondary"
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Avg. Consultation: {doctorOnDuty.averageConsultationTime} min
                  </Typography>
                </Box>
              ) : (
                <Alert severity="info">No doctor currently on duty</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Button
                  variant="contained"
                  startIcon={<Schedule />}
                  onClick={() => navigate('/book-appointment')}
                  fullWidth
                >
                  Book Appointment
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DirectionsCar />}
                  onClick={() => navigate('/ambulance-booking')}
                  fullWidth
                >
                  Book Ambulance
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Warning />}
                  onClick={() => navigate('/emergency-sos')}
                  fullWidth
                >
                  Emergency SOS
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* User Profile Summary */}
        <Grid item xs={12} md={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Avatar sx={{ bgcolor: '#1A365D', width: 56, height: 56 }}>
                  <Person fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h6">{mongoUser?.name || studentInfo?.name || 'Student'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {mongoUser?.email || 'No email provided'}
                  </Typography>
                </Box>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Roll Number</Typography>
                  <Typography variant="body1" fontWeight="bold">{mongoUser?.studentId || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Department</Typography>
                  <Typography variant="body1" fontWeight="bold">{mongoUser?.department || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Phone</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {mongoUser?.phone || 'Not verified'}
                    {mongoUser?.phone && <Chip label="Verified" size="small" color="success" sx={{ ml: 1, height: 20 }} />}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Blood Group</Typography>
                  <Typography variant="body1" fontWeight="bold">{mongoUser?.bloodGroup || 'N/A'}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Current Appointments */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Current Appointments
              </Typography>
              {currentAppointments && currentAppointments.length > 0 ? (
                <List>
                  {currentAppointments.map((appointment) => (
                    <ListItem key={appointment._id} divider>
                      <ListItemIcon>
                        <Schedule color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Dr. ${appointment.doctor?.name || 'TBD'}`}
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              {new Date(appointment.appointmentDate).toLocaleDateString()} at{' '}
                              {appointment.appointmentTime}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Status: {appointment.status}
                            </Typography>
                            {appointment.isEmergency && (
                              <Chip label="Emergency" color="error" size="small" />
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">
                  No current appointments
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Queue Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Queue Status
              </Typography>
              {queueStatus && queueStatus.length > 0 ? (
                <List>
                  {queueStatus.map((queue) => (
                    <ListItem key={queue.doctorId} divider>
                      <ListItemIcon>
                        <Queue color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Dr. ${queue.doctorName}`}
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              Queue: {queue.currentQueue} patients
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Avg. Wait: {queue.averageWaitTime} min
                            </Typography>
                            {queue.nextInQueue && (
                              <Typography variant="body2" color="primary">
                                Next: #{queue.nextInQueue}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">
                  No active queues
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Available Time Slots */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Available Time Slots (Next 7 Days)
              </Typography>
              {availableSlots && availableSlots.length > 0 ? (
                <Grid container spacing={2}>
                  {availableSlots.slice(0, 6).map((slot, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2">
                            {slot.doctorName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {slot.specialization}
                          </Typography>
                          <Typography variant="body2">
                            {new Date(slot.date).toLocaleDateString()}
                          </Typography>
                          <Typography variant="body2" color="primary">
                            {slot.availableSlots.length} slots available
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography color="text.secondary">
                  No available slots
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StudentDashboard;
