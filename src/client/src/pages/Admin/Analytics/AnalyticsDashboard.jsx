import React, { useState } from 'react';
import {
  Box, Tabs, Tab, Typography, Button, CircularProgress, Alert, Stack,
} from '@mui/material';
import { Refresh, Download } from '@mui/icons-material';
import { useQueryClient } from 'react-query';
import { useGrowth, useLeave, useAppointments, useSos } from './useAnalytics';
import { downloadCsv } from '../../../services/adminAnalyticsApi';
import GrowthCharts from './components/GrowthCharts';
import LeaveCharts from './components/LeaveCharts';
import AppointmentCharts from './components/AppointmentCharts';
import SosCharts from './components/SosCharts';

const TABS = ['Growth', 'Leave', 'Appointments', 'SOS'];
const DATASETS = ['growth', 'leave', 'appointments', 'sos'];

export default function AnalyticsDashboard() {
  const [tab, setTab] = useState(0);
  const [fresh, setFresh] = useState(false);
  const queryClient = useQueryClient();

  const growth = useGrowth(fresh);
  const leave = useLeave(fresh);
  const appointments = useAppointments(fresh);
  const sos = useSos(fresh);

  const queries = [growth, leave, appointments, sos];
  const current = queries[tab];

  const handleRefresh = () => {
    setFresh(true);
    queryClient.invalidateQueries(['adminAnalytics']);
    // Reset fresh flag after refetch triggers
    setTimeout(() => setFresh(false), 500);
  };

  const handleExport = () => {
    downloadCsv(DATASETS[tab]);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Admin Analytics</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Download />}
            onClick={handleExport}
          >
            Export CSV
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Refresh />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </Stack>
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        {TABS.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>

      {current.isLoading && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      )}

      {current.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load {TABS[tab].toLowerCase()} analytics. {current.error?.message}
        </Alert>
      )}

      {!current.isLoading && !current.isError && (
        <>
          {tab === 0 && <GrowthCharts data={growth.data?.data} />}
          {tab === 1 && <LeaveCharts data={leave.data?.data} />}
          {tab === 2 && <AppointmentCharts data={appointments.data?.data} />}
          {tab === 3 && <SosCharts data={sos.data?.data} />}
        </>
      )}
    </Box>
  );
}
