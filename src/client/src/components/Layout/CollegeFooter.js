import React from 'react';
import { Box, Container, Grid, Typography, Stack, Divider, IconButton, Link } from '@mui/material';
import {
  Email,
  Phone,
  LocationOn,
  Facebook,
  Twitter,
  LinkedIn,
  Instagram,
  Security,
  HealthAndSafety,
} from '@mui/icons-material';
import { palette } from '../../theme';

const ColumnHeading = ({ children }) => (
  <Typography
    sx={{
      color: palette.gold,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      fontSize: '0.72rem',
      fontWeight: 700,
      mb: 1.5,
    }}
  >
    {children}
  </Typography>
);

const FooterLink = ({ children, href = '#' }) => (
  <Link
    href={href}
    underline="none"
    sx={{
      color: 'rgba(255,255,255,0.78)',
      fontSize: '0.86rem',
      transition: 'color 200ms ease',
      '&:hover': { color: palette.gold },
    }}
  >
    {children}
  </Link>
);

const CollegeFooter = () => {
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        background: `linear-gradient(180deg, ${palette.navy.dark} 0%, #060B22 100%)`,
        color: '#FFFFFF',
        borderTop: `4px solid ${palette.maroon.main}`,
      }}
    >
      <Container maxWidth="xl" sx={{ py: { xs: 5, md: 6 } }}>
        <Grid container spacing={4}>
          {/* Brand column */}
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
              <Box
                component="img"
                src="/assets/bit_logo.png"
                alt="BIT Mesra"
                sx={{
                  width: 44,
                  height: 44,
                  backgroundColor: '#FFFFFF',
                  p: 0.5,
                  borderRadius: '50%',
                }}
              />
              <Box>
                <Typography
                  sx={{
                    fontFamily: '"Playfair Display", serif',
                    fontWeight: 700,
                    fontSize: '1.05rem',
                    lineHeight: 1.1,
                  }}
                >
                  Birla Institute of Technology
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.72rem',
                    letterSpacing: '0.22em',
                    color: palette.gold,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  DormDoc · Mesra
                </Typography>
              </Box>
            </Stack>
            <Typography sx={{ color: 'rgba(255,255,255,0.74)', fontSize: '0.92rem', lineHeight: 1.7, mb: 2 }}>
              DormDoc is the official digital dispensary platform of BIT Mesra —
              built for students, faculty and administrators to manage campus
              healthcare with clarity, speed and care.
            </Typography>
            <Stack direction="row" spacing={0.5}>
              {[Facebook, Twitter, LinkedIn, Instagram].map((Icon, i) => (
                <IconButton
                  key={i}
                  size="small"
                  sx={{
                    color: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    '&:hover': { color: palette.gold, borderColor: palette.gold },
                  }}
                >
                  <Icon fontSize="small" />
                </IconButton>
              ))}
            </Stack>
          </Grid>

          {/* Quick links */}
          <Grid item xs={6} md={2}>
            <ColumnHeading>Quick Links</ColumnHeading>
            <Stack spacing={0.9}>
              <FooterLink>Book Appointment</FooterLink>
              <FooterLink>Emergency SOS</FooterLink>
              <FooterLink>Prescriptions</FooterLink>
              <FooterLink>Health Records</FooterLink>
            </Stack>
          </Grid>

          {/* Services */}
          <Grid item xs={6} md={2}>
            <ColumnHeading>Services</ColumnHeading>
            <Stack spacing={0.9}>
              <FooterLink>General Consultation</FooterLink>
              <FooterLink>Ambulance Dispatch</FooterLink>
              <FooterLink>Health Checkups</FooterLink>
              <FooterLink>Medical Leave</FooterLink>
            </Stack>
          </Grid>

          {/* Contact */}
          <Grid item xs={12} md={4}>
            <ColumnHeading>Reach the dispensary</ColumnHeading>
            <Stack spacing={1.2}>
              <Stack direction="row" spacing={1.2} alignItems="flex-start">
                <LocationOn sx={{ color: palette.gold, fontSize: 18, mt: '2px' }} />
                <Typography sx={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.86rem', lineHeight: 1.6 }}>
                  Birla Institute of Technology, Mesra
                  <br />
                  Ranchi, Jharkhand — 835215
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.2} alignItems="center">
                <Phone sx={{ color: palette.gold, fontSize: 18 }} />
                <Typography sx={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.86rem' }}>
                  +91-651-2275444 · Dispensary +91-651-2275445
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.2} alignItems="center">
                <Email sx={{ color: palette.gold, fontSize: 18 }} />
                <Typography sx={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.86rem' }}>
                  dispensary@bitmesra.ac.in
                </Typography>
              </Stack>
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.08)' }} />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
        >
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', letterSpacing: '0.05em' }}>
            © {year} Birla Institute of Technology, Mesra. All rights reserved.
          </Typography>
          <Stack direction="row" spacing={2.5} alignItems="center">
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Security sx={{ fontSize: 15, color: palette.gold }} />
              <Typography sx={{ color: 'rgba(255,255,255,0.62)', fontSize: '0.76rem' }}>
                Secure & Confidential
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <HealthAndSafety sx={{ fontSize: 15, color: palette.gold }} />
              <Typography sx={{ color: 'rgba(255,255,255,0.62)', fontSize: '0.76rem' }}>
                Privacy-first care
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

export default CollegeFooter;
