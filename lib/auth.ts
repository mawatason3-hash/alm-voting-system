export const saveAuth = (token: string, user: any) => {
  const normalizedUser = {
    ...user,
    full_name: user?.full_name || user?.name || null,
  }
  localStorage.setItem('alm_token', token)
  localStorage.setItem('alm_user', JSON.stringify(normalizedUser))
}

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('alm_token')
}

export const getUser = () => {
  if (typeof window === 'undefined') return null
  const u = localStorage.getItem('alm_user')
  if (!u) return null
  const parsed = JSON.parse(u)
  return {
    ...parsed,
    full_name: parsed?.full_name || parsed?.name || null,
  }
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
