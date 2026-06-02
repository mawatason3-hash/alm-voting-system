'use client'

import React, { useEffect, useState } from 'react'
import api from '../../../lib/api'
import AdminProtectedPage from '../../components/AdminProtectedPage'
import { notify } from '../../../lib/notifications'

interface SupportRequest {
  id: string
  user_id: string
  user_full_name?: string
  user_email?: string
  subject: string
  message: string
  status: string
  created_at: string
  updated_at: string
}

export default function AdminRequests() {
  const [requests, setRequests] = useState<SupportRequest[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/support/requests')
      setRequests(Array.isArray(data) ? data : [])
    } catch (err: any) {
      notify.error(err?.response?.data?.detail || err?.response?.data || 'Unable to load support requests')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const resolveStatusClass = (status: string) => {
    if (status === 'resolved') return 'bg-emerald-100 text-emerald-900'
    if (status === 'closed') return 'bg-slate-100 text-slate-900'
    return 'bg-amber-100 text-amber-900'
  }

  const markResolved = async (id: string) => {
    try {
      await api.patch(`/api/support/requests/${id}?status=resolved`)
      notify.success('Request marked resolved')
      fetchRequests()
    } catch (err: any) {
      notify.error(err?.response?.data?.detail || err?.response?.data || 'Unable to update request')
    }
  }

  return (
    <AdminProtectedPage>
      <section className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-gold/80">Support workflow</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Verification support requests</h1>
          <p className="mt-2 text-sm text-slate-300">Review and resolve voter assistance requests from the verification flow (email OTP or admin help).</p>
        </div>

        <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-900/90 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.8)]">
          <div className="border-b border-white/10 bg-slate-950/95 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-white">Open requests</p>
                <p className="mt-1 text-sm text-slate-400">Requests are sorted by newest first.</p>
              </div>
              <button
                onClick={fetchRequests}
                className="rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-white/20"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto p-5">
            <table className="min-w-full divide-y divide-white/10 text-sm text-slate-200">
              <thead>
                <tr className="text-left text-slate-400">
                  <th className="px-3 py-3">Requester</th>
                  <th className="px-3 py-3">Subject</th>
                  <th className="px-3 py-3">Message</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Created</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400">Loading support requests…</td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400">No support requests at this time.</td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request.id} className="hover:bg-white/5">
                      <td className="px-3 py-4">
                        <div className="max-w-xs truncate">
                          <p className="font-medium text-white">{request.user_full_name || 'Unknown'}</p>
                          <p className="text-xs text-slate-400">{request.user_email || 'No email'}</p>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-slate-200">{request.subject}</td>
                      <td className="px-3 py-4 text-slate-300 max-w-xl truncate">{request.message}</td>
                      <td className="px-3 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${resolveStatusClass(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-slate-400">{new Date(request.created_at).toLocaleString()}</td>
                      <td className="px-3 py-4 space-x-2">
                        {request.status !== 'resolved' ? (
                          <button
                            onClick={() => markResolved(request.id)}
                            className="rounded-2xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-400"
                          >
                            Mark resolved
                          </button>
                        ) : (
                          <span className="rounded-2xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200">Done</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AdminProtectedPage>
  )
}
