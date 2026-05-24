'use client'

import React, { useEffect, useMemo, useState } from 'react'
import api from '../../../lib/api'
import AdminProtectedPage from '../../components/AdminProtectedPage'
import { notify } from '../../../lib/notifications'

interface Position {
  id: string
  title: string
  display_name: string
  is_combined: boolean
  team_id: string
  team_name?: string
  candidate_count: number
}

interface Team {
  id: string
  name: string
}

export default function AdminPositions() {
  const [positions, setPositions] = useState<Position[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    title: '',
    display_name: '',
    is_combined: false,
    team_id: '',
  })
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    title: '',
    display_name: '',
    is_combined: false,
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [teamsRes, positionsRes] = await Promise.all([
        api.get('/api/teams'),
        api.get('/api/positions'),
      ])
      setTeams(teamsRes.data || [])
      setPositions(positionsRes.data || [])
    } catch (error) {
      notify.error('Unable to load teams or positions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const createPosition = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.team_id || !form.title.trim() || !form.display_name.trim()) {
      notify.error('Team, title, and display name are required.')
      return
    }
    try {
      await api.post('/api/positions', {
        team_id: form.team_id,
        title: form.title.trim(),
        display_name: form.display_name.trim(),
        is_combined: form.is_combined,
      })
      notify.success('Position created successfully.')
      setForm({ title: '', display_name: '', is_combined: false, team_id: '' })
      fetchData()
    } catch (err: any) {
      notify.error(err?.response?.data?.detail || err?.response?.data || 'Failed to create position.')
    }
  }

  const startEdit = (position: Position) => {
    setEditId(position.id)
    setEditForm({
      title: position.title,
      display_name: position.display_name,
      is_combined: position.is_combined,
    })
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditForm({ title: '', display_name: '', is_combined: false })
  }

  const saveEdit = async (positionId: string) => {
    if (!editForm.title.trim() || !editForm.display_name.trim()) {
      notify.error('Title and display name are required.')
      return
    }
    try {
      await api.put(`/api/positions/${positionId}`, {
        title: editForm.title.trim(),
        display_name: editForm.display_name.trim(),
        is_combined: editForm.is_combined,
      })
      notify.success('Position updated successfully.')
      cancelEdit()
      fetchData()
    } catch (err: any) {
      notify.error(err?.response?.data?.detail || err?.response?.data || 'Failed to update position.')
    }
  }

  const deletePosition = async (positionId: string) => {
    try {
      await api.delete(`/api/positions/${positionId}`)
      notify.success('Position deleted.')
      fetchData()
    } catch (err: any) {
      notify.error(err?.response?.data?.detail || err?.response?.data || 'Failed to delete position.')
    }
  }

  const teamOptions = useMemo(() => teams, [teams])

  return (
    <AdminProtectedPage>
      <section className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gold/80">Positions</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Manage ballot positions</h1>
            <p className="mt-2 text-sm text-slate-300">Create and update election positions that appear on the member ballot.</p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-white/10 px-5 py-4 shadow-[0_20px_40px_-20px_rgba(15,23,42,0.55)]">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-300">Position count</p>
            <p className="mt-2 text-3xl font-semibold text-white">{positions.length}</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_0.8fr]">
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/90 p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.8)]">
            <h2 className="text-lg font-semibold text-white">Add position</h2>
            <form onSubmit={createPosition} className="mt-5 space-y-4">
              <label className="block text-sm text-slate-200">
                Team
                <select
                  value={form.team_id}
                  onChange={(event) => setForm({ ...form, team_id: event.target.value })}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                >
                  <option value="" className="text-slate-900">Select a team</option>
                  {teamOptions.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-slate-200">
                  Position title
                  <input
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                    placeholder="president_vp"
                  />
                </label>
                <label className="block text-sm text-slate-200">
                  Display name
                  <input
                    value={form.display_name}
                    onChange={(event) => setForm({ ...form, display_name: event.target.value })}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                    placeholder="President & Vice President"
                  />
                </label>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-4 py-4 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={form.is_combined}
                  onChange={(event) => setForm({ ...form, is_combined: event.target.checked })}
                  className="h-5 w-5 rounded border-white/20 bg-slate-800 text-gold"
                />
                Combined position
              </label>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-gold px-4 py-3 text-sm font-semibold text-navy transition hover:bg-[#b79431]"
              >
                Add position
              </button>
            </form>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/90 p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.8)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Position roster</h2>
              <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                {positions.length} positions
              </span>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="text-sm text-slate-400">Loading positions…</div>
              ) : positions.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900 p-6 text-sm text-slate-400">
                  No positions configured yet.
                </div>
              ) : (
                positions.map((position) => (
                  <div key={position.id} className="rounded-3xl border border-white/10 bg-slate-900 p-4">
                    {editId === position.id ? (
                      <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <input
                            value={editForm.title}
                            onChange={(event) => setEditForm({ ...editForm, title: event.target.value })}
                            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                            placeholder="Position title"
                          />
                          <input
                            value={editForm.display_name}
                            onChange={(event) => setEditForm({ ...editForm, display_name: event.target.value })}
                            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                            placeholder="Display name"
                          />
                        </div>
                        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-200">
                          <input
                            type="checkbox"
                            checked={editForm.is_combined}
                            onChange={(event) => setEditForm({ ...editForm, is_combined: event.target.checked })}
                            className="h-5 w-5 rounded border-white/20 bg-slate-800 text-gold"
                          />
                          Combined position
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => saveEdit(position.id)}
                            className="rounded-2xl bg-gold px-4 py-2 text-sm font-semibold text-navy"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">{position.display_name}</p>
                            <p className="text-sm text-slate-400">{position.team_name || 'No team'} · {position.title}</p>
                          </div>
                          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                            {position.candidate_count} candidates
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(position)}
                            className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-white"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deletePosition(position.id)}
                            className="rounded-2xl border border-red-500 bg-red-500/10 px-4 py-2 text-sm text-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </AdminProtectedPage>
  )
}
