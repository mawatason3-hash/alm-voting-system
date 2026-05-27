import axios, { type InternalAxiosRequestConfig } from 'axios'
import { getToken } from './auth'

const remoteApiUrl = 'https://backend-voting-system.up.railway.app'
const localApiUrl = 'http://localhost:8080'
const rawEnvApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || ''
const isLocalBrowser = typeof window !== 'undefined' && window.location.hostname === 'localhost'

const normalizeApiUrl = (url: string) => {
  if (!url) return url
  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'localhost' || parsed.hostname.endsWith('.localhost')) {
      return url
    }
    if (parsed.protocol === 'http:') {
      parsed.protocol = 'https:'
    }
    return parsed.toString().replace(/\/\/+$/g, '')
  } catch {
    return url
  }
}

const envApiUrl = rawEnvApiUrl && !(rawEnvApiUrl.startsWith('http://localhost') && !isLocalBrowser) ? normalizeApiUrl(rawEnvApiUrl) : ''
const defaultApiUrl = isLocalBrowser ? localApiUrl : remoteApiUrl

const baseURL = ((envApiUrl && envApiUrl.length > 0 ? envApiUrl : defaultApiUrl) || remoteApiUrl).replace(/\/\/+$/g, '')

const api = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: false,
  headers: {
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (!config) {
    return config
  }

  const isAuthEndpoint = typeof config.url === 'string' && config.url.includes('/api/auth')
  if (config.url && !config.url.endsWith('/') && !config.url.includes('?') && !isAuthEndpoint) {
    config.url += '/'
  }

  const token = typeof window !== 'undefined' ? getToken() : null
  if (token) {
    config.headers = {
      ...(config.headers as Record<string, unknown> | undefined),
      Authorization: `Bearer ${token}`,
    } as any
  }

  if (config.baseURL && typeof config.baseURL === 'string') {
    config.baseURL = normalizeApiUrl(config.baseURL)
  }

  if (typeof config.url === 'string') {
    try {
      const resolved = new URL(config.url, config.baseURL || baseURL)
      if (!resolved.hostname.endsWith('.localhost') && resolved.protocol === 'http:') {
        resolved.protocol = 'https:'
        config.url = resolved.toString()
      }
    } catch {
      // preserve the original URL if parsing fails
    }
  }

  const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData
  if (isFormData) {
    const headers = { ...(config.headers as Record<string, unknown> | undefined) } as Record<string, unknown>
    delete headers['Content-Type']
    delete headers['content-type']
    config.headers = headers as any
  } else {
    config.headers = {
      ...(config.headers as Record<string, unknown> | undefined),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    } as any
  }

  config.withCredentials = false

  return config
}, (error) => Promise.reject(error))

export default api
