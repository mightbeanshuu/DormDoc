import axios from 'axios';

const BASE = '/api/admin/analytics';

export const fetchGrowth = () =>
  axios.get(`${BASE}/growth`).then((r) => r.data);

export const fetchLeave = () =>
  axios.get(`${BASE}/leave`).then((r) => r.data);

export const fetchAppointments = () =>
  axios.get(`${BASE}/appointments`).then((r) => r.data);

export const fetchSos = () =>
  axios.get(`${BASE}/sos`).then((r) => r.data);

export const exportCsv = async (dataset) => {
  const response = await axios.get(`${BASE}/export/${dataset}`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${dataset}-analytics.csv`);
  link.click();
  URL.revokeObjectURL(url);
};
