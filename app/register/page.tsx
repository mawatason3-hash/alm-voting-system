'use client'
import React, { useState } from 'react'
import api from '../../lib/api'
import { notify } from '../../lib/notifications'

export default function Register() {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', member_id: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const onChange = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/api/auth/register', {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        member_id: form.member_id,
        password: form.password,
      })

      const message = response?.data?.message || 'Registration submitted. Await admin approval.'
      setSuccess(message)
      notify.success(message)
      setForm({ full_name: '', email: '', phone: '', member_id: '', password: '', confirm: '' })
    } catch (err: any) {
      let message = 'Registration failed.'
      const responseData = err?.response?.data
      if (responseData?.detail) message = responseData.detail
      else if (responseData?.message) message = responseData.message
      else if (typeof responseData === 'string') {
        message = responseData.startsWith('<') ? 'API endpoint not found or returned HTML.' : responseData
      } else if (err?.message) {
        message = err.message
      }
      setError(String(message))
      notify.error(String(message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-10rem)] bg-slate-950 px-4 py-10 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-slate-900/90 p-8 shadow-xl shadow-slate-950/40">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-800 p-3 shadow-inner shadow-slate-950/20">
            <img src="/logo.jpg" alt="ALM Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-sky-300">ALM Voting System</p>
            <h1 className="text-2xl font-semibold text-white">Register for voting</h1>
            <p className="text-sm text-slate-400">Join the Association of Liberians in Musanze voting platform.</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-5">
          {error && <div className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
          {success && <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{success}</div>}

          <label htmlFor="full_name" className="block text-sm font-medium text-slate-200">
            Full Name
          </label>
          <input
            id="full_name"
            name="full_name"
            value={form.full_name}
            onChange={e => onChange('full_name', e.target.value)}
            required
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
            placeholder="Enter your full name"
          />

          <label htmlFor="email" className="block text-sm font-medium text-slate-200">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={e => onChange('email', e.target.value)}
            required
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
            placeholder="name@example.com"
          />

          <label htmlFor="phone" className="block text-sm font-medium text-slate-200">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            value={form.phone}
            onChange={e => onChange('phone', e.target.value)}
            required
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
            placeholder="Phone number"
          />

          <label htmlFor="member_id" className="block text-sm font-medium text-slate-200">
            Member ID
          </label>
          <input
            id="member_id"
            name="member_id"
            value={form.member_id}
            onChange={e => onChange('member_id', e.target.value)}
            required
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
            placeholder="Your member ID"
          />

          <label htmlFor="password" className="block text-sm font-medium text-slate-200">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={e => onChange('password', e.target.value)}
            required
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
            placeholder="Create a secure password"
          />

          <label htmlFor="confirm" className="block text-sm font-medium text-slate-200">
            Confirm Password
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            value={form.confirm}
            onChange={e => onChange('confirm', e.target.value)}
            required
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
            placeholder="Repeat your password"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  )
}
