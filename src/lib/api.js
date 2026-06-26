import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const data = error.response?.data;
    if (data?.fields) {
      const fieldMsgs = Object.entries(data.fields)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
        .join('; ');
      return Promise.reject(new Error(fieldMsgs || data.error || 'Validation failed'));
    }
    const message = data?.error || error.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;
