import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Refresh, Download } from '@mui/icons-material';
import useAnalytics from './useAnalytics';
import GrowthCharts from './components/GrowthCharts';
import LeaveCharts from './components/LeaveCharts';
import AppointmentCharts from './components/AppointmentCharts';
import SosCharts from './components/SosCharts';
import { exportCsv } from '../../../services/adminAnalyticsApi';

const TABS = ['Growth', 'Leave', 'Appointments', 'SOS'];
const DATASET_KEYS = ['growth', 'leave', 'appointments', 'sos'];

export default function AnalyticsDashboard() {
  const [tab, setTab] = useState(0);
  const { growth, leave, appointments, sos, loading, error, refresh } = useAnalytics();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const panels = [
    <GrowthCharts data={growth} />,
    <LeaveCharts data={leave} />,
    <AppointmentCharts data={appointments} />,
    <SosCharts data={sos} />,
  ];

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5" fontWeight="bold">
          Admin Analytics
        </Typography>
        <Box>
          <Tooltip title="Download CSV">
            <IconButton onClick={() => exportCsv(DATASET_KEYS[tab])}>
              <Download />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh data">
            <IconButton onClick={refresh}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        {TABS.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>

      {panels[tab]}
    </Box>
  );
}
