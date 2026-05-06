import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { Box, Container, Typography, Paper } from '@mui/material';

const ClerkLogin = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1A365D 0%, #0F172A 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          opacity: 0.5,
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            py: 4,
          }}
        >
          {/* Left Panel - Branding */}
          <Paper
            elevation={24}
            sx={{
              flex: 1,
              maxWidth: '550px',
              background: 'linear-gradient(145deg, #C41E3A 0%, #8B0000 100%)',
              color: 'white',
              p: 6,
              borderRadius: '24px 0 0 24px',
              position: 'relative',
              overflow: 'hidden',
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '650px',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRight: 'none',
            }}
          >
            {/* Background Accent */}
            <Box sx={{
              position: 'absolute',
              top: '-10%',
              right: '-10%',
              width: '300px',
              height: '300px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,215,0,0.1) 0%, rgba(255,255,255,0) 70%)',
            }}/>

            {/* BIT Emblem */}
            <Box sx={{ 
              textAlign: 'center', 
              mb: 4,
              p: 2,
              background: 'white',
              borderRadius: '50%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              width: 140,
              height: 140,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img src="/assets/bit_logo.png" alt="BIT Mesra Logo" style={{ width: 120, height: 120, objectFit: 'contain' }} />
            </Box>

            <Typography
              variant="h4"
              sx={{
                fontWeight: '900',
                mb: 1,
                textAlign: 'center',
                color: '#ffffff',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                letterSpacing: 1
              }}
            >
              Birla Institute of Technology
            </Typography>

            <Typography
              variant="h6"
              sx={{
                textAlign: 'center',
                mb: 5,
                color: '#FFD700',
                fontWeight: 600,
                letterSpacing: 2,
                textTransform: 'uppercase'
              }}
            >
              Mesra, Ranchi
            </Typography>

            {/* DormDoc Logo & Title */}
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              background: 'rgba(0,0,0,0.2)',
              p: 3,
              borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.1)',
              width: '100%'
            }}>
              <img src="/assets/dormdoc_logo.png" alt="DormDoc Logo" style={{ width: 80, height: 'auto', marginBottom: '16px', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }} />
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 'bold',
                  color: '#ffffff',
                  textAlign: 'center',
                  mb: 1
                }}
              >
                DormDoc System
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  textAlign: 'center',
                  color: 'rgba(255,255,255,0.8)',
                  lineHeight: 1.6,
                }}
              >
                Comprehensive & Intelligent Healthcare Management
              </Typography>
            </Box>
          </Paper>

          {/* Right Panel - Clerk Sign In */}
          <Paper
            elevation={24}
            sx={{
              flex: 1,
              maxWidth: '500px',
              background: '#ffffff',
              p: { xs: 4, md: 6 },
              borderRadius: { xs: '24px', md: '0 24px 24px 0' },
              minHeight: '650px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 5 }}>
              {/* Show logo on mobile where left panel is hidden */}
              <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', mb: 3 }}>
                <img src="/assets/bit_logo.png" alt="BIT Mesra Logo" style={{ width: 80, height: 80 }} />
              </Box>
              
              <Typography
                variant="h4"
                sx={{
                  fontWeight: '800',
                  mb: 1,
                  color: '#1A365D',
                }}
              >
                Welcome Back
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: '#64748B',
                }}
              >
                Sign in to access your student medical portal
              </Typography>
            </Box>

            {/* Clerk Sign In Component */}
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <SignIn
                appearance={{
                  elements: {
                    rootBox: {
                      width: '100%',
                    },
                    card: {
                      width: '100%',
                      boxShadow: 'none',
                      border: 'none',
                      padding: 0,
                    },
                    header: {
                      display: 'none', // We use our own header above
                    },
                    formButtonPrimary: {
                      backgroundColor: '#C41E3A',
                      padding: '12px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      textTransform: 'none',
                      '&:hover': {
                        backgroundColor: '#8B0000',
                      },
                    },
                    socialButtonsBlockButton: {
                      padding: '12px',
                      border: '2px solid #E2E8F0',
                      '&:hover': {
                        backgroundColor: '#F8FAFC',
                        borderColor: '#CBD5E1',
                      },
                    },
                    formFieldInput: {
                      padding: '12px',
                      border: '2px solid #E2E8F0',
                      backgroundColor: '#F8FAFC',
                      '&:focus': {
                        borderColor: '#C41E3A',
                        boxShadow: '0 0 0 4px rgba(196, 30, 58, 0.1)',
                      },
                    },
                    footerActionLink: {
                      color: '#C41E3A',
                      fontWeight: 'bold',
                      '&:hover': {
                        color: '#8B0000',
                      },
                    },
                  },
                }}
                redirectUrl="/"
                signUpUrl="/register"
              />
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default ClerkLogin;
