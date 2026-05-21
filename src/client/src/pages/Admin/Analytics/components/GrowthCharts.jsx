import React from 'react';
import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

function StatCard({ title, value }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
        <Typography variant="h4" sx={{ mt: 1 }}>{value ?? '-'}</Typography>
      </CardContent>
    </Card>
  );
}

export default function GrowthCharts({ data }) {
  if (!data) return null;

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatCard title="Total Users" value={data.totalUsers} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard title="Active Users (30d)" value={data.activeUsers} />
        </Grid>
        {data.roleDistribution?.map((r) => (
          <Grid item xs={6} sm={3} key={r.role}>
            <StatCard title={`Role: ${r.role}`} value={r.count} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>Registrations Over Time</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.registrationsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#1976d2" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>Role Distribution</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.roleDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="role" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#7b1fa2" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
