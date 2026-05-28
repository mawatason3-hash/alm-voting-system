'use client'

import React, { useEffect, useState } from 'react'
import api from '../../../lib/api'
import ProtectedPage from '../../components/AdminProtectedPage'
import { notify } from '../../../lib/notifications'

interface AccessRequest {
  id: string
  voter_id: string
  voter_name: string
  voter_email: string
  message: string
  status: string
  denial_reason?: string | null
  created_at: string
  updated_at: string | null
}

export default function AdminAccessRequests() {
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadRequests = async () => {
    setLoading(true)
    try {
      const response = await api.get('/api/access-requests')
      setRequests(Array.isArray(response.data) ? response.data : [])
    } catch (err: any) {
      notify.error('Failed to load access requests.')
      console.error('Access requests load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const updateRequest = async (id: string, status: 'approved' | 'denied') => {
    const reason = status === 'denied' ? prompt('Enter denial reason for this request:') : undefined
    if (status === 'denied' && !reason) {
      notify.error('Denial reason is required.')
      return
    }
    setActionLoading(id)
    try {
      await api.patch(`/api/access-requests/${id}`, { status, reason })
      notify.success(`Access request ${status}.`)
      await loadRequests()
    } catch (err: any) {
      notify.error('Unable to update request.')
      console.error('Access request update error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <ProtectedPage>
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/90 p-8 shadow-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Access requests</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">Review member access requests</h1>
              <p className="mt-3 text-sm text-slate-400">Approve or deny ballot access requests and view request history.</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-slate-950/90 p-6 shadow-xl">
          {loading ? (
            <div className="py-16 text-center text-slate-400">Loading access requests…</div>
          ) : requests.length === 0 ? (
            <div className="py-16 text-center text-slate-400">No access requests found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border-separate border-spacing-y-3 text-left">
                <thead>
                  <tr className="text-sm uppercase tracking-[0.24em] text-slate-400">
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Message</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id} className="rounded-[1.5rem] border border-slate-800 bg-slate-900 text-sm text-slate-200 shadow-sm">
                      <td className="px-4 py-4 align-top">
                        <div className="font-semibold text-white">{request.voter_name}</div>
                        <div className="text-xs text-slate-500">ID: {request.voter_id}</div>
                      </td>
                      <td className="px-4 py-4 align-top text-slate-300">{request.voter_email}</td>
                      <td className="px-4 py-4 align-top text-slate-300 max-w-[24rem] break-words">{request.message}</td>
                      <td className="px-4 py-4 align-top">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          request.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-200'
                            : request.status === 'denied'
                            ? 'bg-red-500/10 text-red-200'
                            : 'bg-amber-500/10 text-amber-200'
                        }`}>
                          {request.status}
                        </span>
                        {request.denial_reason ? (
                          <p className="mt-2 text-xs text-slate-500">Reason: {request.denial_reason}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 align-top text-slate-400 text-xs">{new Date(request.created_at).toLocaleString()}</td>
                      <td className="px-4 py-4 align-top space-y-2">
                        <button
                          type="button"
                          onClick={() => updateRequest(request.id, 'approved')}
                          disabled={actionLoading === request.id || request.status === 'approved'}
                          className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRequest(request.id, 'denied')}
                          disabled={actionLoading === request.id || request.status === 'denied'}
                          className="inline-flex w-full items-center justify-center rounded-2xl bg-red-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Deny
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ProtectedPage>
  )
}
