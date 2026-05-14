import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Avatar,
} from '@mui/material';
import { ArrowOutward } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { palette } from '../../theme';

export const sectionFade = {
  hidden: { opacity: 0, y: 14 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.06 * i, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
};

export const greetingFor = (date) => {
  const h = date.getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
};

export const WelcomeBanner = ({
  overline,
  title,
  highlight,
  subtitle,
  timestamp,
  rightSlot,
}) => (
  <motion.div initial="hidden" animate="visible" variants={sectionFade} custom={0}>
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 3,
        p: { xs: 3, md: 5 },
        color: '#FFFFFF',
        background: `
          radial-gradient(800px 400px at 0% 0%, rgba(212, 162, 76, 0.22), transparent 60%),
          radial-gradient(700px 400px at 100% 100%, rgba(26, 43, 92, 0.5), transparent 55%),
          linear-gradient(135deg, ${palette.maroon.dark} 0%, ${palette.maroon.main} 50%, ${palette.navy.main} 100%)
        `,
        boxShadow: '0 20px 50px rgba(123, 30, 30, 0.18)',
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at 0% 0%, black 0%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 0% 0%, black 0%, transparent 70%)',
        }}
      />
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
        spacing={3}
        sx={{ position: 'relative' }}
      >
        <Box sx={{ minWidth: 0 }}>
          {overline && (
            <Typography
              variant="overline"
              sx={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.22em' }}
            >
              {overline}
            </Typography>
          )}
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '1.85rem', md: '2.6rem' },
              mt: 1,
              mb: 1,
              color: '#FFFFFF',
            }}
          >
            {title}
            {highlight && (
              <>
                {' '}
                <Box component="span" sx={{ fontStyle: 'italic', color: palette.gold }}>
                  {highlight}
                </Box>
              </>
            )}
            .
          </Typography>
          {subtitle && (
            <Typography sx={{ color: 'rgba(255,255,255,0.82)', maxWidth: 640 }}>
              {subtitle}
            </Typography>
          )}
          {timestamp && (
            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 3, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.18em' }}
            >
              LIVE · {timestamp}
            </Typography>
          )}
        </Box>
        {rightSlot && <Box>{rightSlot}</Box>}
      </Stack>
    </Box>
  </motion.div>
);

export const StatTile = ({ icon: Icon, label, value, accent = palette.maroon.main, hint }) => (
  <Card
    sx={{
      height: '100%',
      borderRadius: 3,
      border: '1px solid rgba(15, 24, 64, 0.06)',
      background: '#FFFFFF',
      transition: 'transform 220ms ease, box-shadow 220ms ease',
      '&:hover': {
        transform: 'translateY(-3px)',
        boxShadow: '0 16px 36px rgba(15, 24, 64, 0.08)',
      },
    }}
  >
    <CardContent>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            backgroundColor: `${accent}14`,
            color: accent,
          }}
        >
          {Icon ? <Icon /> : null}
        </Box>
        <Typography variant="overline" sx={{ color: palette.navy.light, textAlign: 'right' }}>
          {label}
        </Typography>
      </Stack>
      <Typography
        sx={{
          mt: 2,
          fontFamily: '"Playfair Display", serif',
          fontWeight: 700,
          fontSize: '2.1rem',
          color: palette.navy.dark,
          lineHeight: 1.1,
        }}
      >
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" sx={{ display: 'block', color: palette.navy.light, mt: 0.5 }}>
          {hint}
        </Typography>
      )}
    </CardContent>
  </Card>
);

export const QuickAction = ({ icon: Icon, label, color = palette.maroon.main, onClick }) => (
  <Box
    component={motion.button}
    whileHover={{ y: -2 }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    sx={{
      all: 'unset',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      gap: 2,
      padding: '14px 16px',
      borderRadius: 2.5,
      border: '1px solid rgba(15, 24, 64, 0.08)',
      backgroundColor: '#FFFFFF',
      transition: 'border-color 200ms ease, box-shadow 200ms ease',
      '&:hover': {
        borderColor: `${color}66`,
        boxShadow: `0 10px 26px ${color}22`,
      },
    }}
  >
    <Box
      sx={{
        width: 42,
        height: 42,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        backgroundColor: `${color}14`,
        color,
      }}
    >
      {Icon ? <Icon /> : null}
    </Box>
    <Typography sx={{ flex: 1, fontWeight: 600, color: palette.navy.dark }}>
      {label}
    </Typography>
    <ArrowOutward sx={{ color, opacity: 0.6 }} fontSize="small" />
  </Box>
);

export const SectionCard = ({ title, overline, action, children, sx = {} }) => (
  <Card sx={{ height: '100%', borderRadius: 3, ...sx }}>
    <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
      {(title || overline || action) && (
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Box>
            {overline && (
              <Typography variant="overline" sx={{ color: palette.navy.light }}>
                {overline}
              </Typography>
            )}
            {title && (
              <Typography variant="h6" sx={{ color: palette.navy.dark, fontWeight: 700 }}>
                {title}
              </Typography>
            )}
          </Box>
          {action && <Box>{action}</Box>}
        </Stack>
      )}
      {children}
    </CardContent>
  </Card>
);

export const PersonRow = ({ avatarColor = palette.maroon.main, name, sub, right }) => (
  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ py: 1.25 }}>
    <Avatar sx={{ bgcolor: avatarColor, width: 36, height: 36 }}>
      {(name || '?').charAt(0).toUpperCase()}
    </Avatar>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{ fontWeight: 600, color: palette.navy.dark, fontSize: '0.94rem' }} noWrap>
        {name}
      </Typography>
      {sub && (
        <Typography variant="caption" sx={{ color: palette.navy.light }}>
          {sub}
        </Typography>
      )}
    </Box>
    {right}
  </Stack>
);

export const EmptyState = ({ icon: Icon, title, hint }) => (
  <Box sx={{ textAlign: 'center', py: 5 }}>
    {Icon && (
      <Box
        sx={{
          mx: 'auto',
          mb: 1.5,
          width: 52,
          height: 52,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          color: palette.navy.light,
          backgroundColor: 'rgba(15,24,64,0.05)',
        }}
      >
        <Icon />
      </Box>
    )}
    {title && (
      <Typography sx={{ color: palette.navy.dark, fontWeight: 600 }}>{title}</Typography>
    )}
    {hint && (
      <Typography variant="body2" sx={{ color: palette.navy.light, mt: 0.5 }}>
        {hint}
      </Typography>
    )}
  </Box>
);
