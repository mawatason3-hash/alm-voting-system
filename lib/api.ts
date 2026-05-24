import axios, { AxiosRequestConfig } from 'axios';

const defaultApiUrl = 'https://alm-backend-production.up.railway.app';
const envApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const rawApiUrl = envApiUrl && envApiUrl.length > 0 ? envApiUrl : defaultApiUrl;

function normalizeBaseUrl(url: string) {
  let normalized = String(url).trim();
  if (!normalized) {
    return '';
  }

  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  normalized = normalized.replace(/([^:]\/)\/+/g, '$1');
  normalized = normalized.replace(/\/+$|\\?$/g, '');
  return normalized;
}

function normalizeRequestUrl(url: string) {
  let normalized = String(url).trim();
  if (!normalized) {
    return normalized;
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(normalized)) {
    return normalized.replace(/([^:]\/)\/+/g, '$1');
  }

  const hostLike = /^([a-z0-9.-]+\.[a-z]{2,})(\/.*)?$/i;
  if (hostLike.test(normalized) && !normalized.startsWith('/')) {
    return normalizeBaseUrl(normalized);
  }

  normalized = normalized.replace(/\\+/g, '/');
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  return normalized;
}

const baseURL = normalizeBaseUrl(rawApiUrl);

export const api = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: false,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (config.url && typeof config.url === 'string') {
    config.url = normalizeRequestUrl(config.url);
  }

  if (!config.headers) {
    config.headers = {} as any;
  }

  const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
  config.headers = {
    ...(config.headers as Record<string, string> | undefined),
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    Accept: 'application/json',
  } as any;

  config.withCredentials = false;
  return config;
}, (error) => Promise.reject(error));

export default api;
