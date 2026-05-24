import axios from 'axios';

export const api = axios.create({
  baseURL: 'https://alm-backend.up.railway.app',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  // Enforce required trailing slash configuration cleanly
  if (config.url && !config.url.endsWith('/') && !config.url.includes('?')) {
    config.url += '/';
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('alm_token') : null;
  if (token) {
    config.headers = config.headers || {};
    (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
  config.headers = {
    ...(config.headers as Record<string, string> | undefined),
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    Accept: 'application/json',
  } as any;

  // Do not use browser cookies for auth across Vercel <-> Railway
  config.withCredentials = false;

  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
