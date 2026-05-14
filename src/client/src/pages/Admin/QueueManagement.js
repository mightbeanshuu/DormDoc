import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Typography,
  Stack,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Avatar,
  Alert,
  CircularProgress,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Queue,
  Person,
  Warning,
  Refresh,
  ArrowUpward,
  Done,
  Cancel,
  Schedule,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion } from 'framer-motion';
import axios from 'axios';
import { toast } from 'react-toastify';
import { palette } from '../../theme';
import {
  WelcomeBanner,
  StatTile,
  SectionCard,
  EmptyState,
  sectionFade,
} from '../../components/Dashboard/Primitives';

const QueueManagement = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');

  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery(
    'queueManagement',
    async () => {
      const response = await axios.get('/api/admin/dashboard');
      return response.data;
    },
    { refetchInterval: 15000 }
  );

  const updateStatus = useMutation(
    ({ appointmentId, status }) =>
      axios.patch(`/api/admin/appointments/${appointmentId}`, { status }),
    {
      onSuccess: () => {
        toast.success('Queue updated');
        queryClient.invalidateQueries('queueManagement');
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || 'Failed to update queue');
      },
    }
  );

  const studentQueue = useMemo(
    () => dashboardData?.studentQueue || [],
    [dashboardData]
  );
  const doctors = useMemo(() => dashboardData?.doctors || [], [dashboardData]);

  const filtered = useMemo(() => {
    if (filter === 'emergency') return studentQueue.filter((a) => a.isEmergency);
    if (filter === 'inprogress') return studentQueue.filter((a) => a.status === 'in-progress');
    if (filter === 'pending') return studentQueue.filter((a) => a.status === 'pending');
    return studentQueue;
  }, [studentQueue, filter]);

  const stats = useMemo(
    () => [
      {
        icon: Queue,
        label: 'In queue',
        value: studentQueue.length,
        accent: palette.maroon.main,
      },
      {
        icon: Warning,
        label: 'Emergency',
        value: studentQueue.filter((a) => a.isEmergency).length,
        accent: '#B0322B',
      },
      {
        icon: Schedule,
        label: 'In progress',
        value: studentQueue.filter((a) => a.status === 'in-progress').length,
        accent: palette.gold,
      },
      {
        icon: Done,
        label: 'Doctors on duty',
        value: doctors.filter((d) => d.isOnDuty).length,
        accent: '#2F7D5A',
      },
    ],
    [studentQueue, doctors]
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load queue data. Please try again.</Alert>;
  }

  return (
    <Box sx={{ pb: 4 }}>
      <WelcomeBanner
        overline="Live operations"
        title="Queue"
        highlight="management"
        subtitle="Manage who's waiting, who's being seen, and how the queue evolves through the day. Updates every 15 seconds."
        rightSlot={
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => refetch()}
            disabled={isFetching}
            sx={{
              color: '#FFFFFF',
              borderColor: 'rgba(255,255,255,0.4)',
              '&:hover': { borderColor: palette.gold, backgroundColor: 'rgba(212,162,76,0.1)' },
            }}
          >
            {isFetching ? 'Refreshing…' : 'Refresh now'}
          </Button>
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

      <Box sx={{ mt: 3 }}>
        <motion.div initial="hidden" animate="visible" variants={sectionFade} custom={5}>
          <SectionCard
            overline="Patients"
            title="Active queue"
            action={
              <ToggleButtonGroup
                exclusive
                value={filter}
                onChange={(e, v) => v && setFilter(v)}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    px: 1.5,
                    py: 0.4,
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    border: '1px solid rgba(15,24,64,0.12)',
                    color: palette.navy.dark,
                    '&.Mui-selected': {
                      backgroundColor: palette.maroon.main,
                      color: '#FFFFFF',
                      '&:hover': { backgroundColor: palette.maroon.dark },
                    },
                  },
                }}
              >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="pending">Pending</ToggleButton>
                <ToggleButton value="inprogress">In progress</ToggleButton>
                <ToggleButton value="emergency">Emergency</ToggleButton>
              </ToggleButtonGroup>
            }
          >
            {filtered.length === 0 ? (
              <EmptyState
                icon={Queue}
                title="No one in queue"
                hint={
                  filter === 'all'
                    ? 'Queue is empty right now.'
                    : `No ${filter} entries to show.`
                }
              />
            ) : (
              <Stack divider={<Divider flexItem />}>
                {filtered.map((appt) => (
                  <Stack
                    key={appt._id}
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    sx={{ py: 1.5 }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: appt.isEmergency ? '#B0322B' : palette.navy.main,
                        width: 38,
                        height: 38,
                      }}
                    >
                      {(appt.student?.name || '?').charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, color: palette.navy.dark }} noWrap>
                        {appt.student?.name || 'Unknown student'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: palette.navy.light }}>
                        Dr. {appt.doctor?.name || 'TBD'} · Queue #{appt.queueNumber || '—'} · Priority {appt.priority || '—'}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {appt.isEmergency && (
                        <Chip
                          label="SOS"
                          size="small"
                          sx={{
                            backgroundColor: '#B0322B',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            height: 22,
                          }}
                        />
                      )}
                      <Chip
                        label={appt.status || 'pending'}
                        size="small"
                        sx={{
                          height: 22,
                          backgroundColor:
                            appt.status === 'in-progress'
                              ? `${palette.gold}1f`
                              : `${palette.navy.main}14`,
                          color:
                            appt.status === 'in-progress'
                              ? '#7A5C00'
                              : palette.navy.dark,
                          fontWeight: 700,
                          textTransform: 'capitalize',
                        }}
                      />
                      <Tooltip title="Bump priority">
                        <IconButton
                          size="small"
                          onClick={() =>
                            updateStatus.mutate({ appointmentId: appt._id, status: 'in-progress' })
                          }
                          sx={{ color: palette.navy.dark }}
                        >
                          <ArrowUpward fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Mark completed">
                        <IconButton
                          size="small"
                          onClick={() =>
                            updateStatus.mutate({ appointmentId: appt._id, status: 'completed' })
                          }
                          sx={{ color: '#2F7D5A' }}
                        >
                          <Done fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Cancel">
                        <IconButton
                          size="small"
                          onClick={() =>
                            updateStatus.mutate({ appointmentId: appt._id, status: 'cancelled' })
                          }
                          sx={{ color: '#B0322B' }}
                        >
                          <Cancel fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            )}
          </SectionCard>
        </motion.div>
      </Box>

      <Box sx={{ mt: 3 }}>
        <motion.div initial="hidden" animate="visible" variants={sectionFade} custom={6}>
          <SectionCard overline="Coverage" title="Doctors on duty">
            {doctors.length === 0 ? (
              <EmptyState icon={Person} title="No doctors yet" hint="Add medical faculty to view duty status." />
            ) : (
              <Grid container spacing={2}>
                {doctors.map((doc) => (
                  <Grid item xs={12} sm={6} md={4} key={doc._id}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1.5}
                      sx={{
                        p: 2,
                        borderRadius: 2.5,
                        border: '1px solid rgba(15,24,64,0.08)',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      <Avatar
                        sx={{
                          bgcolor: doc.isOnDuty ? '#2F7D5A' : palette.navy.light,
                          width: 40,
                          height: 40,
                        }}
                      >
                        {(doc.name || 'D').charAt(0)}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontWeight: 600, color: palette.navy.dark }} noWrap>
                          Dr. {doc.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: palette.navy.light }} noWrap>
                          {doc.specialization || '—'} · {doc.currentPatientCount || 0} today
                        </Typography>
                      </Box>
                      <Chip
                        label={doc.isOnDuty ? 'On duty' : 'Off'}
                        size="small"
                        sx={{
                          height: 22,
                          backgroundColor: doc.isOnDuty ? '#2F7D5A1f' : 'rgba(15,24,64,0.06)',
                          color: doc.isOnDuty ? '#2F7D5A' : palette.navy.dark,
                          fontWeight: 700,
                        }}
                      />
                    </Stack>
                  </Grid>
                ))}
              </Grid>
            )}
          </SectionCard>
        </motion.div>
      </Box>
    </Box>
  );
};

export default QueueManagement;
