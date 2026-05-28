import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Stack,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { useAuth } from '../../contexts/AuthContext';
import AuthShell from './AuthShell';
import { palette } from '../../theme';

const MIN_PASSWORD = 8;

// Landing page for the Supabase password-reset link. By the time we hit
// here, supabase-js has already exchanged the URL token for a recovery
// session in onAuthStateChange, so updateUser({password}) just works.
const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { updatePassword, session } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
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

  return (
    <AuthShell>
      <Stack spacing={1} mb={4}>
        <Typography
          variant="overline"
          sx={{ color: palette.maroon.main, letterSpacing: '0.22em' }}
        >
          Reset password
        </Typography>
        <Typography
          variant="h4"
          sx={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontWeight: 700,
            color: 'text.primary',
          }}
        >
          Set a new password
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Choose something memorable. You'll use this every time you sign in.
        </Typography>
      </Stack>

      {!session && (
        <Alert severity="warning" sx={{ mb: 2.5 }}>
          We couldn't find a recovery session. Open this page from the link in your
          reset email.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2.5 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate>
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
          disabled={loading || !password || !confirm || !session}
          endIcon={!loading && <ArrowForwardRoundedIcon />}
          sx={{ mt: 3, py: 1.4, fontSize: '1rem' }}
        >
          {loading ? <CircularProgress size={22} color="inherit" /> : 'Update password'}
        </Button>
      </Box>

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

export default ResetPassword;
