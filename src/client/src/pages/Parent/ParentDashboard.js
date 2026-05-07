import React from 'react';
import { Box, Typography, Grid, Paper, Card, CardContent, Divider, Avatar, List, ListItem, ListItemAvatar, ListItemText, Chip } from '@mui/material';
import { FamilyRestroom, LocalHospital, Assignment, VerifiedUser, AccessTime, MonitorHeart } from '@mui/icons-material';

const ParentDashboard = () => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <Avatar sx={{ bgcolor: '#ec4899', width: 56, height: 56, mr: 2 }}>
          <FamilyRestroom fontSize="large" />
        </Avatar>
        <Box>
          <Typography variant="h4" fontWeight="bold" color="#1A365D">
            Parent Portal
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Ward Health Tracking & Notifications
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Ward Info Card */}
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ borderRadius: 3, height: '100%' }}>
            <Box sx={{ bgcolor: '#1A365D', p: 3, color: 'white', textAlign: 'center' }}>
              <Avatar sx={{ width: 80, height: 80, margin: '0 auto', mb: 2, border: '4px solid white', bgcolor: '#3b82f6' }}>
                W
              </Avatar>
              <Typography variant="h6" fontWeight="bold">Alex Johnson</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>B.Tech - Computer Science</Typography>
            </Box>
            <CardContent>
              <List disablePadding>
                <ListItem divider>
                  <ListItemText primary="Hostel" secondary="H-1, Room 204" />
                </ListItem>
                <ListItem divider>
                  <ListItemText primary="Blood Group" secondary="O+" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Current Health Status" secondary={<Chip label="Healthy" color="success" size="small" sx={{ mt: 0.5 }} />} />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Grid container spacing={3}>
            {/* Quick Metrics */}
            <Grid item xs={12} sm={6}>
              <Paper elevation={3} sx={{ p: 3, borderRadius: 3, display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: '#e0f2fe', color: '#0ea5e9', width: 50, height: 50, mr: 2 }}>
                  <LocalHospital />
                </Avatar>
                <Box>
                  <Typography variant="h4" color="#1A365D" fontWeight="bold">2</Typography>
                  <Typography color="text.secondary">Recent Dispensary Visits</Typography>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper elevation={3} sx={{ p: 3, borderRadius: 3, display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: '#fef3c7', color: '#f59e0b', width: 50, height: 50, mr: 2 }}>
                  <Assignment />
                </Avatar>
                <Box>
                  <Typography variant="h4" color="#1A365D" fontWeight="bold">1</Typography>
                  <Typography color="text.secondary">Active Prescriptions</Typography>
                </Box>
              </Paper>
            </Grid>

            {/* Recent Activity Timeline */}
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" fontWeight="bold" color="#1A365D" mb={2} display="flex" alignItems="center">
                  <MonitorHeart sx={{ mr: 1 }} /> Health Timeline
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <List>
                  <ListItem alignItems="flex-start" divider>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#e0f2fe', color: '#0ea5e9' }}>
                        <VerifiedUser />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary="Routine Health Checkup Completed"
                      secondary="Dr. Sharma • Yesterday at 10:30 AM"
                    />
                    <Chip label="Normal" color="success" size="small" />
                  </ListItem>
                  <ListItem alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#fef3c7', color: '#f59e0b' }}>
                        <AccessTime />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary="Medical Leave Approved"
                      secondary="2 Days Leave for Viral Fever • Last Month"
                    />
                  </ListItem>
                </List>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ParentDashboard;
