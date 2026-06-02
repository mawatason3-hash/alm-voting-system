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

export default function OtpVerifyPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [code, setCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [step, setStep] = useState<'ready' | 'success'>('ready')

  useEffect(() => {
    const fetchProfileAndStatus = async () => {
      try {
        const [profileRes, statusRes] = await Promise.all([
          api.get('/api/voter/profile'),
          api.get('/api/voter/verification-status'),
        ])

        setEmail(profileRes.data?.email || '')

        const verified = Boolean(
          statusRes.data?.otp_verified ||
          statusRes.data?.verified_by_admin ||
          statusRes.data?.can_access_ballot
        )

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
        }
      } catch (err) {
        console.error('OTP profile fetch error:', err)
      }
    }

    fetchProfileAndStatus()
  }, [router])

  const sendOtp = async () => {
    setError('')
    setInfo('')
    setSending(true)

    try {
      await api.post('/api/voter/send-otp')
      setOtpSent(true)
      setInfo('Code sent! Check your email.')
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
    if (!trimmedCode || trimmedCode.length !== 6 || /\D/.test(trimmedCode)) {
      setError('Please enter a valid 6-digit code.')
      return
    }

    setVerifying(true)
    try {
      const res = await api.post('/api/voter/verify-otp', { otp_code: trimmedCode })
      sessionStorage.setItem('otp_verified', 'true')
      setInfo(res.data?.message || 'Verification successful! Redirecting to the ballot...')
      setStep('success')
      setTimeout(() => router.push('/vote'), 2000)
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Invalid code. Please try again.'
      setError(String(message))
      if (String(message).toLowerCase().includes('expired')) {
        setOtpSent(false)
      }
    } finally {
      setVerifying(false)
    }
  }

  const renderReadyScreen = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">Verify Your Email</h1>
        <p className="mt-4 text-slate-300">
          Your registered email is shown below. Send a one-time code, then enter it to continue to voting.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-700 bg-[#0b172a] p-6 space-y-4 text-sm text-slate-300">
        <div>
          <p className="font-semibold text-white">Registered email</p>
          <p className="mt-2 text-slate-200 break-all">{maskEmail(email) || 'Email not available'}</p>
        </div>
        <div>
          <p className="font-semibold text-white">How it works</p>
          <ul className="mt-2 space-y-2 list-inside text-slate-300">
            <li>✓ Send a 6-digit verification code to your email</li>
            <li>✓ Enter the code below exactly as shown</li>
            <li>✓ The code expires after 10 minutes</li>
            <li>✓ If you don't receive it, contact admin for help</li>
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
        {!otpSent ? (
          <button
            onClick={sendOtp}
            disabled={sending}
            className="w-full rounded-2xl bg-amber-400 px-5 py-4 text-base font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? 'Sending OTP…' : 'Send OTP to my email'}
          </button>
        ) : (
          <div className="space-y-3">
            <label htmlFor="otp-code" className="block text-sm font-medium text-slate-200">Verification code</label>
            <input
              id="otp-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="123456"
              maxLength={6}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
            />
            <button
              onClick={verifyOtp}
              disabled={verifying}
              className="w-full rounded-2xl bg-sky-500 px-5 py-4 text-base font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {verifying ? 'Verifying…' : 'Verify Code'}
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
            If your code doesn't arrive, contact admin for assistance.
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
      <p className="mt-4 text-sm text-slate-100">Thanks. Redirecting you to the ballot now.</p>
    </div>
  )
  
  return (
    <ProtectedPage>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-[#071421] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-8">
          {step === 'ready' && renderReadyScreen()}
          {step === 'success' && renderSuccessScreen()}
        </div>
      </div>
    </ProtectedPage>
  )
}
