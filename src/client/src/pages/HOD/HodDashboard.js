import React from 'react';
import { Box, Typography, Grid, Paper, Card, CardContent, Divider, Avatar, LinearProgress } from '@mui/material';
import {
  AccountBalance,
  Assignment,
  PendingActions,
  TrendingUp,
} from '@mui/icons-material';

const HodDashboard = () => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <Avatar sx={{ bgcolor: '#f59e0b', width: 56, height: 56, mr: 2 }}>
          <AccountBalance fontSize="large" />
        </Avatar>
        <Box>
          <Typography variant="h4" fontWeight="bold" color="#1A365D">
            HOD Overview
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Departmental Medical & Leave Summary
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Quick Stats */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ borderRadius: 3, borderLeft: '6px solid #3b82f6' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Pending Leave Requests</Typography>
              <Typography variant="h3" color="#1A365D" fontWeight="bold">12</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ borderRadius: 3, borderLeft: '6px solid #10b981' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Approved Leaves (This Month)</Typography>
              <Typography variant="h3" color="#1A365D" fontWeight="bold">45</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ borderRadius: 3, borderLeft: '6px solid #f59e0b' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Active Medical Cases</Typography>
              <Typography variant="h3" color="#1A365D" fontWeight="bold">8</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ borderRadius: 3, borderLeft: '6px solid #ef4444' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Emergency Alerts</Typography>
              <Typography variant="h3" color="#1A365D" fontWeight="bold">0</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Detailed Panels */}
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight="bold" color="#1A365D" mb={2} display="flex" alignItems="center">
              <PendingActions sx={{ mr: 1 }} /> Recent Leave Applications
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <Assignment sx={{ fontSize: 60, color: '#cbd5e1', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Leave Request Management System integration pending.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Soon you will be able to approve/reject departmental leaves directly from here.
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight="bold" color="#1A365D" mb={2} display="flex" alignItems="center">
              <TrendingUp sx={{ mr: 1 }} /> Department Health Metrics
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Average Recovery Rate</Typography>
                <Typography variant="body2" fontWeight="bold">94%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={94} sx={{ height: 8, borderRadius: 4, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#10b981' } }} />
            </Box>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Leave Approval Rate</Typography>
                <Typography variant="body2" fontWeight="bold">78%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={78} sx={{ height: 8, borderRadius: 4, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#f59e0b' } }} />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HodDashboard;
