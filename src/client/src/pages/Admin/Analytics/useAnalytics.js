import { useQuery } from 'react-query';
import { fetchGrowth, fetchLeave, fetchAppointments, fetchSos } from '../../../services/adminAnalyticsApi';

export function useGrowth(fresh = false) {
  return useQuery(['adminAnalytics', 'growth', fresh], () => fetchGrowth(fresh), {
    staleTime: 10 * 60 * 1000, // match backend TTL
  });
}

export function useLeave(fresh = false) {
  return useQuery(['adminAnalytics', 'leave', fresh], () => fetchLeave(fresh), {
    staleTime: 10 * 60 * 1000,
  });
}

export function useAppointments(fresh = false) {
  return useQuery(['adminAnalytics', 'appointments', fresh], () => fetchAppointments(fresh), {
    staleTime: 10 * 60 * 1000,
  });
}

export function useSos(fresh = false) {
  return useQuery(['adminAnalytics', 'sos', fresh], () => fetchSos(fresh), {
    staleTime: 10 * 60 * 1000,
  });
}
