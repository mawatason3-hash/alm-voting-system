import axios from 'axios'
import { getToken } from './auth'

const defaultApiUrl = 'https://alm-backend-production.up.railway.app'
const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || defaultApiUrl
const baseURL = apiUrl.replace(/\/+$/g, '')

const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
  },
})

const stripTrailingSlash = (value: string) => value.replace(/\/+$/g, '')

export const getApiBaseUrl = (): string => baseURL

export const resolveImageUrl = (rawImgPath?: string | null): string | undefined => {
  if (!rawImgPath) return undefined

  const trimmedPath = String(rawImgPath).trim()
  if (!trimmedPath) return undefined

  if (/^https?:\/\//i.test(trimmedPath)) {
    return trimmedPath
  }

  const path = trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`
  return `${stripTrailingSlash(baseURL)}${path}`
}

api.interceptors.request.use(
  (config) => {
    if (!config.headers) {
      config.headers = {} as any
    }

    if (typeof window !== 'undefined') {
      const token = getToken()
      if (token) {
        if (typeof (config.headers as any).set === 'function') {
          ;(config.headers as any).set('Authorization', `Bearer ${token}`)
        } else {
          ;(config.headers as any).Authorization = `Bearer ${token}`
        }
      }
    }

    const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData
    if (isFormData) {
      if (typeof (config.headers as any).delete === 'function') {
        ;(config.headers as any).delete('Content-Type')
        ;(config.headers as any).delete('content-type')
      } else {
        delete (config.headers as any)['Content-Type']
        delete (config.headers as any)['content-type']
      }
    } else {
      if (typeof (config.headers as any).set === 'function') {
        ;(config.headers as any).set('Content-Type', 'application/json')
        ;(config.headers as any).set('Accept', 'application/json')
      } else {
        ;(config.headers as any)['Content-Type'] = 'application/json'
        ;(config.headers as any).Accept = 'application/json'
      }
    }

    return config
  },
  (error) => Promise.reject(error),
)

export default api
