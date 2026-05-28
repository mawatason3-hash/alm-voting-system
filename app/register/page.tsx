'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '../../lib/api'
import { notify } from '../../lib/notifications'

export default function Register() {
  const router = useRouter()
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', confirm: '' })
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  React.useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview)
      }
    }
  }, [photoPreview])

  const onChange = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setError('Photo must be under 5MB')
      setPhoto(null)
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview)
        setPhotoPreview(null)
      }
      return
    }

    setError('')
    setPhoto(file)
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview)
    }
    setPhotoPreview(URL.createObjectURL(file))
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!photo) {
      setError('Please upload your photo to complete registration')
      return
    }

    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('full_name', form.full_name)
      formData.append('email', form.email)
      formData.append('phone', form.phone)
      formData.append('password', form.password)
      formData.append('photo', photo)

      const response = await api.post('/api/auth/register', formData)
      const message = response?.data?.message || 'Registration submitted! Admin will review and approve your account.'

      setSuccess(message)
      setRegistrationSubmitted(true)
      notify.success(message)
      setForm({ full_name: '', email: '', phone: '', password: '', confirm: '' })
      setPhoto(null)
      setPhotoPreview(null)
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

          <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/80 p-4">
            <div className="flex flex-col items-center gap-3 text-center">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Profile preview"
                  className="h-24 w-24 rounded-full border border-slate-700 object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-slate-700 bg-slate-900 text-slate-500">
                  <span className="text-sm">Photo preview</span>
                </div>
              )}
              <div>
                <label htmlFor="photo" className="block text-sm font-medium text-slate-200">Profile Photo</label>
                <p className="mt-1 text-xs text-slate-400">Upload a clear photo of your face so the admin can verify your identity.</p>
              </div>
            </div>
            <input
              id="photo"
              name="photo"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

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

        {registrationSubmitted && (
          <div className="mt-6 rounded-3xl border border-slate-700 bg-slate-900/80 p-6">
            <h2 className="text-xl font-semibold text-white">Registration submitted</h2>
            <p className="mt-3 text-sm text-slate-300">
              Your registration is complete. An administrator will review and approve your account before you can vote.
            </p>
            <p className="mt-4 text-sm text-slate-400">
              After approval, you can enroll your face descriptor from your member dashboard so you can verify your identity during election day.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                Go to dashboard
              </button>
              <button
                type="button"
                onClick={() => setRegistrationSubmitted(false)}
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20"
              >
                Continue browsing
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
