import React from 'react';
import { Box, Stack, Typography, Button, Chip } from '@mui/material';
import { ScienceOutlined, LogoutOutlined } from '@mui/icons-material';
import { useDevBypass } from '../contexts/DevBypassContext';

/**
 * Subtle persistent banner shown whenever the dev bypass is active.
 * Hidden in production builds.
 */
const DevBypassBanner = () => {
  const { active, role, disable } = useDevBypass();
  if (!active) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        zIndex: 1400,
        backgroundColor: 'rgba(15, 24, 64, 0.92)',
        color: '#FFFFFF',
        backdropFilter: 'blur(8px)',
        borderRadius: 2,
        border: '1px solid rgba(212, 162, 76, 0.45)',
        py: 1,
        px: 1.5,
        boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
        pointerEvents: 'auto',
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center">
        <ScienceOutlined sx={{ fontSize: 18, color: '#D4A24C' }} />
        <Typography variant="caption" sx={{ letterSpacing: '0.12em', fontWeight: 600 }}>
          DEV BYPASS
        </Typography>
        {role && (
          <Chip
            label={role.toUpperCase()}
            size="small"
            sx={{
              height: 20,
              backgroundColor: 'rgba(212, 162, 76, 0.18)',
              color: '#D4A24C',
              fontWeight: 700,
              letterSpacing: '0.1em',
            }}
          />
        )}
        <Button
          onClick={disable}
          size="small"
          startIcon={<LogoutOutlined sx={{ fontSize: 16 }} />}
          sx={{
            color: '#FFFFFF',
            ml: 1,
            textTransform: 'none',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
          }}
        >
          Exit
        </Button>
      </Stack>
    </Box>
  );
};

export default DevBypassBanner;
