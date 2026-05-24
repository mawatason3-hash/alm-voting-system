'use client'

import React, { useState } from 'react'
import AdminProtectedPage from '../../../components/AdminProtectedPage'
import api from '../../../../lib/api'
import { notify } from '../../../../lib/notifications'

export default function AdminResultsCsv() {
  const [loading, setLoading] = useState(false)

  const downloadCsv = async () => {
    setLoading(true)
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
    } catch (err: any) {
      notify.error(err?.response?.data?.detail || err?.response?.data || 'Unable to export results')
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
            <button
              type="button"
              onClick={downloadCsv}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-3xl bg-gold px-6 py-3 text-sm font-semibold text-navy transition hover:bg-[#b79431] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Preparing export…' : 'Download results CSV'}
            </button>
          </div>
        </div>
      </section>
    </AdminProtectedPage>
  )
}
