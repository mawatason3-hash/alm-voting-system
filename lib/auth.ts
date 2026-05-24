export const saveAuth = (token: string, user: object) => {
  localStorage.setItem('alm_token', token)
  localStorage.setItem('alm_user', JSON.stringify(user))
}

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('alm_token')
}

export const getUser = () => {
  if (typeof window === 'undefined') return null
  const u = localStorage.getItem('alm_user')
  return u ? JSON.parse(u) : null
}

export const logout = () => {
  localStorage.removeItem('alm_token')
  localStorage.removeItem('alm_user')
  window.location.href = '/login'
}

export const isAdmin = (): boolean => {
  const user = getUser()
  return user?.role === 'admin'
}

export const isAuthenticated = (): boolean => {
  return !!getToken()
}
