import React from 'react';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { useDevBypass } from '../../contexts/DevBypassContext';

/**
 * Renders children when the user is signed in via Clerk OR when the dev
 * bypass is active (development only). Redirects to /login otherwise.
 */
const RequireAuth = ({ children }) => {
  const { active: bypassActive } = useDevBypass();

  if (bypassActive) {
    return <>{children}</>;
  }

  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <Navigate to="/login" replace />
      </SignedOut>
    </>
  );
};

export default RequireAuth;
