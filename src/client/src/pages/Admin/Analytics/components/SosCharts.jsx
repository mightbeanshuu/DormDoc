import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import StatCard from './StatCard';

export default function SosCharts({ data }) {
  if (!data) return null;

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <StatCard title="Total SOS Events" value={data.totalSOS} />
        <StatCard title="Emergency Appointments" value={data.emergencyAppointments} />
        <StatCard title="Ambulance Trips" value={data.ambulanceTrips} />
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>SOS Frequency Trend</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.frequencyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" name="SOS Events" stroke="#d32f2f" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
