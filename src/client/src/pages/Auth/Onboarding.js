import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  CircularProgress,
  Stack,
  Chip,
  Alert,
  InputAdornment,
} from '@mui/material';
import {
  Verified,
  Phone as PhoneIcon,
  ShieldOutlined,
  AccountCircleOutlined,
  ChevronRight,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useClerkAuth } from '../../contexts/ClerkAuthContext';
import { toast } from 'react-toastify';
import { palette } from '../../theme';

const Onboarding = () => {
  const { user, setNeedsOnboarding, setMongoUser } = useClerkAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [provider, setProvider] = useState(null);
  const [devFallback, setDevFallback] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const tickRef = useRef(null);

  const [formData, setFormData] = useState({
    studentId: '',
    department: '',
    year: '1st',
    bloodGroup: 'O+',
  });

  const role = user?.role || 'student';

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    tickRef.current = setInterval(() => {
      setResendIn((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [resendIn]);

  const startCooldown = (seconds = 30) => setResendIn(seconds);

  const handleSendOtp = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      toast.error('Please enter a 10-digit Indian mobile number');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/clerk-auth/send-mobile-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        setProvider(data.provider || null);
        setDevFallback(!!data.devFallback);
        startCooldown(30);
        toast.success(
          data.devFallback
            ? 'OTP generated — check the server console (dev mode).'
            : `OTP sent via ${data.provider || 'SMS'}.`
        );
      } else if (res.status === 429) {
        toast.error(data.error || 'Please wait before requesting another OTP.');
      } else {
        toast.error(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      toast.error('Network error — could not reach the server');
    } finally {
      setSending(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0) return;
    await handleSendOtp();
  };

  const handleVerifyOtp = async () => {
    const digits = phone.replace(/\D/g, '');
    if (otp.length !== 6) {
      toast.error('Enter the 6-digit code from the SMS');
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch('/api/clerk-auth/verify-mobile-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits, otp }),
      });
      const data = await res.json();
      if (res.ok) {
        setPhoneVerified(true);
        toast.success('Phone verified.');
      } else {
        toast.error(
          data.attemptsLeft != null
            ? `${data.error} (${data.attemptsLeft} attempt${data.attemptsLeft === 1 ? '' : 's'} left)`
            : data.error || 'Invalid OTP'
        );
      }
    } catch (err) {
      toast.error('Network error — could not reach the server');
    } finally {
      setVerifying(false);
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
        clerkUserId: user._id,
        role,
        data: { ...formData, phone: phone.replace(/\D/g, '') },
      };

      const res = await fetch('/api/clerk-auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success('Profile completed.');
        setNeedsOnboarding(false);
        if (data.user) setMongoUser(data.user);
        setTimeout(() => navigate('/dashboard'), 800);
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
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        py: 4,
        backgroundColor: palette.navy.dark,
        overflow: 'hidden',
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: "url('/assets/bit_campus.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.22,
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, rgba(92, 15, 15, 0.78) 0%, rgba(26, 43, 92, 0.78) 60%, rgba(6, 11, 34, 0.92) 100%)`,
        }}
      />
      <Container maxWidth="sm" sx={{ position: 'relative' }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4.5 },
            borderRadius: 3,
            border: '1px solid rgba(15,24,64,0.06)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                backgroundColor: `${palette.maroon.main}14`,
                color: palette.maroon.main,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <AccountCircleOutlined />
            </Box>
            <Box>
              <Typography variant="overline" sx={{ color: palette.navy.light, letterSpacing: '0.22em' }}>
                One more step
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 700,
                  fontSize: { xs: '1.5rem', md: '1.85rem' },
                  color: palette.navy.dark,
                  lineHeight: 1.1,
                }}
              >
                Complete your profile
              </Typography>
            </Box>
          </Stack>
          <Typography sx={{ color: palette.navy.light, mb: 3 }}>
            Add your contact and {role} details to unlock the DormDoc portal.
          </Typography>

          <form onSubmit={handleSubmit}>
            <Grid container spacing={2.5}>
              {/* Phone */}
              <Grid item xs={12}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <ShieldOutlined sx={{ fontSize: 18, color: palette.maroon.main }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: palette.navy.dark }}>
                    Mobile verification
                  </Typography>
                  {phoneVerified && (
                    <Chip
                      label="Verified"
                      size="small"
                      icon={<Verified sx={{ fontSize: '14px !important' }} />}
                      sx={{
                        height: 22,
                        backgroundColor: '#2F7D5A1f',
                        color: '#2F7D5A',
                        fontWeight: 700,
                      }}
                    />
                  )}
                </Stack>
                <Stack direction="row" spacing={1}>
                  <TextField
                    fullWidth
                    label="Phone number"
                    placeholder="10-digit Indian number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    disabled={phoneVerified || otpSent}
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon sx={{ fontSize: 18, color: palette.navy.light }} />
                          <Typography sx={{ ml: 0.5, color: palette.navy.dark, fontWeight: 600 }}>+91</Typography>
                        </InputAdornment>
                      ),
                    }}
                  />
                  {!phoneVerified && !otpSent && (
                    <Button
                      variant="contained"
                      onClick={handleSendOtp}
                      disabled={sending}
                      sx={{ minWidth: 120 }}
                    >
                      {sending ? <CircularProgress size={20} color="inherit" /> : 'Send OTP'}
                    </Button>
                  )}
                </Stack>
              </Grid>

              {otpSent && !phoneVerified && (
                <>
                  <Grid item xs={12}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TextField
                        fullWidth
                        label="Enter 6-digit OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        inputProps={{ inputMode: 'numeric', maxLength: 6, style: { letterSpacing: '0.4em', fontWeight: 600 } }}
                      />
                      <Button
                        variant="contained"
                        onClick={handleVerifyOtp}
                        disabled={verifying || otp.length !== 6}
                        sx={{ minWidth: 110 }}
                      >
                        {verifying ? <CircularProgress size={20} color="inherit" /> : 'Verify'}
                      </Button>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                      <Typography variant="caption" sx={{ color: palette.navy.light }}>
                        Sent to +91 {phone}
                        {provider && !devFallback ? ` · via ${provider}` : ''}
                      </Typography>
                      <Button
                        size="small"
                        onClick={handleResend}
                        disabled={resendIn > 0 || sending}
                        sx={{ color: palette.maroon.main, textTransform: 'none' }}
                      >
                        {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend OTP'}
                      </Button>
                    </Stack>
                  </Grid>
                  {devFallback && (
                    <Grid item xs={12}>
                      <Alert severity="info" sx={{ py: 0.5 }}>
                        Dev mode — the code was logged to the server console. Configure an SMS provider in <code>.env</code> to send real messages.
                      </Alert>
                    </Grid>
                  )}
                </>
              )}

              {/* Student fields */}
              {role === 'student' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Roll number / Student ID"
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
                        <MenuItem key={d} value={d}>
                          {d}
                        </MenuItem>
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
                        <MenuItem key={y} value={y}>
                          {y}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      select
                      label="Blood group"
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => (
                        <MenuItem key={b} value={b}>
                          {b}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </>
              )}

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
                        <MenuItem key={d} value={d}>
                          {d}
                        </MenuItem>
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
                  endIcon={!loading && <ChevronRight />}
                  sx={{ mt: 1, py: 1.4 }}
                >
                  {loading ? <CircularProgress size={22} color="inherit" /> : 'Complete setup & enter dashboard'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 2,
            textAlign: 'center',
            color: 'rgba(255,255,255,0.6)',
            letterSpacing: '0.16em',
          }}
        >
          DORMDOC · BIT MESRA
        </Typography>
      </Container>
    </Box>
  );
};

export default Onboarding;
