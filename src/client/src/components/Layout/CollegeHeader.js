import React from 'react';
import { Box, Container, Typography, Stack } from '@mui/material';
import { LocationOn, Phone, Email, Schedule } from '@mui/icons-material';
import { palette } from '../../theme';

const UtilityItem = ({ icon: Icon, children }) => (
  <Stack direction="row" spacing={0.75} alignItems="center">
    <Icon sx={{ fontSize: 14, opacity: 0.85 }} />
    <Typography
      variant="caption"
      sx={{
        color: 'rgba(255,255,255,0.85)',
        letterSpacing: '0.04em',
        fontSize: '0.72rem',
      }}
    >
      {children}
    </Typography>
  </Stack>
);

const CollegeHeader = () => {
  return (
    <Box component="header" sx={{ flexShrink: 0 }}>
      {/* ── Top utility strip ─────────────────────────── */}
      <Box
        sx={{
          background: `linear-gradient(90deg, ${palette.navy.dark} 0%, ${palette.navy.main} 100%)`,
          color: '#FFFFFF',
          borderBottom: `1px solid rgba(255,255,255,0.04)`,
        }}
      >
        <Container maxWidth="xl">
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ py: 0.85, flexWrap: 'wrap', gap: 2 }}
          >
            <Stack direction="row" spacing={2.5} alignItems="center" sx={{ flexWrap: 'wrap' }}>
              <UtilityItem icon={LocationOn}>Mesra, Ranchi — 835215</UtilityItem>
              <UtilityItem icon={Phone}>+91-651-2275444</UtilityItem>
              <UtilityItem icon={Email}>dispensary@bitmesra.ac.in</UtilityItem>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <UtilityItem icon={Schedule}>Dispensary · 24 × 7</UtilityItem>
              <Box
                sx={{
                  px: 1.2,
                  py: 0.2,
                  borderRadius: 1,
                  backgroundColor: palette.gold,
                  color: palette.navy.dark,
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                }}
              >
                NAAC A+
              </Box>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* ── Main institute band ───────────────────────── */}
      <Box
        sx={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid rgba(15,24,64,0.08)',
        }}
      >
        <Container maxWidth="xl">
          <Stack
            direction="row"
            alignItems="center"
            sx={{ py: { xs: 1.5, md: 2 }, gap: { xs: 1.5, md: 2.5 } }}
          >
            <Box
              component="img"
              src="/assets/bit_logo.png"
              alt="BIT Mesra"
              sx={{
                width: { xs: 48, md: 60 },
                height: { xs: 48, md: 60 },
                objectFit: 'contain',
                borderRight: `1px solid rgba(15,24,64,0.1)`,
                pr: { xs: 1.5, md: 2.5 },
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 700,
                  fontSize: { xs: '0.98rem', md: '1.32rem' },
                  color: palette.maroon.dark,
                  lineHeight: 1.15,
                  letterSpacing: '0.01em',
                }}
              >
                Birla Institute of Technology, Mesra
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: '0.66rem', md: '0.74rem' },
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: palette.navy.light,
                  fontWeight: 600,
                  mt: 0.25,
                }}
              >
                Deemed University · Estd. 1955
              </Typography>
            </Box>
            <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'right' }}>
              <Typography
                sx={{
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  color: palette.navy.dark,
                  lineHeight: 1.1,
                }}
              >
                DormDoc
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.66rem',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: palette.maroon.main,
                  fontWeight: 700,
                }}
              >
                Campus Dispensary Portal
              </Typography>
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* ── Thin maroon underline (institutional accent) ── */}
      <Box
        sx={{
          height: 4,
          background: `linear-gradient(90deg, ${palette.maroon.dark} 0%, ${palette.maroon.main} 45%, ${palette.gold} 50%, ${palette.maroon.main} 55%, ${palette.maroon.dark} 100%)`,
        }}
      />
    </Box>
  );
};

export default CollegeHeader;
