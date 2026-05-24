'use client'
import React, { useEffect, useState } from 'react'
import api from '../../../lib/api'
import AdminProtectedPage from '../../components/AdminProtectedPage'

export default function AdminAudit() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/admin/audit-log')
      .then((response) => setLogs(response.data.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminProtectedPage>
      <section className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-gold/80">Audit</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Audit log</h1>
          <p className="mt-2 text-sm text-slate-300">Track administrative events and changes across the system.</p>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/90 p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.8)]">
          {loading ? (
            <div className="text-slate-400">Loading audit activity…</div>
          ) : logs.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900 p-6 text-sm text-slate-400">
              No audit entries found.
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-slate-300">{new Date(log.created_at).toLocaleString()}</p>
                      <p className="mt-2 text-base font-semibold text-white">{log.action}</p>
                      <p className="text-sm text-slate-400">Performed by {log.actor_name || log.actor_email || 'System'}</p>
                    </div>
                    <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                      Audit event
                    </span>
                  </div>
                  <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950 p-4 text-xs leading-5 text-slate-300">
                    {JSON.stringify(log.metadata || {}, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </AdminProtectedPage>
  )
}
