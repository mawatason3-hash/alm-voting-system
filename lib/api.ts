import axios from 'axios'
import { getToken } from './auth'

const defaultApiUrl = 'https://alm-backend-production.up.railway.app'
const envApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim()
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

  return config
}, (error) => Promise.reject(error))

export default api
