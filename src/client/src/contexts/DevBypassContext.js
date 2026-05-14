import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

/**
 * Dev bypass — lets developers and admins load any dashboard without going
 * through Clerk. Only enabled when NODE_ENV !== 'production'.
 *
 * State lives in localStorage so it persists across reloads but doesn't ship
 * anywhere a real user could enable it in production.
 */

const STORAGE_KEY = 'dormdoc.devBypass.v1';

const DevBypassContext = createContext(null);

export const DEV_BYPASS_ENABLED = process.env.NODE_ENV !== 'production';

const MOCK_USERS = {
  student: {
    _id: 'dev-bypass-student',
    name: 'Anshu (Dev Student)',
    email: 'dev.student@bitmesra.ac.in',
    role: 'student',
    studentId: 'BIT/CSE/2024/001',
    department: 'Computer Science & Engineering',
    phone: '+91 90000 00000',
    bloodGroup: 'O+',
  },
  doctor: {
    _id: 'dev-bypass-doctor',
    name: 'Dr. Bypass (Dev Doctor)',
    email: 'dev.doctor@bitmesra.ac.in',
    role: 'doctor',
    department: 'Dispensary',
    specialization: 'General Physician',
    phone: '+91 90000 00001',
  },
  admin: {
    _id: 'dev-bypass-admin',
    name: 'Admin (Dev Admin)',
    email: 'dev.admin@bitmesra.ac.in',
    role: 'admin',
    department: 'Administration',
    phone: '+91 90000 00002',
  },
  hod: {
    _id: 'dev-bypass-hod',
    name: 'Prof. Bypass (Dev HOD)',
    email: 'dev.hod@bitmesra.ac.in',
    role: 'hod',
    department: 'Computer Science & Engineering',
    phone: '+91 90000 00003',
  },
  parent: {
    _id: 'dev-bypass-parent',
    name: 'Guardian (Dev Parent)',
    email: 'dev.parent@example.com',
    role: 'parent',
    phone: '+91 90000 00004',
  },
};

const readState = () => {
  if (!DEV_BYPASS_ENABLED) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.role || !MOCK_USERS[parsed.role]) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const DevBypassProvider = ({ children }) => {
  const [state, setState] = useState(() => readState());

  const enable = useCallback((role = 'admin') => {
    if (!DEV_BYPASS_ENABLED) return;
    const next = { role, enabledAt: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setState(next);
  }, []);

  const disable = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setState(null);
  }, []);

  // Cross-tab sync.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setState(readState());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = {
    enabled: DEV_BYPASS_ENABLED,
    active: Boolean(state),
    role: state?.role || null,
    mockUser: state ? MOCK_USERS[state.role] : null,
    availableRoles: Object.keys(MOCK_USERS),
    enable,
    disable,
  };

  return <DevBypassContext.Provider value={value}>{children}</DevBypassContext.Provider>;
};

export const useDevBypass = () => {
  const ctx = useContext(DevBypassContext);
  if (!ctx) {
    // Safe default so consumers don't have to null-check.
    return {
      enabled: false,
      active: false,
      role: null,
      mockUser: null,
      availableRoles: [],
      enable: () => {},
      disable: () => {},
    };
  }
  return ctx;
};

export const MOCK_DEV_USERS = MOCK_USERS;
