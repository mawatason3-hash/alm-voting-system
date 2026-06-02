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
  timeout: 60000,
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

// Simple retry for GET requests that time out or fail due to network blips.
api.interceptors.response.use(undefined, async (error) => {
  const config = error?.config as any
  if (!config) return Promise.reject(error)

  const isTimeout = error?.code === 'ECONNABORTED' || (error?.message || '').toLowerCase().includes('timeout')
  const isGet = config.method && config.method.toLowerCase() === 'get'

  if (isGet && isTimeout) {
    config.__retryCount = config.__retryCount || 0
    if (config.__retryCount < 1) {
      config.__retryCount += 1
      try {
        return api.request(config)
      } catch (e) {
        return Promise.reject(e)
      }
    }
  }

  return Promise.reject(error)
})
