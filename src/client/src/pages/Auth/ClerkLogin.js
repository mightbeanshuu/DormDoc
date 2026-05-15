import React, { useState } from 'react';
import { SignIn } from '@clerk/clerk-react';
import {
  Box,
  Typography,
  Stack,
  Divider,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Collapse,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  School,
  AdminPanelSettings,
  LocalHospital,
  AccountBalance,
  FamilyRestroom,
  ScienceOutlined,
  ChevronRight,
  ArrowDropDownCircleOutlined,
  CalendarMonth,
  LocalShipping,
  MedicalInformation,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDevBypass } from '../../contexts/DevBypassContext';

/* ─── Color tokens (light cream theme matching dashboard) ────────── */
const C = {
  pageBg: '#f7f3ec',
  burgundy: '#6b1620',
  burgundyDark: '#4a1530',
  burgundyHover: '#7a1a2a',
  goldText: '#8a6533',
  goldHighlight: '#d4a849',
  goldSoft: '#e8c878',
  heading: '#2a1a1a',
  body: '#3a2a2a',
  secondary: '#5a4a3a',
  mutedLabel: '#8a6a3c',
  cardBg: '#ffffff',
  revealBg: '#faf6ee',
  pillBorder: 'rgba(107, 22, 32, 0.2)',
  cardBorder: 'rgba(107, 22, 32, 0.12)',
  hairline: 'rgba(107, 22, 32, 0.15)',
  hairlineFaint: 'rgba(107, 22, 32, 0.1)',
  mutedBrown: '#6a5a4a',
  pillText: '#4a3a3a',
};

const roles = [
  { id: 'student', title: 'Student', icon: School },
  { id: 'doctor', title: 'Medical Faculty', icon: LocalHospital },
  { id: 'admin', title: 'Administrator', icon: AdminPanelSettings },
  { id: 'hod', title: 'HOD', icon: AccountBalance },
  { id: 'parent', title: 'Parent', icon: FamilyRestroom },
];

const HIGHLIGHTS = [
  {
    icon: CalendarMonth,
    text: 'Book appointments with the on-duty physician.',
  },
  {
    icon: LocalShipping,
    text: 'Emergency SOS and ambulance dispatch.',
  },
  {
    icon: MedicalInformation,
    text: 'Digital prescriptions and AI-assisted triage.',
  },
];

/* ─── Staggered fade-in variants ──────────────────────────────────── */
const stagger = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
};

/* ─── Tracked-out label component ─────────────────────────────────── */
const TrackedLabel = ({ children, sx = {} }) => (
  <Typography
    sx={{
      fontSize: '9px',
      fontWeight: 700,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: C.mutedLabel,
      ...sx,
    }}
  >
    {children}
  </Typography>
);

const ClerkLogin = () => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [devOpen, setDevOpen] = useState(false);
  const navigate = useNavigate();
  const dev = useDevBypass();

  const handleRoleSelect = (e, roleId) => {
    if (!roleId) return;
    localStorage.setItem('pendingRole', roleId);
    setSelectedRole(roleId);
  };

  const handleDevBypass = (role) => {
    dev.enable(role);
    navigate('/dashboard', { replace: true });
  };

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        backgroundColor: C.pageBg,
        /* Subtle radial glows for depth */
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '60%',
          height: '60%',
          background: `radial-gradient(ellipse at center, rgba(212, 168, 73, 0.07) 0%, transparent 70%)`,
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: '-15%',
          left: '-10%',
          width: '55%',
          height: '55%',
          background: `radial-gradient(ellipse at center, rgba(107, 22, 32, 0.06) 0%, transparent 70%)`,
          pointerEvents: 'none',
        },
      }}
    >
      {/* ── Burgundy header bar ───────────────────────────── */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          background: `linear-gradient(90deg, ${C.burgundy} 0%, ${C.burgundyHover} 60%, ${C.burgundyDark} 100%)`,
          px: { xs: 2.5, md: 5 },
          py: { xs: 1.5, md: 1.8 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.8}>
          {/* Official BIT Mesra crest */}
          <Box
            component="img"
            src="/assets/bit_logo.png"
            alt="Birla Institute of Technology, Mesra"
            sx={{
              width: 40,
              height: 40,
              flexShrink: 0,
              filter: 'drop-shadow(0 0 8px rgba(255, 240, 200, 0.15))',
            }}
          />
          <Box>
            <Typography
              sx={{
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: { xs: '0.92rem', md: '1.1rem' },
                letterSpacing: '0.01em',
                lineHeight: 1.15,
                fontFamily: '"Playfair Display", serif',
              }}
            >
              Birla Institute of Technology, Mesra
            </Typography>
            <Typography
              sx={{
                color: C.goldSoft,
                fontWeight: 600,
                letterSpacing: '0.2em',
                fontSize: { xs: '0.6rem', md: '0.68rem' },
                textTransform: 'uppercase',
                mt: 0.2,
              }}
            >
              DormDoc · Campus Dispensary System
            </Typography>
          </Box>
        </Stack>

        <Typography
          sx={{
            display: { xs: 'none', md: 'block' },
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '0.62rem',
            fontWeight: 600,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            textAlign: 'right',
            whiteSpace: 'nowrap',
          }}
        >
          ESTD. 1955 · NAAC A+ · DEEMED UNIVERSITY
        </Typography>
      </Box>

      {/* ── Main two-column area ──────────────────────────── */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          px: { xs: 2.5, md: 5 },
          py: { xs: 4, md: 5 },
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 4, md: 5 },
          alignItems: 'flex-start',
          minHeight: { md: 'calc(100vh - 180px)' },
          maxWidth: 1200,
          mx: 'auto',
        }}
      >
        {/* ── Left column — editorial (no card wrapper) ──── */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          custom={0}
          style={{
            flex: 1.15,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              pt: 2,
            }}
          >
            <motion.div variants={stagger} custom={1}>
              <TrackedLabel sx={{ mb: 1.5 }}>
                Estd. 1955 · NAAC A+ · Deemed University
              </TrackedLabel>
            </motion.div>

            <motion.div variants={stagger} custom={2}>
              <Typography
                sx={{
                  fontFamily: '"Playfair Display", serif',
                  fontSize: { md: '2.4rem', lg: '2.9rem' },
                  fontWeight: 700,
                  color: C.heading,
                  lineHeight: 1.08,
                  letterSpacing: '-0.025em',
                  mt: 0.5,
                  mb: 2,
                }}
              >
                Where the campus{' '}
                <Box
                  component="span"
                  sx={{
                    display: 'block',
                    fontStyle: 'italic',
                    color: C.goldText,
                    fontFamily: '"Playfair Display", serif',
                  }}
                >
                  takes care of its own.
                </Box>
              </Typography>
            </motion.div>

            <motion.div variants={stagger} custom={3}>
              <Typography
                sx={{
                  color: C.body,
                  mb: 3.5,
                  fontSize: '1rem',
                  lineHeight: 1.7,
                }}
              >
                <Box
                  component="span"
                  sx={{ color: C.burgundy, fontWeight: 500 }}
                >
                  DormDoc
                </Box>{' '}
                brings campus healthcare into one dignified system — for every
                student, doctor and administrator.
              </Typography>
            </motion.div>

            <motion.div variants={stagger} custom={4}>
              <TrackedLabel sx={{ mb: 1.5 }}>
                What you can do here
              </TrackedLabel>
            </motion.div>

            <Stack spacing={2} sx={{ mt: 0.5 }}>
              {HIGHLIGHTS.map((point, idx) => {
                const Icon = point.icon;
                return (
                  <motion.div key={idx} variants={stagger} custom={5 + idx}>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <Box
                        sx={{
                          mt: '2px',
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          backgroundColor: 'rgba(107, 22, 32, 0.08)',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon sx={{ fontSize: 13, color: C.burgundy }} />
                      </Box>
                      <Typography
                        sx={{
                          color: C.body,
                          fontSize: '0.94rem',
                          lineHeight: 1.65,
                        }}
                      >
                        {point.text}
                      </Typography>
                    </Stack>
                  </motion.div>
                );
              })}
            </Stack>

            <motion.div variants={stagger} custom={8}>
              <Box sx={{ mt: 'auto', pt: 5 }}>
                <Divider sx={{ borderColor: C.hairline, mb: 2 }} />
                <TrackedLabel>A BIT Mesra Digital Initiative</TrackedLabel>
              </Box>
            </motion.div>
          </Box>
        </motion.div>

        {/* ── Right column — login card ───────────────────── */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          custom={2}
          style={{ flex: 1, display: 'flex' }}
        >
          <Box
            sx={{
              flex: 1,
              backgroundColor: C.cardBg,
              borderRadius: '16px',
              border: `0.5px solid ${C.cardBorder}`,
              boxShadow: `
                0 12px 40px rgba(74, 21, 48, 0.06),
                0 1px 0 rgba(255, 255, 255, 0.8) inset
              `,
              p: { xs: 3, md: 4 },
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 200ms ease, box-shadow 200ms ease',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: `
                  0 16px 48px rgba(74, 21, 48, 0.08),
                  0 1px 0 rgba(255, 255, 255, 0.8) inset
                `,
              },
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 700,
                  fontSize: { xs: '1.55rem', md: '1.8rem' },
                  color: C.heading,
                  letterSpacing: '-0.025em',
                  mb: 0.5,
                }}
              >
                Welcome.{' '}
                <Box
                  component="span"
                  sx={{
                    color: C.goldText,
                    fontStyle: 'italic',
                    fontFamily: '"Playfair Display", serif',
                  }}
                >
                  Please log in.
                </Box>
              </Typography>
              <Typography
                sx={{
                  color: C.secondary,
                  mb: 2.5,
                  fontSize: '0.92rem',
                  lineHeight: 1.6,
                }}
              >
                {selectedRole
                  ? `Continue as ${roles.find((r) => r.id === selectedRole)?.title}.`
                  : 'Choose your role to continue to DormDoc.'}
              </Typography>
            </Box>

            {/* ── Role selector pills ──────────────────────── */}
            <ToggleButtonGroup
              exclusive
              value={selectedRole}
              onChange={handleRoleSelect}
              sx={{
                flexWrap: 'wrap',
                gap: 1,
                mb: 3,
                '& .MuiToggleButton-root': {
                  color: C.pillText,
                  backgroundColor: C.cardBg,
                  border: `0.5px solid ${C.pillBorder}`,
                  borderRadius: '999px !important',
                  px: 1.8,
                  py: 0.8,
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.82rem',
                  letterSpacing: '0.03em',
                  transition: 'all 200ms ease',
                  '&:hover': {
                    borderColor: C.burgundy,
                    backgroundColor: 'rgba(107, 22, 32, 0.04)',
                  },
                  '&.Mui-selected': {
                    backgroundColor: C.burgundy,
                    color: '#f5e8c8',
                    borderColor: C.burgundy,
                    fontWeight: 500,
                    '&:hover': {
                      backgroundColor: C.burgundyHover,
                    },
                  },
                },
              }}
            >
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <ToggleButton key={role.id} value={role.id}>
                    <Stack direction="row" spacing={0.8} alignItems="center">
                      <Icon sx={{ fontSize: 16 }} />
                      <span>{role.title}</span>
                    </Stack>
                  </ToggleButton>
                );
              })}
            </ToggleButtonGroup>

            {/* ── Reveal panel ─────────────────────────────── */}
            <AnimatePresence mode="wait">
              {selectedRole ? (
                <motion.div
                  key="signin"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  style={{ flex: 1 }}
                >
                  <Box
                    sx={{
                      backgroundColor: C.revealBg,
                      border: '1px solid rgba(212, 168, 73, 0.25)',
                      borderRadius: 2.5,
                      p: { xs: 2.5, md: 3 },
                    }}
                  >
                    <TrackedLabel sx={{ mb: 2 }}>
                      {roles.find((r) => r.id === selectedRole)?.title} Sign-In
                    </TrackedLabel>

                    <Box
                      sx={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 2,
                        p: { xs: 1.5, md: 2 },
                        '& .cl-rootBox, & .cl-card': {
                          width: '100%',
                          boxShadow: 'none',
                          border: 'none',
                          padding: 0,
                          background: 'transparent',
                        },
                      }}
                    >
                      <SignIn
                        appearance={{
                          variables: {
                            colorPrimary: C.burgundy,
                            colorText: C.heading,
                            colorTextSecondary: C.secondary,
                            colorBackground: '#FFFFFF',
                            borderRadius: '10px',
                            fontFamily: '"Inter", sans-serif',
                          },
                          elements: {
                            rootBox: { width: '100%' },
                            card: {
                              width: '100%',
                              boxShadow: 'none',
                              border: 'none',
                              padding: 0,
                              background: 'transparent',
                            },
                            header: { display: 'none' },
                            formButtonPrimary: {
                              backgroundColor: C.burgundy,
                              padding: '12px',
                              fontSize: '0.95rem',
                              fontWeight: 700,
                              letterSpacing: 0.3,
                              textTransform: 'none',
                              color: '#f5e8c8',
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(107, 22, 32, 0.25)',
                              '&:hover': { backgroundColor: C.burgundyHover },
                            },
                            socialButtonsBlockButton: {
                              padding: '11px',
                              border: `1px solid ${C.cardBorder}`,
                              borderRadius: '10px',
                              '&:hover': { backgroundColor: 'rgba(107, 22, 32, 0.03)' },
                            },
                            formFieldInput: {
                              padding: '12px',
                              border: `1px solid rgba(107, 22, 32, 0.16)`,
                              borderRadius: '10px',
                              backgroundColor: '#FFFFFF',
                              '&:focus': {
                                borderColor: C.burgundy,
                                boxShadow: `0 0 0 4px rgba(107, 22, 32, 0.1)`,
                              },
                            },
                            footerActionLink: {
                              color: C.burgundy,
                              fontWeight: 700,
                              '&:hover': { color: C.burgundyHover },
                            },
                            dividerLine: { backgroundColor: C.hairlineFaint },
                            dividerText: { color: C.secondary },
                          },
                        }}
                        redirectUrl="/dashboard"
                        signUpUrl="/register"
                      />
                    </Box>

                    <Typography
                      sx={{
                        textAlign: 'center',
                        mt: 2,
                        fontSize: '0.72rem',
                        color: C.mutedBrown,
                        letterSpacing: '0.04em',
                      }}
                    >
                      Authenticated by Clerk · Powered by DormDoc
                    </Typography>
                  </Box>
                </motion.div>
              ) : (
                <motion.div
                  key="prompt"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <Box
                    sx={{
                      backgroundColor: C.revealBg,
                      border: '1px solid rgba(212, 168, 73, 0.25)',
                      borderRadius: 2.5,
                      p: 3,
                      textAlign: 'center',
                    }}
                  >
                    <ChevronRight sx={{ color: C.goldHighlight, mb: 0.5 }} />
                    <Typography
                      sx={{ fontWeight: 600, color: C.body, fontSize: '0.92rem' }}
                    >
                      Pick a role above to reveal the secure login.
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.72rem',
                        color: C.mutedBrown,
                        mt: 0.5,
                        letterSpacing: '0.04em',
                      }}
                    >
                      Authenticated by Clerk · Powered by DormDoc
                    </Typography>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Developer tools ──────────────────────────── */}
            {dev.enabled && (
              <Box sx={{ mt: 3 }}>
                <Divider
                  sx={{
                    borderColor: C.hairlineFaint,
                    borderWidth: '0.5px',
                    mb: 2,
                  }}
                />
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Stack direction="row" spacing={1.2} alignItems="center">
                    <ScienceOutlined sx={{ color: C.goldText, fontSize: 18 }} />
                    <Box>
                      <TrackedLabel>Developer Tools</TrackedLabel>
                      <Typography
                        sx={{
                          color: C.mutedBrown,
                          fontSize: '0.82rem',
                          mt: 0.3,
                        }}
                      >
                        Admin bypass — skip auth, load the dashboard
                      </Typography>
                    </Box>
                  </Stack>
                  <Tooltip title={devOpen ? 'Hide' : 'Show roles'}>
                    <IconButton
                      onClick={() => setDevOpen((v) => !v)}
                      sx={{
                        color: C.goldText,
                        transition: 'transform 200ms ease',
                        transform: devOpen ? 'rotate(180deg)' : 'none',
                      }}
                    >
                      <ArrowDropDownCircleOutlined />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <Collapse in={devOpen}>
                  <Stack
                    direction="row"
                    spacing={1}
                    flexWrap="wrap"
                    useFlexGap
                    sx={{ mt: 2 }}
                  >
                    {dev.availableRoles.map((role) => (
                      <Button
                        key={role}
                        variant="outlined"
                        size="small"
                        onClick={() => handleDevBypass(role)}
                        sx={{
                          color: C.burgundy,
                          borderColor: C.pillBorder,
                          textTransform: 'capitalize',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 500,
                          transition: 'all 200ms ease',
                          '&:hover': {
                            borderColor: C.burgundy,
                            backgroundColor: 'rgba(107, 22, 32, 0.05)',
                          },
                        }}
                      >
                        Enter as {role}
                      </Button>
                    ))}
                  </Stack>
                  <Typography
                    sx={{
                      display: 'block',
                      fontSize: '0.72rem',
                      color: C.mutedBrown,
                      mt: 1.5,
                      lineHeight: 1.5,
                    }}
                  >
                    Visible only in development builds. Use it to inspect dashboard
                    UI without going through Clerk.
                  </Typography>
                </Collapse>
              </Box>
            )}
          </Box>
        </motion.div>
      </Box>

      {/* ── Footer ────────────────────────────────────────── */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          px: { xs: 2.5, md: 5 },
          pb: 2.5,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Typography
          sx={{
            fontSize: '0.65rem',
            letterSpacing: '0.18em',
            color: C.mutedBrown,
            fontWeight: 600,
            textTransform: 'uppercase',
          }}
        >
          Terms & Conditions · Privacy
        </Typography>
        <Typography
          sx={{
            fontSize: '0.65rem',
            letterSpacing: '0.18em',
            color: C.mutedBrown,
            fontWeight: 600,
            textTransform: 'uppercase',
          }}
        >
          Powered by DormDoc · © {new Date().getFullYear()} BIT Mesra
        </Typography>
      </Box>
    </Box>
  );
};

export default ClerkLogin;
