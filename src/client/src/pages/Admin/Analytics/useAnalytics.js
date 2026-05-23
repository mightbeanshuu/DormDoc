import { useState, useEffect, useCallback } from 'react';
import {
  fetchGrowth,
  fetchLeave,
  fetchAppointments,
  fetchSos,
} from '../../../services/adminAnalyticsApi';

export default function useAnalytics() {
  const [growth, setGrowth] = useState(null);
  const [leave, setLeave] = useState(null);
  const [appointments, setAppointments] = useState(null);
  const [sos, setSos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [g, l, a, s] = await Promise.all([
        fetchGrowth(),
        fetchLeave(),
        fetchAppointments(),
        fetchSos(),
      ]);
      setGrowth(g.data);
      setLeave(l.data);
      setAppointments(a.data);
      setSos(s.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { growth, leave, appointments, sos, loading, error, refresh: load };
}
