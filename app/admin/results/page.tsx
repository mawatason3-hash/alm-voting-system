'use client'
import React, { useEffect, useState } from 'react'
import api from '../../../lib/api'
import AdminProtectedPage from '../../components/AdminProtectedPage'
import { notify } from '../../../lib/notifications'

export default function AdminResults() {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [displayRows, setDisplayRows] = useState<any[]>([])

  useEffect(() => {
    api.get('/api/results')
      .then((response) => setResults(response.data.candidates || []))
      .catch(() => {
        setResults([])
        notify.error('Unable to load results')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    // Duplicate combined-ticket rows into President and Vice President for display
    const rows:any[] = []
    for (const r of results) {
      if (r.is_combined) {
        rows.push({ id: `${r.id}-P`, full_name: r.full_name, team_name: r.team_name, position_name: 'President', vote_count: r.vote_count })
        rows.push({ id: `${r.id}-V`, full_name: r.running_mate_name || 'Vice President', team_name: r.team_name, position_name: 'Vice President', vote_count: r.vote_count })
      } else {
        rows.push(r)
      }
    }
    setDisplayRows(rows)
  }, [results])

  return (
    <AdminProtectedPage>
      <section className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-gold/80">Results</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Election results</h1>
          <p className="mt-2 text-sm text-slate-300">Review vote totals for every active candidate.</p>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/90 p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.8)]">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Live tally</h2>
              <p className="text-sm text-slate-400">Current totals based on all cast votes.</p>
            </div>
            <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              {results.length} candidates
            </span>
          </div>

          {loading ? (
            <div className="mt-8 text-center text-slate-400">Loading results…</div>
          ) : !results.length ? (
            <div className="mt-8 rounded-3xl border border-dashed border-white/10 bg-slate-900 p-6 text-center text-sm text-slate-400">
              No results available yet.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {displayRows.map((result) => (
                <div key={result.id} className="rounded-3xl border border-white/10 bg-slate-900 p-4 transition hover:border-gold/50">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-white">{result.full_name}</p>
                      <p className="text-sm text-slate-400">{result.team_name} — {result.position_name}</p>
                    </div>
                    <div className="rounded-3xl bg-white/10 px-4 py-2 text-lg font-semibold text-gold">{result.vote_count}</div>
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
