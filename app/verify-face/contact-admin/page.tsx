'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedPage from '../../components/ProtectedPage'
import api from '../../../lib/api'
import { notify } from '../../../lib/notifications'
import { getUser } from '../../../lib/auth'

export default function ContactAdmin() {
  const router = useRouter()
  const user = getUser()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [adminContact, setAdminContact] = useState({ admin_phone: '', admin_whatsapp: '', admin_hours: '' })
  const [requestStatus, setRequestStatus] = useState<string | null>(null)
  const [denialReason, setDenialReason] = useState<string | null>(null)

  const statusLabel = useMemo(() => {
    if (!requestStatus) return 'No request submitted yet.'
    if (requestStatus === 'approved') return 'Access granted by admin! Redirecting...'
    if (requestStatus === 'denied') return 'Request denied by admin.'
    return 'Pending admin review.'
  }, [requestStatus])

  useEffect(() => {
    const fetchContact = async () => {
      try {
        const res = await api.get('/api/settings/admin-contact')
        setAdminContact(res.data)
      } catch (err) {
        console.warn('Unable to load admin contact info', err)
      }
    }

    const fetchRequestStatus = async () => {
      try {
        const res = await api.get('/api/access-requests/my-status')
        const status = res.data.status
        setRequestStatus(status)
        setDenialReason(res.data.denial_reason || null)
        if (status === 'approved') {
          sessionStorage.setItem('admin_approved', 'true')
        }
      } catch (err: any) {
        if (err?.response?.status !== 404) {
          console.warn('Failed to load access request status', err)
        }
      }
    }

    fetchContact()
    fetchRequestStatus()
    const interval = window.setInterval(fetchRequestStatus, 10000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (requestStatus === 'approved') {
      const timeout = window.setTimeout(() => router.push('/vote'), 2000)
      return () => window.clearTimeout(timeout)
    }
    return undefined
  }, [requestStatus, router])

  const sendRequest = async () => {
    setError('')
    setSuccess('')
    if (!message.trim()) {
      setError('Please describe the issue so the administrator can help.')
      return
    }

    setLoading(true)
    try {
      await api.post('/api/access-requests', {
        message: message.trim(),
        voter_name: user?.full_name || user?.name || '',
        voter_email: user?.email || '',
      })
      setSuccess('Your request has been sent. Admin will respond shortly.')
      setMessage('')
      notify.success('Access request sent')
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data || err?.message || 'Unable to submit request.'
      setError(String(msg))
      notify.error(String(msg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedPage>
      <div className="min-h-[calc(100vh-10rem)] bg-slate-950 px-4 py-10 text-slate-100 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold text-white">Need admin access?</h1>
            <p className="mt-2 text-slate-400">Face verification failed or is unavailable. Send an access request to the administrator.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.95fr_0.95fr]">
            <div className="rounded-3xl border border-white/10 bg-slate-900/90 p-8 shadow-xl">
              <div className="space-y-6">
                <div className="rounded-2xl bg-amber-500/10 px-6 py-4">
                  <p className="font-semibold text-white">Fallback access request</p>
                  <p className="mt-2 text-sm text-slate-200">
                    If face recognition fails, submit this request so the administrator can grant you ballot access.
                  </p>
                </div>

                <div className="space-y-3">
                  <label htmlFor="request-name" className="block text-sm font-medium text-slate-200">Your name</label>
                  <input
                    id="request-name"
                    readOnly
                    value={user?.full_name || user?.name || ''}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-200 outline-none"
                  />
                </div>

                <div className="space-y-3">
                  <label htmlFor="request-email" className="block text-sm font-medium text-slate-200">Your email</label>
                  <input
                    id="request-email"
                    readOnly
                    value={user?.email || ''}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-200 outline-none"
                  />
                </div>

                <div className="space-y-3">
                  <label htmlFor="request-message" className="block text-sm font-medium text-slate-200">Explain your situation</label>
                  <textarea
                    id="request-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    className="w-full rounded-3xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-200 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                    placeholder="I could not complete face verification and need help accessing the ballot..."
                  />
                </div>

                {error && (
                  <div className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
                )}
                {success && (
                  <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{success}</div>
                )}

                <button
                  onClick={sendRequest}
                  disabled={loading}
                  className="w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Sending request...' : 'Send Request to Admin'}
                </button>

                {requestStatus && (
                  <div className="rounded-3xl border border-white/10 bg-slate-950 px-4 py-4 text-sm text-slate-200">
                    <p className="font-semibold text-white">Request status</p>
                    <p className="mt-2 text-slate-300">{statusLabel}</p>
                    {denialReason ? <p className="mt-2 text-sm text-amber-200">Reason: {denialReason}</p> : null}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/90 p-8 shadow-xl">
              <div className="space-y-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Contact admin</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Call or message directly</h2>
                </div>

                <div className="space-y-4 rounded-3xl bg-slate-950/80 p-6">
                  <div className="space-y-2">
                    <p className="text-sm text-slate-400">Phone</p>
                    <a href={`tel:${adminContact.admin_phone}`} className="text-lg font-semibold text-white hover:text-gold">
                      {adminContact.admin_phone || 'Not available'}
                    </a>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-slate-400">WhatsApp</p>
                    <a
                      href={`https://wa.me/${adminContact.admin_whatsapp?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `Hi, I need help accessing the voting ballot. My name is ${user?.full_name || user?.name || ''}`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-lg font-semibold text-white hover:text-gold"
                    >
                      {adminContact.admin_whatsapp || 'Not available'}
                    </a>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Available hours</p>
                    <p className="text-base font-semibold text-white">{adminContact.admin_hours || 'Not configured'}</p>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 text-sm text-slate-400">
                  <p>Admin approval is the fallback option if face verification fails or cannot be completed during election day.</p>
                  <p className="mt-3">Your request status is checked every 10 seconds and you will be redirected automatically if access is granted.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="rounded-2xl border border-white/10 bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </ProtectedPage>
  )
}
