'use client'

import React, { useEffect, useState } from 'react'
import api from '../../../lib/api'
import AdminProtectedPage from '../../components/AdminProtectedPage'
import { notify } from '../../../lib/notifications'

export default function AdminCandidates() {
  const [teams, setTeams] = useState<any[]>([])
  const [positions, setPositions] = useState<any[]>([])
  const [candidates, setCandidates] = useState<any[]>([])
  const [form, setForm] = useState({ team_id: '', position_id: '', full_name: '' })
  const [file, setFile] = useState<File | null>(null)
  const [profilePicturePath, setProfilePicturePath] = useState('')
  const [uploadingProfilePicture, setUploadingProfilePicture] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const [teamsRes, positionsRes, candidatesRes] = await Promise.all([
        api.get('/api/teams'),
        api.get('/api/positions'),
        api.get('/api/candidates'),
      ])
      setTeams(teamsRes.data)
      setPositions(positionsRes.data || [])
      setCandidates(candidatesRes.data || [])
    } catch (error) {
      notify.error('Unable to load candidates, teams, or positions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const uploadProfilePicture = async (file: File | null) => {
    if (!file) {
      setProfilePicturePath('')
      return
    }

    setUploadingProfilePicture(true)
    setProfilePicturePath('')

    try {
      const uploadData = new FormData()
      uploadData.append('file', file)
      const response = await api.post('/api/uploads/image', uploadData)
      setProfilePicturePath(response.data.path)
      setFile(file)
      notify.success('Profile picture uploaded successfully.')
    } catch (err: any) {
      notify.error(err?.response?.data?.detail || err?.response?.data || 'Failed to upload profile picture.')
      setFile(null)
    } finally {
      setUploadingProfilePicture(false)
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!form.team_id || !form.position_id || !form.full_name.trim()) {
      notify.error('Team, position, and candidate name are required.')
      return
    }

    const data = new FormData()
    data.append('team_id', form.team_id)
    data.append('position_id', form.position_id)
    data.append('full_name', form.full_name.trim())
    if (profilePicturePath) {
      data.append('profile_picture_url', profilePicturePath)
    }

    try {
      await api.post('/api/candidates', data)
      notify.success('Candidate added successfully.')
      setForm({ team_id: '', position_id: '', full_name: '' })
      setFile(null)
      setProfilePicturePath('')
      loadData()
    } catch (err: any) {
      notify.error(err?.response?.data?.detail || err?.response?.data || 'Failed to add candidate.')
    }
  }

  return (
    <AdminProtectedPage>
      <section className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gold/80">Candidates</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Manage applicants</h1>
            <p className="mt-2 text-sm text-slate-300">Add candidates, assign positions, and keep the roster updated.</p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-white/10 px-5 py-4 shadow-[0_20px_40px_-20px_rgba(15,23,42,0.55)]">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-300">Team count</p>
            <p className="mt-2 text-3xl font-semibold text-white">{teams.length}</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_0.8fr]">
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/90 p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.8)]">
            <h2 className="text-lg font-semibold text-white">Add candidate</h2>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-slate-200">
                  Team
                  <select
                    value={form.team_id}
                    onChange={(event) => setForm({ ...form, team_id: event.target.value, position_id: '' })}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                  >
                    <option value="" className="text-slate-900">Select a team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm text-slate-200">
                  Position
                  <select
                    value={form.position_id}
                    onChange={(event) => setForm({ ...form, position_id: event.target.value })}
                    disabled={!form.team_id}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                  >
                    <option value="" className="text-slate-900">
                      {form.team_id ? 'Select a position' : 'Choose a team first'}
                    </option>
                    {positions
                      .filter((position) => position.team_id === form.team_id)
                      .map((position) => (
                        <option key={position.id} value={position.id}>{position.display_name}</option>
                      ))}
                  </select>
                </label>
              </div>

              <label className="block text-sm text-slate-200">
                Full name
                <input
                  value={form.full_name}
                  onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                  placeholder="Candidate name"
                />
              </label>

              <label className="block text-sm text-slate-200">
                Profile picture
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => uploadProfilePicture(event.target.files ? event.target.files[0] : null)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
                />
                {uploadingProfilePicture && (
                  <p className="mt-2 text-xs text-slate-400">Uploading image…</p>
                )}
                {profilePicturePath && !uploadingProfilePicture && (
                  <p className="mt-2 text-xs text-slate-300">Image uploaded and ready to save.</p>
                )}
              </label>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-gold px-4 py-3 text-sm font-semibold text-navy transition hover:bg-[#b79431]"
              >
                Add candidate
              </button>
            </form>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/90 p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.8)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Candidate roster</h2>
              <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                {candidates.length} items
              </span>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="text-sm text-slate-400">Loading candidates…</div>
              ) : candidates.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900 p-6 text-sm text-slate-400">
                  No candidates available yet.
                </div>
              ) : (
                candidates.map((candidate) => (
                  <div key={candidate.id} className="rounded-3xl border border-white/10 bg-slate-900 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-white">{candidate.full_name}</p>
                        <p className="text-sm text-slate-400">{candidate.team_name || 'Unknown team'} · {candidate.position_name || candidate.position_id}</p>
                      </div>
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                        #{candidate.position_id}
                      </span>
                    </div>
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
