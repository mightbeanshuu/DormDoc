import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import StatCard from './StatCard';

export default function GrowthCharts({ data }) {
  if (!data) return null;

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <StatCard title="Total Users" value={data.totalUsers} />
        <StatCard title="Active Users (30d)" value={data.activeUsers} subtitle="Users with appointments or leave requests" />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Card sx={{ flex: 2, minWidth: 400 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Registrations Over Time</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.registrationsByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" name="Registrations" stroke="#1976d2" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 300 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Role Distribution</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.roleDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="role" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Users" fill="#7b1fa2" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
