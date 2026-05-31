'use client'

import React, { useEffect, useState } from 'react'
import api from '../../../lib/api'
import AdminProtectedPage from '../../components/AdminProtectedPage'

export default function AdminVerificationLogs() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [grantingId, setGrantingId] = useState<string | null>(null)
  const [grantMessage, setGrantMessage] = useState<string>('')

  useEffect(() => {
    api
      .get('/api/verification-logs/')
      .then((response) => setLogs(response.data || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [])

  const grantAccess = async (logId: string) => {
    setGrantMessage('')
    setGrantingId(logId)
    try {
      await api.post(`/api/verification-logs/${logId}/grant-access`)
      setGrantMessage('Access has been granted for this voter.')
      setGrantingId(null)
    } catch (err) {
      setGrantMessage('Unable to grant access. Please try again.')
      setGrantingId(null)
    }
  }

  return (
    <AdminProtectedPage>
      <section className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-gold/80">Verification</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Verification logs</h1>
          <p className="mt-2 text-sm text-slate-300">Review selfie verification attempts and audit identity checks in one place.</p>
          {grantMessage ? (
            <div className="mt-4 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              {grantMessage}
            </div>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/90 p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.8)]">
          {loading ? (
            <div className="text-slate-400">Loading verification logs…</div>
          ) : logs.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900 p-6 text-sm text-slate-400">
              No verification log entries found.
            </div>
          ) : (
            <div className="space-y-5">
              {logs.map((log) => (
                <div key={log.id} className="rounded-[1.5rem] border border-white/10 bg-slate-900 p-5 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-slate-400">{new Date(log.created_at).toLocaleString()}</p>
                      <h2 className="mt-2 text-xl font-semibold text-white">{log.voter_name || log.voter_email}</h2>
                      <p className="text-sm text-slate-400">{log.voter_email}</p>
                    </div>
                    <div className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold ${log.result === 'success' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
                      {log.result === 'success' ? 'PASSED' : 'FAILED'}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    {log.result !== 'success' ? (
                      <div className="rounded-3xl border border-white/10 bg-slate-950 p-4 text-sm text-slate-300">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Admin override</p>
                        <button
                          type="button"
                          disabled={grantingId === log.id}
                          onClick={() => grantAccess(log.id)}
                          className="mt-3 inline-flex w-full items-center justify-center rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {grantingId === log.id ? 'Granting access…' : 'Grant Access'}
                        </button>
                      </div>
                    ) : null}
                    <div className="rounded-3xl border border-white/10 bg-slate-950 p-4 text-sm text-slate-300">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Match detail</p>
                      <p className="mt-3 text-base text-white">Match confidence</p>
                      <p className={`mt-1 text-sm ${log.distance !== null ? (log.result === 'success' ? 'text-emerald-300' : 'text-red-300') : 'text-slate-400'}`}>
                        {log.distance !== null ? `${((1 - log.distance) * 100).toFixed(1)}% match` : 'N/A'}
                      </p>
                      <p className="mt-3 text-base text-white">Distance</p>
                      <p className="mt-1 text-sm text-slate-400">{log.distance !== null ? log.distance.toFixed(4) : 'N/A'}</p>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-slate-950 p-4 text-sm text-slate-300">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Registration photo</p>
                      {log.registration_photo_url ? (
                        <img
                          src={log.registration_photo_url}
                          alt="Registration photo"
                          className="mt-3 h-32 w-full rounded-3xl object-cover"
                        />
                      ) : (
                        <p className="mt-3 text-sm text-slate-500">Not available</p>
                      )}
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-slate-950 p-4 text-sm text-slate-300">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Selfie</p>
                      {log.selfie_url ? (
                        <img
                          src={log.selfie_url}
                          alt="Selfie upload"
                          className="mt-3 h-32 w-full rounded-3xl object-cover"
                        />
                      ) : (
                        <p className="mt-3 text-sm text-slate-500">Not available</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </AdminProtectedPage>
  )
}
