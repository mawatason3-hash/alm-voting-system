'use client'
import React, { useState } from 'react'
import api from '../../lib/api'
import { saveAuth } from '../../lib/auth'
import { notify } from '../../lib/notifications'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await api.post('/api/auth/login', { email, password })
      const data = res.data
      saveAuth(data.access_token, data.user)
      if (data.user.role === 'admin') window.location.href = '/admin/dashboard'
      else window.location.href = '/dashboard'
    } catch (err: any) {
      let message = 'Login failed.'
      const responseData = err?.response?.data
      if (responseData?.detail) message = responseData.detail
      else if (responseData?.message) message = responseData.message
      else if (typeof responseData === 'string') {
        message = responseData.startsWith('<') ? 'API endpoint not found or returned HTML.' : responseData
      } else if (err?.message) {
        message = err.message
      }
      setError(message)
      notify.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6 flex items-center gap-3 rounded-3xl bg-slate-950/80 p-4 shadow-lg shadow-slate-950/20">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 p-2">
          <img src="/logo.jpg" alt="ALM Logo" className="h-full w-full object-contain" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Member Login</h2>
          <p className="text-sm text-slate-400">Sign in to cast your vote.</p>
        </div>
      </div>
      <form onSubmit={submit} className="space-y-4 bg-white p-6 rounded shadow">
        {error && <div className="text-red-600">{String(error)}</div>}
        <input required type="email" className="w-full border p-2 rounded" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input required type="password" className="w-full border p-2 rounded" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        <div className="flex items-center justify-between">
          <button type="submit" className="px-4 py-2 bg-navy text-white rounded" disabled={loading}>{loading ? '...' : 'Login'}</button>
          <a className="text-sm text-navy" href="/forgot-password">Forgot?</a>
        </div>
      </form>
    </div>
  )
}
