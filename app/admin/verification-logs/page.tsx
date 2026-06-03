'use client'

import React, { useEffect, useState } from 'react'
import api from '../../../lib/api'
import AdminProtectedPage from '../../components/AdminProtectedPage'

interface VerificationLog {
  voter_id: string
  voter_name: string
  voter_email: string
  verification_method: string
  verification_timestamp: string
}

export default function AdminVerificationLogs() {
  const [logs, setLogs] = useState<VerificationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMethod, setFilterMethod] = useState('')

  useEffect(() => {
    api
      .get('/api/verification-logs/')
      .then((response) => setLogs(response.data || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [])

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.voter_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.voter_email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesMethod = filterMethod ? log.verification_method === filterMethod : true
    return matchesSearch && matchesMethod
  })

  const totalVerified = logs.length
  const emailOtpCount = logs.filter((log) => log.verification_method === 'Email OTP').length
  const adminApprovedCount = logs.filter((log) => log.verification_method === 'Admin Approved').length

  return (
    <AdminProtectedPage>
      <section className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-gold/80">Verification</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Verification logs</h1>
          <p className="mt-2 text-sm text-slate-300">Review all verified members who have accessed the ballot.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Total verified</p>
            <p className="mt-3 text-4xl font-semibold text-white">{totalVerified}</p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Email OTP verified</p>
            <p className="mt-3 text-4xl font-semibold text-white">{emailOtpCount}</p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Admin approved</p>
            <p className="mt-3 text-4xl font-semibold text-white">{adminApprovedCount}</p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-xl">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Search by name or email</label>
              <input
                type="text"
                placeholder="Enter member name or email…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-white/30 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="filter-method" className="text-xs uppercase tracking-[0.3em] text-slate-500">Filter by method</label>
              <select
                id="filter-method"
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
              >
                <option value="">All verification methods</option>
                <option value="Email OTP">Email OTP</option>
                <option value="Admin Approved">Admin Approved</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/90 p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.8)]">
          {loading ? (
            <div className="text-slate-400">Loading verification logs…</div>
          ) : filteredLogs.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900 p-6 text-sm text-slate-400">
              {searchTerm || filterMethod ? 'No matching verification logs found.' : 'No verified members yet.'}
            </div>
          ) : (
            <div className="space-y-5">
              {filteredLogs.map((log) => (
                <div key={log.voter_id} className="rounded-[1.5rem] border border-white/10 bg-slate-900 p-5 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-white">{log.voter_name}</h2>
                      <p className="text-sm text-slate-400">{log.voter_email}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(log.verification_timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div
                      className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold ${
                        log.verification_method === 'Email OTP'
                          ? 'bg-blue-500/10 text-blue-300'
                          : 'bg-emerald-500/10 text-emerald-300'
                      }`}
                    >
                      {log.verification_method}
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
