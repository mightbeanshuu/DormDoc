import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  CircularProgress,
  Stack,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { useAuth } from '../../contexts/AuthContext';
import AuthShell from './AuthShell';
import { palette } from '../../theme';

const MIN_PASSWORD = 8;

// 3-stage flow: ask for email → ask for 6-digit code → only after that,
// reveal the new-password fields. The password fields stay hidden until
// the recovery code has actually been verified.
const STAGES = { EMAIL: 'email', CODE: 'code', PASSWORD: 'password' };

const ForgotPassword = () => {
  const [stage, setStage] = useState(STAGES.EMAIL);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { requestPasswordReset, verifyRecoveryOtp, updatePassword } = useAuth();
  const navigate = useNavigate();

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await requestPasswordReset(email.trim().toLowerCase());
    setLoading(false);
    if (result.success) setStage(STAGES.CODE);
    else setError(result.message);
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await verifyRecoveryOtp(email.trim().toLowerCase(), code.trim());
    setLoading(false);
    if (result.success) {
      setStage(STAGES.PASSWORD);
    } else {
      setError(result.message);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);
    if (result.success) navigate('/dashboard');
    else setError(result.message);
  };

  const overline = {
    [STAGES.EMAIL]: 'Reset password',
    [STAGES.CODE]: 'Verify recovery code',
    [STAGES.PASSWORD]: 'Set new password',
  }[stage];

  const headline = {
    [STAGES.EMAIL]: 'Forgot your password?',
    [STAGES.CODE]: 'Check your inbox',
    [STAGES.PASSWORD]: 'Almost done',
  }[stage];

  const subline = {
    [STAGES.EMAIL]: "Enter your email and we'll send a 6-digit code to verify it's you.",
    [STAGES.CODE]: (
      <>
        Enter the 6-digit code we sent to{' '}
        <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
          {email}
        </Box>
        .
      </>
    ),
    [STAGES.PASSWORD]: 'Code verified. Choose a new password to sign in with from now on.',
  }[stage];

  return (
    <AuthShell>
      <Stack spacing={1} mb={4}>
        <Typography
          variant="overline"
          sx={{ color: palette.maroon.main, letterSpacing: '0.22em' }}
        >
          {overline}
        </Typography>
        <Typography
          variant="h4"
          sx={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontWeight: 700,
            color: 'text.primary',
          }}
        >
          {headline}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {subline}
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2.5 }}>
          {error}
        </Alert>
      )}

      {stage === STAGES.EMAIL && (
        <Box component="form" onSubmit={handleEmailSubmit} noValidate>
          <TextField
            fullWidth
            autoFocus
            label="Institute email"
            placeholder="you@bitmesra.ac.in"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            disabled={loading || !email}
            endIcon={!loading && <ArrowForwardRoundedIcon />}
            sx={{ mt: 3, py: 1.4, fontSize: '1rem' }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Send recovery code'}
          </Button>
        </Box>
      )}

      {stage === STAGES.CODE && (
        <Box component="form" onSubmit={handleCodeSubmit} noValidate>
          <TextField
            fullWidth
            autoFocus
            label="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            inputProps={{
              inputMode: 'numeric',
              pattern: '[0-9]{6}',
              maxLength: 6,
              style: {
                letterSpacing: '0.6em',
                fontSize: '1.4rem',
                fontWeight: 600,
                textAlign: 'center',
              },
            }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            disabled={loading || code.length !== 6}
            endIcon={!loading && <ArrowForwardRoundedIcon />}
            sx={{ mt: 3, py: 1.4, fontSize: '1rem' }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Verify code'}
          </Button>
          <Button
            fullWidth
            onClick={() => {
              setStage(STAGES.EMAIL);
              setCode('');
              setError('');
            }}
            sx={{ mt: 1, color: 'text.secondary' }}
          >
            Use a different email
          </Button>
        </Box>
      )}

      {stage === STAGES.PASSWORD && (
        <Box component="form" onSubmit={handlePasswordSubmit} noValidate>
          <Stack spacing={2}>
            <TextField
              fullWidth
              autoFocus
              label="New password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              helperText={`At least ${MIN_PASSWORD} characters.`}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                      size="small"
                      aria-label={showPassword ? 'hide password' : 'show password'}
                    >
                      {showPassword ? (
                        <VisibilityOffOutlinedIcon fontSize="small" />
                      ) : (
                        <VisibilityOutlinedIcon fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Confirm new password"
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            disabled={loading || !password || !confirm}
            endIcon={!loading && <ArrowForwardRoundedIcon />}
            sx={{ mt: 3, py: 1.4, fontSize: '1rem' }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Update password'}
          </Button>
        </Box>
      )}

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={2}
        sx={{ mt: 4 }}
      >
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Remembered it?
        </Typography>
        <Link
          component={RouterLink}
          to="/login"
          variant="body2"
          sx={{
            color: palette.maroon.main,
            fontWeight: 600,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          Back to sign in
          <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
        </Link>
      </Stack>

      <Typography
        variant="caption"
        sx={{
          display: 'block',
          mt: 5,
          color: 'text.secondary',
          textAlign: 'center',
        }}
      >
        DormDoc · Birla Institute of Technology, Mesra · © {new Date().getFullYear()}
      </Typography>
    </AuthShell>
  );
};

export default ForgotPassword;
