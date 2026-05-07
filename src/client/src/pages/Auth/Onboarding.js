import React, { useState, useEffect } from 'react';
import { Box, Container, Paper, Typography, TextField, Button, Grid, MenuItem, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useClerkAuth } from '../../contexts/ClerkAuthContext';
import { toast } from 'react-toastify';

const Onboarding = () => {
  const { user, setNeedsOnboarding, setMongoUser } = useClerkAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  // Form states based on role
  const [formData, setFormData] = useState({
    studentId: '',
    department: '',
    year: '1st',
    bloodGroup: 'O+',
  });

  const role = user?.role || 'student';

  useEffect(() => {
    // If not signed in via Clerk, redirect to login
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    try {
      const res = await fetch('/api/clerk-auth/send-mobile-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        toast.success('OTP sent successfully (Check server console for mock)');
      } else {
        toast.error(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const res = await fetch('/api/clerk-auth/verify-mobile-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (res.ok) {
        setPhoneVerified(true);
        toast.success('Phone verified successfully!');
      } else {
        toast.error(data.error || 'Invalid OTP');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phoneVerified) {
      toast.error('Please verify your phone number first.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        clerkUserId: user._id, // the clerk ID passed from context
        role,
        data: {
          ...formData,
          phone,
        }
      };

      const res = await fetch('/api/clerk-auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Profile completed successfully!');
        setNeedsOnboarding(false);
        if (data.user) {
          setMongoUser(data.user);
        }
        // Small delay to allow contexts to re-sync if needed
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else {
        toast.error(data.error || 'Failed to save profile');
      }
    } catch (err) {
      toast.error('An error occurred during onboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', background: '#f8fafc', py: 4 }}>
      <Container maxWidth="sm">
        <Paper elevation={12} sx={{ p: 4, borderRadius: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight="bold" color="#1A365D" align="center">
            Complete Your Profile
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            Please fill out your {role} details to access the DormDoc portal.
          </Typography>

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Phone Verification Section */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight="bold" mb={1}>Mobile Verification</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={phoneVerified || otpSent}
                    required
                  />
                  {!phoneVerified && !otpSent && (
                    <Button variant="contained" onClick={handleSendOtp} sx={{ bgcolor: '#1A365D' }}>
                      Send OTP
                    </Button>
                  )}
                </Box>
              </Grid>

              {otpSent && !phoneVerified && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      fullWidth
                      label="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                    <Button variant="contained" color="success" onClick={handleVerifyOtp}>
                      Verify
                    </Button>
                  </Box>
                </Grid>
              )}

              {/* Role Specific Fields */}
              {role === 'student' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Roll Number / Student ID"
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      select
                      label="Department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      required
                    >
                      {['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Other'].map((d) => (
                        <MenuItem key={d} value={d}>{d}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      select
                      label="Year"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    >
                      {['1st', '2nd', '3rd', '4th', '5th'].map((y) => (
                        <MenuItem key={y} value={y}>{y}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      select
                      label="Blood Group"
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => (
                        <MenuItem key={b} value={b}>{b}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </>
              )}

              {/* Faculty Fields */}
              {(role === 'faculty' || role === 'hod') && (
                <>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Faculty ID"
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      select
                      label="Department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      required
                    >
                      {['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Other'].map((d) => (
                        <MenuItem key={d} value={d}>{d}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading || !phoneVerified}
                  sx={{ mt: 2, bgcolor: '#C41E3A', '&:hover': { bgcolor: '#8B0000' } }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Complete Setup & Enter Dashboard'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default Onboarding;
