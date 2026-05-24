'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '../../../lib/api'
import { getUser, saveAuth } from '../../../lib/auth'
import { notify } from '../../../lib/notifications'

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const user = getUser()
    if (user?.role === 'admin') {
      router.replace('/admin/dashboard')
    }
  }, [router])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/api/auth/login', { email, password })
      const data = response.data

      if (data.user?.role !== 'admin') {
        const message = 'Admin credentials required.'
        setError(message)
        notify.error(message)
        return
      }

      saveAuth(data.access_token, data.user)
      router.replace('/admin/dashboard')
    } catch (err: any) {
      let message = 'Login failed. Please check your credentials.'
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
    <div className="min-h-screen bg-gradient-to-br from-navy via-slate-950 to-slate-900 px-4 py-10 text-slate-100">
      <div className="mx-auto w-full max-w-lg rounded-[2rem] border border-white/10 bg-white/95 p-8 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.75)]">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Administrator Portal</p>
          <h1 className="mt-4 text-3xl font-semibold text-navy">Admin Login</h1>
          <p className="mt-2 text-sm text-slate-600">
            Securely sign in to manage voters, teams, candidates, and election results.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          {error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : null}

          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              className="mt-3 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              className="mt-3 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-gold px-5 py-3 text-sm font-semibold text-navy transition hover:bg-[#b79431] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
