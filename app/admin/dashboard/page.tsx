'use client'

import React, { useEffect, useState } from 'react'
import api from '../../../lib/api'

interface DashboardStats {
  total_members: number
  approved_users: number
  votes_cast: number
  turnout: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true)
        setError(null)
        const response = await api.get('/api/admin/stats')

        if (response.data && response.data.success) {
          setStats(response.data.data)
        } else {
          setError('Invalid structure returned from the data engine.')
        }
      } catch (err: any) {
        console.error('Dashboard structural error:', err)
        setError(err.response?.data?.detail || 'Unable to load admin dashboard data.')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Election Control Center</h1>
          <p className="text-sm text-slate-400">Monitor approvals, candidates, votes, and results from one polished control panel.</p>
        </div>

        {error && (
          <div className="bg-red-950/50 border border-red-500/40 text-red-200 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            ⚠️ <span>{error}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">Members</span>
          <div className="text-3xl font-bold tracking-tight">
            {loading ? <span className="animate-pulse text-slate-700">...</span> : stats?.total_members ?? 0}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">Approved Users</span>
          <div className="text-3xl font-bold tracking-tight">
            {loading ? <span className="animate-pulse text-slate-700">...</span> : stats?.approved_users ?? 0}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">Votes Cast</span>
          <div className="text-3xl font-bold tracking-tight">
            {loading ? <span className="animate-pulse text-slate-700">...</span> : stats?.votes_cast ?? 0}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">Turnout</span>
          <div className="text-3xl font-bold tracking-tight text-amber-400">
            {loading ? <span className="animate-pulse text-slate-700">...</span> : stats?.turnout ?? '0.0%'}
          </div>
        </div>
      </div>
    </div>
  )
}
