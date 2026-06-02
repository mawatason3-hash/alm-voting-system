'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedPage from '../components/ProtectedPage'
import api from '../../lib/api'

const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) return email
  const [user, domain] = email.split('@')
  if (user.length <= 4) return email
  const masked = user.slice(0, 2) + '*'.repeat(Math.max(0, user.length - 4)) + user.slice(-2)
  return `${masked}@${domain}`
}

interface AdminContact {
  admin_phone: string
  admin_whatsapp: string
  admin_hours: string
}

export default function VerifyFace() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [code, setCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [email, setEmail] = useState('')
  const [voterName, setVoterName] = useState('')
  const [step, setStep] = useState<'ready' | 'success' | 'no-photo'>('ready')
  const [adminContact, setAdminContact] = useState<AdminContact>({ admin_phone: '', admin_whatsapp: '', admin_hours: '' })

  useEffect(() => {
    const fetchProfileAndStatus = async () => {
      try {
        const [profileRes, statusRes] = await Promise.all([
          api.get('/api/voter/profile'),
          api.get('/api/voter/verification-status'),
        ])

        if (!profileRes.data?.photo_url) {
          setStep('no-photo')
        }

        setVoterName(profileRes.data?.full_name || '')
        setEmail(profileRes.data?.email || '')

        const verified = Boolean(statusRes.data?.otp_verified || statusRes.data?.verified_by_admin || statusRes.data?.can_access_ballot)
        if (verified) {
          if (statusRes.data?.otp_verified) {
            sessionStorage.setItem('otp_verified', 'true')
          }
          if (statusRes.data?.verified_by_admin) {
            sessionStorage.setItem('admin_approved', 'true')
          }
          if (statusRes.data?.can_access_ballot) {
            sessionStorage.setItem('can_access_ballot', 'true')
          }
          router.push('/vote')
          return
        }
      } catch (err) {
        console.error('Profile fetch error:', err)
      }
    }

    const fetchAdminContact = async () => {
      try {
        const res = await api.get('/api/settings/admin-contact')
        setAdminContact(res.data)
      } catch (err) {
        console.warn('Admin contact fetch failed:', err)
      }
    }

    fetchProfileAndStatus()
    fetchAdminContact()
  }, [router])

  const sendOtp = async () => {
    setError('')
    setInfo('')
    setSending(true)

    try {
      const res = await api.post('/api/voter/send-otp')
      setOtpSent(true)
      setInfo(res.data?.message || 'OTP sent to your registered email address. Enter it below.')
      setCode('')
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Unable to send OTP. Please try again.'
      setError(String(message))
    } finally {
      setSending(false)
    }
  }

  const verifyOtp = async () => {
    setError('')
    setInfo('')

    const trimmedCode = code.trim()
    if (!trimmedCode) {
      setError('Please enter the OTP code.')
      return
    }

    setVerifying(true)
    try {
      const res = await api.post('/api/voter/verify-otp', { otp_code: trimmedCode })
      sessionStorage.setItem('otp_verified', 'true')
      setInfo(res.data?.message || 'Email verified. Redirecting to the ballot...')
      setStep('success')
      setTimeout(() => router.push('/vote'), 1500)
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Invalid OTP. Please try again.'
      setError(String(message))
    } finally {
      setVerifying(false)
    }
  }

  const renderReadyScreen = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">Verify Your Email</h1>
        <p className="mt-4 text-slate-300">
          We will send a one-time code to your registered email address. Enter the code here to unlock ballot access.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-700 bg-[#0b172a] p-6 space-y-4 text-sm text-slate-300">
        <div>
          <p className="font-semibold text-white">Registered email</p>
          <p className="mt-2 text-slate-200 break-all">{email || 'Email not available'}</p>
        </div>
        <div>
          <p className="font-semibold text-white">What to expect</p>
          <ul className="mt-2 space-y-2 list-inside text-slate-300">
            <li>✓ You will receive a 6-digit OTP code by email</li>
            <li>✓ Enter the code exactly as shown</li>
            <li>✓ The code is valid for 10 minutes</li>
            <li>✓ If you cannot access this email, contact an admin for help</li>
          </ul>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {info && (
        <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {info}
        </div>
      )}

      <div className="grid gap-4">
        <button
          onClick={sendOtp}
          disabled={sending}
          className="w-full rounded-2xl bg-amber-400 px-5 py-4 text-base font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? 'Sending OTP…' : otpSent ? 'Resend OTP' : 'Send OTP'}
        </button>

        {otpSent && (
          <div className="space-y-3">
            <label htmlFor="otp-code" className="block text-sm font-medium text-slate-200">Enter OTP code</label>
            <input
              id="otp-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
            />
            <button
              onClick={verifyOtp}
              disabled={verifying}
              className="w-full rounded-2xl bg-sky-500 px-5 py-4 text-base font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {verifying ? 'Verifying…' : 'Verify OTP'}
            </button>
          </div>
        )}
      </div>

      <div
        onClick={() => router.push('/verify-face/contact-admin')}
        style={{
          marginTop: '16px',
          background: 'rgba(196,168,78,0.06)',
          border: '1px solid rgba(196,168,78,0.25)',
          borderRadius: '12px',
          padding: '16px 20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div>
          <div style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#c4a84e',
            marginBottom: '4px'
          }}>
            🆘 Need help with verification?
          </div>
          <div style={{
            fontSize: '12px',
            color: '#6060a0',
            lineHeight: '1.5'
          }}>
            Did not receive your OTP? Tap here to request admin access to the ballot directly. Admin can approve you without OTP.
          </div>
        </div>
        <div style={{
          color: '#c4a84e',
          fontSize: '20px',
          marginLeft: '12px',
          flexShrink: 0
        }}>
          →
        </div>
      </div>
    </div>
  )

  const renderSuccessScreen = () => (
    <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center text-white shadow-xl">
      <div className="mb-5 text-5xl">✅</div>
      <h2 className="text-2xl font-semibold">Email Verified</h2>
      <p className="mt-4 text-sm text-slate-100">Thanks, {voterName}. You are being redirected to the ballot.</p>
    </div>
  )

  const renderNoPhotoScreen = () => (
    <div className="rounded-3xl border border-slate-700 bg-[#071421] p-6 text-center text-slate-200 shadow-xl space-y-6">
      <div className="text-4xl">📷</div>
      <div>
        <h2 className="text-2xl font-semibold text-white">Profile photo missing</h2>
        <p className="mt-3 text-sm text-slate-400">
          Your account does not have a profile photo on file. Please contact an admin so your registration can be updated.
        </p>
      </div>
      {adminContact.admin_phone ? (
        <a href={`tel:${adminContact.admin_phone}`} className="block rounded-2xl bg-amber-400 px-5 py-4 text-base font-semibold text-slate-950 transition hover:bg-amber-300">
          Call Admin: {adminContact.admin_phone}
        </a>
      ) : null}
      {adminContact.admin_whatsapp ? (
        <a
          href={`https://wa.me/${adminContact.admin_whatsapp.replace(/[^0-9]/g, '')}`}
          className="block rounded-2xl bg-slate-900 px-5 py-4 text-base font-semibold text-white transition hover:border-slate-500"
          target="_blank"
          rel="noreferrer"
        >
          Message Admin on WhatsApp
        </a>
      ) : null}
    </div>
  )

  return (
    <ProtectedPage>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-[#071421] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-8">
          {step === 'ready' && renderReadyScreen()}
          {step === 'success' && renderSuccessScreen()}
          {step === 'no-photo' && renderNoPhotoScreen()}
        </div>
      </div>
    </ProtectedPage>
  )
}
