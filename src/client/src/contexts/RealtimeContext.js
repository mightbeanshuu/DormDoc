import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

const RealtimeContext = createContext({ connected: false });

export const useRealtime = () => useContext(RealtimeContext);

// Translate INSERT/UPDATE postgres_changes events into the toast notifications
// previously delivered by socket.io. REPLICA IDENTITY FULL on these tables
// means payload.old is populated on UPDATE so we can detect field transitions
// (e.g. is_on_duty flipped) without retoasting on every unrelated change.
const wireChannel = (channel, user) => {
  const isAdmin = user.role === 'admin';
  const isHod = user.role === 'hod';
  const myId = user.id || user._id;

  channel.on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'appointments' },
    (payload) => {
      if (isAdmin) toast.info('New appointment booked');
      if (isAdmin && payload.new.is_emergency) {
        toast.error('🚨 Emergency appointment created');
      }
    }
  );

  channel.on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'appointments' },
    (payload) => {
      const next = payload.new || {};
      const prev = payload.old || {};
      if (next.status !== prev.status && next.student_id === myId) {
        toast.info(`Your appointment is now ${next.status}`);
      }
    }
  );

  channel.on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'ambulance_trips' },
    (payload) => {
      const t = payload.new || {};
      if (isAdmin) toast.info('Ambulance trip dispatched');
      if (isAdmin && t.priority === 'high') {
        toast.error('🚨 EMERGENCY: high-priority ambulance dispatch');
      }
      if (t.student_id === myId) toast.success('Ambulance is on the way!');
    }
  );

  channel.on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'ambulance_trips' },
    (payload) => {
      const next = payload.new || {};
      const prev = payload.old || {};
      if (next.status !== prev.status) {
        if (isAdmin) toast.info(`Ambulance trip status: ${next.status}`);
        if (next.student_id === myId && next.status === 'arrived') {
          toast.success('Ambulance has arrived!');
        }
      }
    }
  );

  channel.on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'leave_requests' },
    (payload) => {
      const lr = payload.new || {};
      if (isHod || isAdmin) toast.info('New leave request submitted');
      if (lr.student_id === myId) toast.success('Leave request submitted successfully');
    }
  );

  channel.on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'leave_requests' },
    (payload) => {
      const next = payload.new || {};
      const prev = payload.old || {};
      if (next.status !== prev.status && next.student_id === myId) {
        toast.info(`Your leave request was ${next.status}`);
      }
    }
  );

  channel.on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'dispensary_staff' },
    (payload) => {
      const next = payload.new || {};
      const prev = payload.old || {};
      // Only toast when the on-duty flag actually changed, not on every staff update.
      if (next.is_on_duty !== prev.is_on_duty) {
        toast.info(`A doctor ${next.is_on_duty ? 'started' : 'ended'} duty`);
      }
    }
  );
};

export const RealtimeProvider = ({ children }) => {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      setConnected(false);
      return undefined;
    }

    const channel = supabase.channel('dormdoc-realtime');
    wireChannel(channel, user);
    channel.subscribe((status) => {
      setConnected(status === 'SUBSCRIBED');
    });

    return () => {
      supabase.removeChannel(channel);
      setConnected(false);
    };
  }, [user]);

  return (
    <RealtimeContext.Provider value={{ connected }}>
      {children}
    </RealtimeContext.Provider>
  );
};

// Backwards-compatible alias so existing imports of useSocket / SocketProvider
// keep working until they're cleaned up. Socket-style emit/on/off APIs are
// no-ops now — server-driven realtime via Supabase publishes from the DB,
// clients consume only.
export const useSocket = () => {
  const { connected } = useRealtime();
  return {
    socket: null,
    connected,
    emit: () => {},
    on: () => {},
    off: () => {},
  };
};
export const SocketProvider = RealtimeProvider;
