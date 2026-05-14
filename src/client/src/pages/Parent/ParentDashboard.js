import React from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import {
  FamilyRestroom,
  LocalHospital,
  Assignment,
  VerifiedUser,
  AccessTime,
  MonitorHeart,
  Medication,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { palette } from '../../theme';
import {
  WelcomeBanner,
  StatTile,
  SectionCard,
  sectionFade,
} from '../../components/Dashboard/Primitives';

const ParentDashboard = () => {
  const wardName = 'Alex Johnson';
  const wardProgramme = 'B.Tech · Computer Science';

  const stats = [
    { icon: LocalHospital, label: 'Recent visits', value: 2, accent: palette.maroon.main, hint: 'Past 30 days' },
    { icon: Medication, label: 'Active prescriptions', value: 1, accent: palette.gold, hint: 'Currently on course' },
    { icon: Assignment, label: 'Medical leaves', value: 1, accent: palette.navy.main, hint: 'This semester' },
    { icon: VerifiedUser, label: 'Health status', value: 'Stable', accent: '#2F7D5A' },
  ];

  return (
    <Box sx={{ pb: 4 }}>
      <WelcomeBanner
        overline="Parent portal"
        title="Your ward"
        highlight="at a glance"
        subtitle="A calm, current view of your ward's medical activity at BIT Mesra — appointments, prescriptions and any leave taken on health grounds."
        rightSlot={
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Avatar
              sx={{
                width: 52,
                height: 52,
                bgcolor: palette.gold,
                color: palette.navy.dark,
                fontFamily: '"Playfair Display", serif',
                fontWeight: 700,
                border: `2px solid rgba(255,255,255,0.4)`,
              }}
            >
              <FamilyRestroom />
            </Avatar>
          </Stack>
        }
      />

      <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
        {stats.map((s, i) => (
          <Grid item xs={6} md={3} key={s.label}>
            <motion.div initial="hidden" animate="visible" variants={sectionFade} custom={i + 1}>
              <StatTile {...s} />
            </motion.div>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 0.5 }}>
        <Grid item xs={12} md={4}>
          <motion.div initial="hidden" animate="visible" variants={sectionFade} custom={4}>
            <Card sx={{ borderRadius: 3, height: '100%', overflow: 'hidden' }}>
              <Box
                sx={{
                  p: 3,
                  background: `linear-gradient(135deg, ${palette.navy.dark} 0%, ${palette.maroon.dark} 100%)`,
                  color: '#FFFFFF',
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                <Avatar
                  sx={{
                    width: 84,
                    height: 84,
                    mx: 'auto',
                    mb: 1.5,
                    bgcolor: palette.gold,
                    color: palette.navy.dark,
                    fontFamily: '"Playfair Display", serif',
                    fontWeight: 700,
                    fontSize: '2rem',
                    border: '3px solid rgba(255,255,255,0.18)',
                  }}
                >
                  {wardName.charAt(0)}
                </Avatar>
                <Typography
                  sx={{
                    fontFamily: '"Playfair Display", serif',
                    fontWeight: 700,
                    fontSize: '1.15rem',
                  }}
                >
                  {wardName}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.86rem', mt: 0.25 }}>
                  {wardProgramme}
                </Typography>
                <Chip
                  label="Healthy"
                  size="small"
                  sx={{
                    mt: 1.5,
                    height: 22,
                    backgroundColor: 'rgba(47, 125, 90, 0.22)',
                    color: '#9BE3C2',
                    fontWeight: 700,
                    border: '1px solid rgba(155, 227, 194, 0.3)',
                  }}
                />
              </Box>
              <CardContent>
                <Stack divider={<Divider />} spacing={1.5}>
                  {[
                    ['Hostel', 'H-1, Room 204'],
                    ['Blood group', 'O+'],
                    ['Year', '3rd · B.Tech CSE'],
                    ['Emergency contact', '+91-9000000000'],
                  ].map(([label, val]) => (
                    <Stack key={label} direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" sx={{ color: palette.navy.light, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                        {label}
                      </Typography>
                      <Typography sx={{ fontWeight: 600, color: palette.navy.dark, fontSize: '0.92rem' }}>
                        {val}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} md={8}>
          <motion.div initial="hidden" animate="visible" variants={sectionFade} custom={5}>
            <SectionCard overline="Timeline" title="Recent health activity">
              <List disablePadding>
                <ListItem alignItems="flex-start" divider sx={{ px: 0, py: 2 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: `${palette.navy.main}14`, color: palette.navy.main }}>
                      <VerifiedUser />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography sx={{ fontWeight: 600, color: palette.navy.dark }}>
                        Routine health checkup completed
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" sx={{ color: palette.navy.light }}>
                        Dr. Sharma · Yesterday at 10:30 AM
                      </Typography>
                    }
                  />
                  <Chip
                    label="Normal"
                    size="small"
                    sx={{
                      height: 22,
                      backgroundColor: '#2F7D5A1f',
                      color: '#2F7D5A',
                      fontWeight: 700,
                    }}
                  />
                </ListItem>
                <ListItem alignItems="flex-start" divider sx={{ px: 0, py: 2 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: `${palette.gold}26`, color: '#7A5C00' }}>
                      <AccessTime />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography sx={{ fontWeight: 600, color: palette.navy.dark }}>
                        Medical leave approved
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" sx={{ color: palette.navy.light }}>
                        2 days · viral fever · last month
                      </Typography>
                    }
                  />
                  <Chip
                    label="Resolved"
                    size="small"
                    sx={{
                      height: 22,
                      backgroundColor: `${palette.navy.main}14`,
                      color: palette.navy.dark,
                      fontWeight: 700,
                    }}
                  />
                </ListItem>
                <ListItem alignItems="flex-start" sx={{ px: 0, py: 2 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: `${palette.maroon.main}14`, color: palette.maroon.main }}>
                      <MonitorHeart />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography sx={{ fontWeight: 600, color: palette.navy.dark }}>
                        Prescription · Paracetamol 500mg
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" sx={{ color: palette.navy.light }}>
                        3-day course · Dr. Sharma
                      </Typography>
                    }
                  />
                  <Chip
                    label="Active"
                    size="small"
                    sx={{
                      height: 22,
                      backgroundColor: `${palette.gold}1f`,
                      color: '#7A5C00',
                      fontWeight: 700,
                    }}
                  />
                </ListItem>
              </List>
            </SectionCard>
          </motion.div>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ParentDashboard;
