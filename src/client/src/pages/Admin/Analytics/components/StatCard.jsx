import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

export default function StatCard({ title, value, subtitle }) {
  return (
    <Card sx={{ minWidth: 180, flex: 1 }}>
      <CardContent>
        <Typography color="text.secondary" variant="body2" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" fontWeight="bold">
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
