'use client'

import React, { useState } from 'react'
import AdminProtectedPage from '../../../components/AdminProtectedPage'
import api from '../../../../lib/api'
import { notify } from '../../../../lib/notifications'

export default function AdminResultsCsv() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const downloadCsv = async () => {
    setError(null)
    setLoading(true)
    try {
      // Fetch JSON results and build CSV client-side to avoid server-side export errors
      const res = await api.get('/api/results/')
      if (!res || res.status !== 200) throw new Error('Failed to fetch results')

      const data = res.data || {}
      const candidates = Array.isArray(data.candidates) ? data.candidates : []

      const rows: Array<string[]> = []
      rows.push(['Team', 'Position', 'Candidate Name', 'Running Mate', 'Votes'])

      candidates.forEach((c: any) => {
        const team = c.team_name || ''
        const position = c.position_name || c.position_title || ''
        const name = c.full_name || c.name || c.candidate_name || ''
        const running = c.running_mate_name || ''
        const votes = String(c.vote_count || 0)

        rows.push([team, position, name, running, votes])
      })

      const csvString = rows
        .map((row) => row.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(','))
        .join('\n')

      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'alm-election-results.csv')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      notify.success('CSV export ready for download')
    } catch (err: any) {
      // If the error response body is a Blob (HTML from server), try to extract text for clearer message
      let message = err?.message || 'Unable to export results'
      try {
        const respData = err?.response?.data
        if (respData && typeof respData === 'object' && typeof respData.text === 'function') {
          const txt = await respData.text()
          if (txt) message = txt
        } else if (typeof respData === 'string') {
          message = respData
        }
      } catch (e) {
        // ignore
      }

      setError(String(message))
      notify.error(String(message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminProtectedPage>
      <section className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-gold/80">Official Data Export</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Download election results</h1>
          <p className="mt-2 text-sm text-slate-300">Export vote totals to CSV with President and Vice President totals duplicated for flattened reporting.</p>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/90 p-8 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.8)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="text-lg font-semibold text-white">Export current results</p>
              <p className="text-sm text-slate-400">This CSV export flattens combined tickets into separate President and Vice President rows, preserving identical vote totals for both.</p>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={downloadCsv}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-3xl bg-gold px-6 py-3 text-sm font-semibold text-navy transition hover:bg-[#b79431] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Preparing export…' : 'Download results CSV'}
              </button>
              {error ? (
                <p className="text-sm text-red-300">{error}</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </AdminProtectedPage>
  )
}
