import axios from 'axios'
import { getToken } from './auth'

const remoteApiUrl = 'https://backend-voting-system.up.railway.app'
const localApiUrl = 'http://localhost:8080'
const envApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim()
const defaultApiUrl =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? localApiUrl
    : remoteApiUrl

const baseURL = (envApiUrl && envApiUrl.length > 0 ? envApiUrl : defaultApiUrl).replace(/\/+$/g, '')

const api = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: false,
  headers: {
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config) => {
  if (!config) {
    return config
  }

  if (config.url && !config.url.endsWith('/') && !config.url.includes('?')) {
    if (!config.url.includes('/api/auth')) {
      config.url += '/'
    }
  }

  const token = typeof window !== 'undefined' ? getToken() : null
  if (token) {
    config.headers = {
      ...(config.headers as Record<string, unknown> | undefined),
      Authorization: `Bearer ${token}`,
    } as any
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
