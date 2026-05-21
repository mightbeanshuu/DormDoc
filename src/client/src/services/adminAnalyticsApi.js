import axios from 'axios';

const BASE = '/api/admin/analytics';

export const fetchGrowth = (fresh) =>
  axios.get(`${BASE}/growth`, { params: fresh ? { fresh: 'true' } : {} }).then((r) => r.data);

export const fetchLeave = (fresh) =>
  axios.get(`${BASE}/leave`, { params: fresh ? { fresh: 'true' } : {} }).then((r) => r.data);

export const fetchAppointments = (fresh) =>
  axios.get(`${BASE}/appointments`, { params: fresh ? { fresh: 'true' } : {} }).then((r) => r.data);

export const fetchSos = (fresh) =>
  axios.get(`${BASE}/sos`, { params: fresh ? { fresh: 'true' } : {} }).then((r) => r.data);

export const downloadCsv = (dataset) =>
  axios.get(`${BASE}/export/${dataset}`, { responseType: 'blob' }).then((r) => {
    const url = window.URL.createObjectURL(new Blob([r.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${dataset}-analytics.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  });
