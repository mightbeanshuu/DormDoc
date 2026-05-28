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
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import { useAuth } from '../../contexts/AuthContext';
import AuthShell from './AuthShell';
import { palette } from '../../theme';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const { requestPasswordReset } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await requestPasswordReset(email.trim().toLowerCase());
    setLoading(false);
    if (result.success) setSent(true);
    else setError(result.message);
  };

  if (sent) {
    return (
      <AuthShell>
        <Stack spacing={2} mb={3} alignItems="center" textAlign="center">
          <MarkEmailReadOutlinedIcon sx={{ fontSize: 56, color: palette.maroon.main }} />
          <Typography
            variant="overline"
            sx={{ color: palette.maroon.main, letterSpacing: '0.22em' }}
          >
            Reset link sent
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontWeight: 700,
              color: 'text.primary',
            }}
          >
            Check your inbox
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            If an account exists for{' '}
            <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {email}
            </Box>
            , we just sent a link to set a new password.
          </Typography>
        </Stack>
        <Button
          component={RouterLink}
          to="/login"
          fullWidth
          variant="contained"
          color="primary"
          size="large"
          endIcon={<ArrowForwardRoundedIcon />}
          sx={{ py: 1.4, fontSize: '1rem' }}
        >
          Back to sign in
        </Button>
      </AuthShell>
    );
  }

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
          Forgot your password?
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Enter your email and we'll send a link to set a new one.
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2.5 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate>
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
          {loading ? <CircularProgress size={22} color="inherit" /> : 'Send reset link'}
        </Button>
      </Box>

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
