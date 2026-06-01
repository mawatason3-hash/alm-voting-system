'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import AdminProtectedPage from '../../components/AdminProtectedPage'
import api from '../../../lib/api'
import { getUser, logout } from '../../../lib/auth'
import { notify } from '../../../lib/notifications'

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [results, setResults] = useState<any[]>([])
  const [verificationLogs, setVerificationLogs] = useState<any[]>([])
  const [settings, setSettings] = useState<any>({
    election_name: '',
    is_active: false,
    voting_start: '',
    voting_end: '',
    allow_registration: false,
  })
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)

  const formatLocalDate = (value: string | null) => {
    if (!value) return ''
    const date = new Date(value)
    if (isNaN(date.getTime())) return ''
    const pad = (value: number) => String(value).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [statsRes, resultsRes, settingsRes, logsRes] = await Promise.all([
          api.get('/api/admin/stats'),
          api.get('/api/results'),
          api.get('/api/election/settings'),
          api.get('/api/admin/verification-logs?limit=10'),
        ])
        setStats(statsRes.data)
        setResults(resultsRes.data.candidates || [])
        setVerificationLogs(logsRes.data.logs || [])
        setSettings({
          ...settingsRes.data,
          voting_start: formatLocalDate(settingsRes.data.voting_start),
          voting_end: formatLocalDate(settingsRes.data.voting_end),
        })
      } catch (error) {
        notify.error('Unable to load admin dashboard data.')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()

    // Auto-refresh verification logs every 30 seconds
    const logsInterval = setInterval(async () => {
      try {
        const logsRes = await api.get('/api/admin/verification-logs?limit=10')
        setVerificationLogs(logsRes.data.logs || [])
      } catch (err) {
        console.error('Failed to refresh verification logs:', err)
      }
    }, 30000)

    return () => clearInterval(logsInterval)
  }, [])

  const saveSettings = async () => {
    setSavingSettings(true)
    try {
      await api.patch('/api/election/settings', {
        ...settings,
        voting_start: settings.voting_start || null,
        voting_end: settings.voting_end || null,
      })
      notify.success('Election settings saved')
    } catch (err: any) {
      notify.error(err?.response?.data?.detail || err?.response?.data || 'Unable to save settings')
    } finally {
      setSavingSettings(false)
    }
  }

  const user = getUser()

  return (
    <AdminProtectedPage>
      <section className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gold/80">Admin dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Election control center</h1>
            <p className="mt-2 text-sm text-slate-300">Monitor approvals, candidates, votes, and results from one polished control panel.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {user?.full_name || user?.name ? (
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-white">{user.full_name || user.name}</span>
            ) : null}
            <button
              type="button"
              onClick={() => {
                logout()
                router.replace('/admin/login')
              }}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Link
            href="/admin/members"
            className="group rounded-[1.75rem] bg-white/95 p-6 shadow-[0_25px_80px_-45px_rgba(15,23,42,0.25)] transition hover:border-gold hover:bg-slate-100"
          >
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Members</p>
            <p className="mt-4 text-3xl font-semibold text-navy">{stats?.total_members ?? '—'}</p>
          </Link>
          <Link
            href="/admin/members"
            className="group rounded-[1.75rem] bg-white/95 p-6 shadow-[0_25px_80px_-45px_rgba(15,23,42,0.25)] transition hover:border-gold hover:bg-slate-100"
          >
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Approved Users</p>
            <p className="mt-4 text-3xl font-semibold text-navy">{stats?.approved_members ?? '—'}</p>
          </Link>
          <div className="rounded-[1.75rem] bg-white/95 p-6 shadow-[0_25px_80px_-45px_rgba(15,23,42,0.25)]">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Votes Cast</p>
            <p className="mt-4 text-3xl font-semibold text-navy">{stats?.total_votes ?? '—'}</p>
          </div>
          <div className="rounded-[1.75rem] bg-white/95 p-6 shadow-[0_25px_80px_-45px_rgba(15,23,42,0.25)]">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Turnout</p>
            <p className="mt-4 text-3xl font-semibold text-navy">{stats?.turnout ?? '—'}%</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/admin/teams"
            className="rounded-[1.75rem] border border-white/10 bg-slate-950/90 p-6 shadow-[0_25px_80px_-45px_rgba(15,23,42,0.25)] transition hover:border-gold hover:bg-slate-900"
          >
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Ballot configuration</p>
            <h3 className="mt-4 text-xl font-semibold text-white">Manage teams and tickets</h3>
            <p className="mt-3 text-sm text-slate-400">Add or update teams, candidates, and positions from one unified workflow.</p>
          </Link>
          <Link
            href="/admin/results"
            className="rounded-[1.75rem] border border-white/10 bg-slate-950/90 p-6 shadow-[0_25px_80px_-45px_rgba(15,23,42,0.25)] transition hover:border-gold hover:bg-slate-900"
          >
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Live standings</p>
            <h3 className="mt-4 text-xl font-semibold text-white">View vote totals</h3>
            <p className="mt-3 text-sm text-slate-400">Open the current vote leaderboard and monitor real-time candidate performance.</p>
          </Link>
          <Link
            href="/admin/results/csv"
            className="rounded-[1.75rem] border border-gold/20 bg-gradient-to-br from-[#fff8e0] to-[#f7e4a2] p-6 shadow-[0_25px_80px_-45px_rgba(255,209,102,0.3)] transition hover:shadow-[0_30px_90px_-45px_rgba(255,209,102,0.35)]"
          >
            <p className="text-sm uppercase tracking-[0.3em] text-slate-700">Official export</p>
            <h3 className="mt-4 text-xl font-semibold text-[#1f3c88]">Download results CSV</h3>
            <p className="mt-3 text-sm text-slate-600">Export vote totals with President and Vice President rows duplicated for official reporting.</p>
          </Link>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/95 p-6 shadow-[0_25px_80px_-45px_rgba(15,23,42,0.25)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Active election settings</p>
              <h2 className="mt-2 text-xl font-semibold text-navy">Voting window and registration</h2>
              <p className="mt-1 text-sm text-slate-500">Update the live election schedule without leaving the control center.</p>
            </div>
            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className="inline-flex items-center justify-center rounded-2xl bg-gold px-5 py-3 text-sm font-semibold text-navy transition hover:bg-[#b79431] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {savingSettings ? 'Saving...' : 'Save settings'}
            </button>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Election name</label>
                <input
                  value={settings.election_name}
                  onChange={(e) => setSettings({ ...settings, election_name: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#1f3c88] focus:ring-2 focus:ring-[#1f3c88]/20"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Voting starts
                  <input
                    type="datetime-local"
                    value={settings.voting_start}
                    onChange={(e) => setSettings({ ...settings, voting_start: e.target.value })}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#1f3c88] focus:ring-2 focus:ring-[#1f3c88]/20"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Voting ends
                  <input
                    type="datetime-local"
                    value={settings.voting_end}
                    onChange={(e) => setSettings({ ...settings, voting_end: e.target.value })}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#1f3c88] focus:ring-2 focus:ring-[#1f3c88]/20"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-100 p-5">
              <div className="flex items-center justify-between rounded-2xl bg-white p-4">
                <span className="text-sm text-slate-700">Election active</span>
                <label className="inline-flex items-center gap-3 rounded-full bg-slate-900/5 px-4 py-2 text-sm text-slate-900">
                  <input
                    type="checkbox"
                    checked={settings.is_active}
                    onChange={(e) => setSettings({ ...settings, is_active: e.target.checked })}
                    className="h-5 w-5 rounded border-slate-300 bg-white text-gold"
                  />
                  <span>{settings.is_active ? 'Enabled' : 'Disabled'}</span>
                </label>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white p-4">
                <span className="text-sm text-slate-700">Allow registration</span>
                <label className="inline-flex items-center gap-3 rounded-full bg-slate-900/5 px-4 py-2 text-sm text-slate-900">
                  <input
                    type="checkbox"
                    checked={settings.allow_registration}
                    onChange={(e) => setSettings({ ...settings, allow_registration: e.target.checked })}
                    className="h-5 w-5 rounded border-slate-300 bg-white text-gold"
                  />
                  <span>{settings.allow_registration ? 'Open' : 'Closed'}</span>
                </label>
              </div>
              <div className="rounded-2xl bg-[#eff6ff] p-4 text-sm text-slate-700">
                <p className="font-semibold">Next vote window</p>
                <p className="mt-2 text-sm text-slate-600">{settings.voting_start || 'Not scheduled'} → {settings.voting_end || 'Not scheduled'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.75rem] bg-white/95 p-6 shadow-[0_35px_80px_-60px_rgba(15,23,42,0.25)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-navy">Live vote leaderboard</h2>
                <p className="mt-1 text-sm text-slate-500">Latest candidate vote counts in real time.</p>
              </div>
              <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                {results.length} candidates
              </span>
            </div>
            <div className="mt-6 h-[340px]">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading chart…</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={results.map((candidate) => ({ name: candidate.full_name, votes: candidate.vote_count }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="votes" fill="#1d4ed8" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] bg-white/95 p-6 shadow-[0_35px_80px_-60px_rgba(15,23,42,0.25)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-navy">Top recent candidates</h2>
                <p className="mt-1 text-sm text-slate-500">Highest vote counts from the latest result set.</p>
              </div>
              <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                Top 5
              </span>
            </div>
            <div className="space-y-4">
              {results.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-navy">{item.full_name}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.team_name} · {item.position_name}</p>
                    </div>
                    <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-navy">
                      {item.vote_count} votes
                    </span>
                  </div>
                </div>
              ))}
              {!results.length && <p className="text-sm text-slate-500">No candidate results available yet.</p>}
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] bg-white/95 p-6 shadow-[0_25px_80px_-45px_rgba(15,23,42,0.25)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-navy">Identity Verification Logs</h2>
              <p className="mt-1 text-sm text-slate-500">Recent selfie verification attempts and results.</p>
            </div>
            <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              Latest 10
            </span>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 font-semibold text-slate-700">Voter Name</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Result</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Confidence</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Time</th>
                </tr>
              </thead>
              <tbody>
                {verificationLogs.length > 0 ? (
                  verificationLogs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-900">{log.voter_name || '—'}</td>
                      <td className="px-4 py-3">
                        {log.result === 'success' ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            ✓ PASSED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                            ✗ FAILED
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {log.confidence ? (
                          <span className="font-semibold text-slate-900">{(log.confidence * 100).toFixed(1)}%</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {log.created_at
                          ? new Date(log.created_at).toLocaleString()
                          : '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                      No verification logs yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-xs text-slate-500">
            Auto-refreshing every 30 seconds during election
          </div>
        </div>
      </section>
    </AdminProtectedPage>
  )
}

