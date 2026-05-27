'use client'
import React, { useEffect, useState } from 'react'
import api from '../../../lib/api'
import AdminProtectedPage from '../../components/AdminProtectedPage'
import { notify } from '../../../lib/notifications'

export default function AdminResults() {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [displayRows, setDisplayRows] = useState<any[]>([])
  const [downloadLoading, setDownloadLoading] = useState(false)

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

  const downloadCsv = async () => {
    setDownloadLoading(true)
    try {
      const response = await api.get('/api/results/export/csv', {
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'alm-election-results.csv')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      notify.success('CSV export ready for download')
    } catch (error: any) {
      notify.error(error?.response?.data?.detail || 'Unable to export results')
    } finally {
      setDownloadLoading(false)
    }
  }

  return (
    <AdminProtectedPage>
      <section className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-gold/80">Results</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Election results</h1>
          <p className="mt-2 text-sm text-slate-300">Review vote totals for every active candidate.</p>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/90 p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.8)]">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Live tally</h2>
              <p className="text-sm text-slate-400">Current totals based on all cast votes.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                {results.length} candidates
              </span>
              <button
                type="button"
                onClick={downloadCsv}
                disabled={downloadLoading}
                className="inline-flex items-center justify-center rounded-3xl bg-gold px-4 py-2 text-xs font-semibold text-navy transition hover:bg-[#b79431] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {downloadLoading ? 'Preparing CSV…' : 'Download CSV'}
              </button>
            </div>
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
