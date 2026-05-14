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
  useTheme,
  useMediaQuery,
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
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { palette } from '../../theme';
import { useDevBypass } from '../../contexts/DevBypassContext';

const roles = [
  { id: 'student', title: 'Student', icon: School },
  { id: 'doctor', title: 'Medical Faculty', icon: LocalHospital },
  { id: 'admin', title: 'Administrator', icon: AdminPanelSettings },
  { id: 'hod', title: 'HOD', icon: AccountBalance },
  { id: 'parent', title: 'Parent', icon: FamilyRestroom },
];

const MISSION_POINTS = [
  'Digitise dispensary records, prescriptions and appointment workflows.',
  'Deliver real-time queue visibility and emergency SOS to every student.',
  'Streamline ambulance dispatch and inventory across the campus.',
  'Equip HoDs and administrators with department-level health analytics.',
  'Provide AI-assisted triage and confidential medical guidance.',
];

const fade = {
  hidden: { opacity: 0, y: 14 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.07 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

const GlassPanel = ({ children, sx = {} }) => (
  <Box
    sx={{
      backgroundColor: 'rgba(13, 22, 50, 0.62)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: 3,
      boxShadow: '0 30px 60px rgba(0, 0, 0, 0.35)',
      color: '#FFFFFF',
      ...sx,
    }}
  >
    {children}
  </Box>
);

const ClerkLogin = () => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [devOpen, setDevOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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
        // Full-bleed campus photo with a maroon→navy fallback gradient
        // beneath, so the design holds together even without the photo.
        backgroundColor: palette.navy.dark,
        backgroundImage: `
          linear-gradient(135deg, rgba(92, 15, 15, 0.78) 0%, rgba(26, 43, 92, 0.78) 60%, rgba(13, 24, 64, 0.86) 100%),
          url('/assets/bit_campus.jpg')
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(900px 600px at 100% 0%, rgba(212, 162, 76, 0.18), transparent 60%), radial-gradient(700px 500px at 0% 100%, rgba(123, 30, 30, 0.30), transparent 65%)',
          pointerEvents: 'none',
        },
      }}
    >
      {/* ─── Top header bar ───────────────────────────────── */}
      <Box
        sx={{
          position: 'relative',
          px: { xs: 3, md: 6 },
          py: { xs: 2.5, md: 3 },
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box
          component="img"
          src="/assets/bit_logo.png"
          alt="BIT Mesra"
          sx={{
            width: { xs: 56, md: 68 },
            height: { xs: 56, md: 68 },
            background: '#FFFFFF',
            borderRadius: '50%',
            p: 0.5,
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          }}
        />
        <Box>
          <Typography
            sx={{
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: { xs: '1.05rem', md: '1.45rem' },
              letterSpacing: '0.02em',
              lineHeight: 1.1,
              textShadow: '0 2px 8px rgba(0,0,0,0.45)',
              fontFamily: '"Playfair Display", serif',
            }}
          >
            Birla Institute of Technology, Mesra
          </Typography>
          <Typography
            sx={{
              color: palette.gold,
              fontWeight: 600,
              letterSpacing: '0.24em',
              fontSize: { xs: '0.7rem', md: '0.78rem' },
              textTransform: 'uppercase',
            }}
          >
            DormDoc · Campus Dispensary System
          </Typography>
        </Box>
      </Box>

      {/* ─── Main two-panel area ──────────────────────────── */}
      <Box
        sx={{
          position: 'relative',
          px: { xs: 2.5, md: 6 },
          pb: { xs: 6, md: 4 },
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 3, md: 4 },
          alignItems: 'stretch',
          minHeight: { md: 'calc(100vh - 220px)' },
        }}
      >
        {/* Left — institute info */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fade}
          custom={1}
          style={{ flex: 1.1, display: 'flex' }}
        >
          <GlassPanel
            sx={{
              flex: 1,
              p: { xs: 3, md: 4.5 },
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
            }}
          >
            <Typography
              variant="overline"
              sx={{ color: palette.gold, letterSpacing: '0.28em' }}
            >
              Established 1955 · NAAC A+
            </Typography>
            <Typography
              sx={{
                fontFamily: '"Playfair Display", serif',
                fontSize: { md: '2.4rem', lg: '2.9rem' },
                fontWeight: 700,
                color: '#FFFFFF',
                lineHeight: 1.1,
                mt: 1.5,
                mb: 1,
              }}
            >
              Campus healthcare,
              <Box
                component="span"
                sx={{ display: 'block', fontStyle: 'italic', color: palette.gold }}
              >
                elevated.
              </Box>
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.82)', mb: 3.5, fontSize: '1rem' }}>
              DormDoc is the unified medical platform of BIT Mesra — connecting
              students, faculty, and administrators across appointments,
              prescriptions, ambulance dispatch, and emergency SOS.
            </Typography>

            <Typography
              variant="overline"
              sx={{ color: 'rgba(255,255,255,0.62)', letterSpacing: '0.22em', mb: 1 }}
            >
              Institute Mission
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              {MISSION_POINTS.map((point, idx) => (
                <Stack key={idx} direction="row" spacing={1.5} alignItems="flex-start">
                  <Box
                    sx={{
                      mt: '8px',
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: palette.gold,
                      flexShrink: 0,
                    }}
                  />
                  <Typography sx={{ color: 'rgba(255,255,255,0.88)', fontSize: '0.94rem', lineHeight: 1.6 }}>
                    {point}
                  </Typography>
                </Stack>
              ))}
            </Stack>

            <Box sx={{ mt: 'auto', pt: 4 }}>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', mb: 2 }} />
              <Typography
                variant="caption"
                sx={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.16em' }}
              >
                A BIT MESRA DIGITAL INITIATIVE
              </Typography>
            </Box>
          </GlassPanel>
        </motion.div>

        {/* Right — login */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fade}
          custom={2}
          style={{ flex: 1, display: 'flex' }}
        >
          <GlassPanel sx={{ flex: 1, p: { xs: 3, md: 4.5 }, display: 'flex', flexDirection: 'column' }}>
            <Box>
              <Typography
                sx={{
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 700,
                  fontSize: { xs: '1.6rem', md: '1.85rem' },
                  color: '#FFFFFF',
                  mb: 0.5,
                }}
              >
                Welcome.{' '}
                <Box component="span" sx={{ color: palette.gold, fontStyle: 'italic' }}>
                  Please log in.
                </Box>
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.78)', mb: 2.5 }}>
                {selectedRole
                  ? `Continue as ${roles.find((r) => r.id === selectedRole)?.title}.`
                  : 'Choose your role to continue to DormDoc.'}
              </Typography>
            </Box>

            {/* Role chips — compact horizontal selector */}
            <ToggleButtonGroup
              exclusive
              value={selectedRole}
              onChange={handleRoleSelect}
              sx={{
                flexWrap: 'wrap',
                gap: 1,
                mb: 3,
                '& .MuiToggleButton-root': {
                  color: 'rgba(255,255,255,0.78)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: '999px !important',
                  px: 1.8,
                  py: 0.85,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  letterSpacing: '0.04em',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  transition: 'all 180ms ease',
                  '&:hover': {
                    borderColor: palette.gold,
                    backgroundColor: 'rgba(212, 162, 76, 0.1)',
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(212, 162, 76, 0.22)',
                    color: '#FFFFFF',
                    borderColor: palette.gold,
                    '&:hover': { backgroundColor: 'rgba(212, 162, 76, 0.3)' },
                  },
                },
              }}
            >
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <ToggleButton key={role.id} value={role.id}>
                    <Stack direction="row" spacing={0.9} alignItems="center">
                      <Icon sx={{ fontSize: 17 }} />
                      <span>{role.title}</span>
                    </Stack>
                  </ToggleButton>
                );
              })}
            </ToggleButtonGroup>

            {/* Form area */}
            <AnimatePresence mode="wait">
              {selectedRole ? (
                <motion.div
                  key="signin"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  style={{ flex: 1 }}
                >
                  <Box
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.96)',
                      borderRadius: 2.5,
                      p: { xs: 2, md: 2.5 },
                      // Clerk widget styling
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
                          colorPrimary: palette.maroon.main,
                          colorText: palette.navy.dark,
                          colorTextSecondary: palette.navy.light,
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
                            backgroundColor: palette.maroon.main,
                            padding: '12px',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            letterSpacing: 0.3,
                            textTransform: 'none',
                            boxShadow: '0 6px 16px rgba(123, 30, 30, 0.3)',
                            '&:hover': { backgroundColor: palette.maroon.dark },
                          },
                          socialButtonsBlockButton: {
                            padding: '11px',
                            border: '1px solid rgba(15, 24, 64, 0.14)',
                            borderRadius: '10px',
                            '&:hover': { backgroundColor: 'rgba(15, 24, 64, 0.03)' },
                          },
                          formFieldInput: {
                            padding: '12px',
                            border: '1px solid rgba(15, 24, 64, 0.16)',
                            borderRadius: '10px',
                            backgroundColor: '#FFFFFF',
                            '&:focus': {
                              borderColor: palette.maroon.main,
                              boxShadow: `0 0 0 4px ${palette.maroon.main}1f`,
                            },
                          },
                          footerActionLink: {
                            color: palette.maroon.main,
                            fontWeight: 700,
                            '&:hover': { color: palette.maroon.dark },
                          },
                          dividerLine: { backgroundColor: 'rgba(15, 24, 64, 0.1)' },
                          dividerText: { color: palette.navy.light },
                        },
                      }}
                      redirectUrl="/dashboard"
                      signUpUrl="/register"
                    />
                  </Box>
                </motion.div>
              ) : (
                <motion.div
                  key="prompt"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Box
                    sx={{
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px dashed rgba(255,255,255,0.16)',
                      borderRadius: 2.5,
                      p: 3,
                      textAlign: 'center',
                      color: 'rgba(255,255,255,0.85)',
                    }}
                  >
                    <ChevronRight sx={{ color: palette.gold, mb: 0.5 }} />
                    <Typography sx={{ fontWeight: 600 }}>
                      Pick a role above to reveal the secure login.
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                      Authenticated by Clerk · Powered by DormDoc
                    </Typography>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dev bypass — only renders in non-prod builds */}
            {dev.enabled && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', mb: 2 }}>
                  <Typography
                    variant="caption"
                    sx={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.18em' }}
                  >
                    DEVELOPER TOOLS
                  </Typography>
                </Divider>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1.2} alignItems="center">
                    <ScienceOutlined sx={{ color: palette.gold, fontSize: 20 }} />
                    <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                      Admin bypass — skip auth, load the dashboard
                    </Typography>
                  </Stack>
                  <Tooltip title={devOpen ? 'Hide' : 'Show roles'}>
                    <IconButton
                      onClick={() => setDevOpen((v) => !v)}
                      sx={{
                        color: palette.gold,
                        transition: 'transform 200ms ease',
                        transform: devOpen ? 'rotate(180deg)' : 'none',
                      }}
                    >
                      <ArrowDropDownCircleOutlined />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <Collapse in={devOpen}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                    {dev.availableRoles.map((role) => (
                      <Button
                        key={role}
                        variant="outlined"
                        size="small"
                        onClick={() => handleDevBypass(role)}
                        sx={{
                          color: '#FFFFFF',
                          borderColor: 'rgba(255,255,255,0.25)',
                          textTransform: 'capitalize',
                          '&:hover': {
                            borderColor: palette.gold,
                            backgroundColor: 'rgba(212, 162, 76, 0.12)',
                          },
                        }}
                      >
                        Enter as {role}
                      </Button>
                    ))}
                  </Stack>
                  <Typography
                    variant="caption"
                    sx={{ display: 'block', color: 'rgba(255,255,255,0.55)', mt: 1.5 }}
                  >
                    Visible only in development builds. Use it to inspect dashboard UI
                    without going through Clerk.
                  </Typography>
                </Collapse>
              </Box>
            )}
          </GlassPanel>
        </motion.div>
      </Box>

      {/* ─── Footer ─────────────────────────────────────── */}
      <Box
        sx={{
          position: 'relative',
          px: { xs: 3, md: 6 },
          pb: 2.5,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          gap: 1,
          color: 'rgba(255,255,255,0.7)',
        }}
      >
        <Typography variant="caption" sx={{ letterSpacing: '0.16em' }}>
          TERMS & CONDITIONS · PRIVACY
        </Typography>
        <Typography variant="caption" sx={{ letterSpacing: '0.16em' }}>
          POWERED BY DORMDOC · © {new Date().getFullYear()} BIT MESRA
        </Typography>
      </Box>
      {isMobile /* keep the institute info accessible on mobile too */ && null}
    </Box>
  );
};

export default ClerkLogin;
