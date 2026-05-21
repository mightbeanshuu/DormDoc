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

export default function LeaveCharts({ data }) {
  if (!data) return null;

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatCard title="Total Leave Requests" value={data.total} />
        </Grid>
        {data.byStatus?.map((s) => (
          <Grid item xs={6} sm={3} key={s.status}>
            <StatCard title={s.status?.charAt(0).toUpperCase() + s.status?.slice(1)} value={s.count} />
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>Leave Requests — Monthly Trend</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#ed6c02" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
