import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser, useAuth, useClerk } from '@clerk/clerk-react';
import { useDevBypass } from './DevBypassContext';

const ClerkAuthContext = createContext();

export const useClerkAuth = () => {
  const context = useContext(ClerkAuthContext);
  if (!context) {
    throw new Error('useClerkAuth must be used within a ClerkAuthProvider');
  }
  return context;
};

export const ClerkAuthProvider = ({ children }) => {
  const { user, isLoaded: userLoaded } = useUser();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { signOut } = useClerk();
  const { active: bypassActive, mockUser } = useDevBypass();
  const [loading, setLoading] = useState(true);
  const [mongoUser, setMongoUser] = useState(null);

  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    // Skip the API sync entirely when running with the dev bypass —
    // there's no real Clerk session, so the sync endpoint would 401.
    if (bypassActive) {
      setLoading(false);
      return;
    }

    const syncUser = async () => {
      if (userLoaded && authLoaded && user) {
        try {
          const role = localStorage.getItem('pendingRole') || user.publicMetadata?.role || 'student';
          const res = await fetch('/api/clerk-auth/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clerkUserId: user.id,
              email: user.primaryEmailAddress?.emailAddress,
              name: user.fullName,
              role,
            }),
          });
          const data = await res.json();
          if (data.user) {
            setMongoUser(data.user);
          }
          if (data.needsOnboarding) {
            setNeedsOnboarding(true);
          }
        } catch (error) {
          console.error('Failed to sync user with DB:', error);
        } finally {
          setLoading(false);
        }
      } else if (userLoaded && authLoaded) {
        setLoading(false);
      }
    };
    
    syncUser();
  }, [user, userLoaded, authLoaded, bypassActive]);

  const login = async (email, password) => {
    // Clerk handles login automatically
    // This is just for compatibility with existing code
    return { success: true };
  };

  const register = async (userData) => {
    // Clerk handles registration automatically
    // This is just for compatibility with existing code
    return { success: true };
  };

  const logout = async () => {
    try {
      await signOut();
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      if (user) {
        await user.update(profileData);
        return { success: true };
      }
      return { success: false, error: 'User not found' };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: error.message };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    // Clerk handles password changes
    return { success: true };
  };

  const getUserQRCode = () => {
    // Generate QR code for Clerk user
    if (user) {
      const qrData = {
        id: user.id,
        name: user.fullName,
        email: user.primaryEmailAddress?.emailAddress,
        role: user.publicMetadata?.role || 'student',
        studentId: user.publicMetadata?.studentId,
        department: user.publicMetadata?.department,
        year: user.publicMetadata?.year,
        phone: user.publicMetadata?.phone,
        bloodGroup: user.publicMetadata?.bloodGroup,
        emergencyContact: user.publicMetadata?.emergencyContact,
        timestamp: new Date().toISOString(),
        type: 'user_id',
        version: '1.0',
      };
      
      // Store in localStorage for compatibility
      localStorage.setItem('userQRCode', JSON.stringify(qrData));
      return qrData;
    }
    return null;
  };

  const regenerateQRCode = async () => {
    // Clerk doesn't need QR code regeneration
    return { success: true };
  };

  const clerkDerivedUser = user
    ? {
        _id: user.id,
        name: user.fullName,
        email: user.primaryEmailAddress?.emailAddress,
        role: localStorage.getItem('pendingRole') || user.publicMetadata?.role || 'student',
        studentId: user.publicMetadata?.studentId,
        department: user.publicMetadata?.department,
        year: user.publicMetadata?.year,
        phone: user.publicMetadata?.phone,
        bloodGroup: user.publicMetadata?.bloodGroup,
        emergencyContact: user.publicMetadata?.emergencyContact,
        lastLogin: user.lastSignInAt,
        loginCount: user.signInCount,
      }
    : null;

  const value = {
    // When the dev bypass is active, surface the mock user to every consumer.
    user: bypassActive ? mockUser : clerkDerivedUser,
    loading,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    getUserQRCode,
    regenerateQRCode,
    isSignedIn: bypassActive ? true : isSignedIn,
    needsOnboarding: bypassActive ? false : needsOnboarding,
    setNeedsOnboarding,
    mongoUser: bypassActive ? mockUser : mongoUser,
    setMongoUser,
  };

  return (
    <ClerkAuthContext.Provider value={value}>
      {children}
    </ClerkAuthContext.Provider>
  );
};
