'use client'

import React, { useEffect, useState } from 'react'
import api from '../../../lib/api'
import AdminProtectedPage from '../../components/AdminProtectedPage'
import { notify } from '../../../lib/notifications'

export default function AdminTeams() {
  const [teams, setTeams] = useState<any[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [advanced, setAdvanced] = useState(false)
  const [presidentName, setPresidentName] = useState('')
  const [vpName, setVpName] = useState('')
  const [secretaryName, setSecretaryName] = useState('')
  const [finSecName, setFinSecName] = useState('')
  const [presImage, setPresImage] = useState<File | null>(null)
  const [vpImage, setVpImage] = useState<File | null>(null)
  const [secImage, setSecImage] = useState<File | null>(null)
  const [finImage, setFinImage] = useState<File | null>(null)
  const [presImagePath, setPresImagePath] = useState('')
  const [vpImagePath, setVpImagePath] = useState('')
  const [secImagePath, setSecImagePath] = useState('')
  const [finImagePath, setFinImagePath] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchTeams = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/teams')
      setTeams(data)
    } catch (error) {
      setTeams([])
      notify.error('Unable to load teams.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeams()
  }, [])

  const uploadImageFile = async (file: File | null, setter: React.Dispatch<React.SetStateAction<string>>, setterFile: React.Dispatch<React.SetStateAction<File | null>>, label: string) => {
    if (!file) {
      setter('')
      setterFile(null)
      return
    }

    setImageUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const { data } = await api.post('/api/uploads/image', formData)
      setter(data.path)
      setterFile(file)
      notify.success(`${label} uploaded successfully.`)
    } catch (err: any) {
      notify.error(err?.response?.data?.detail || err?.response?.data || `Failed to upload ${label}.`)
      setter('')
      setterFile(null)
    } finally {
      setImageUploading(false)
    }
  }

  const createTeam = async () => {
    if (!name.trim()) {
      notify.error('Team name is required.')
      return
    }

    try {
      await api.post('/api/teams', { name: name.trim(), description: description.trim() })
      setName('')
      setDescription('')
      notify.success('Team created successfully.')
      fetchTeams()
    } catch (err: any) {
      notify.error(err?.response?.data?.detail || err?.response?.data || 'Failed to create team.')
    }
  }

  const removeTeam = async (id: string) => {
    try {
      await api.delete(`/api/teams/${id}`)
      notify.success('Team deleted.')
      fetchTeams()
    } catch (err: any) {
      notify.error(err?.response?.data?.detail || err?.response?.data || 'Failed to delete team.')
    }
  }

  return (
    <AdminProtectedPage>
      <section className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gold/80">Ballot configuration</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Create teams and full tickets</h1>
            <p className="mt-2 text-sm text-slate-300">Add teams, candidate names, and upload photos for every ballot position together.</p>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/10 px-5 py-4 shadow-[0_20px_40px_-20px_rgba(15,23,42,0.55)]">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-300">Team count</p>
            <p className="mt-2 text-3xl font-semibold text-white">{teams.length}</p>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/90 p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.8)]">
          <div className="grid gap-4 md:grid-cols-[1fr_260px] md:items-end">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200">Team name</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
                  placeholder="Create a new team"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200">Description</label>
                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
                  placeholder="Optional description"
                />
              </div>
              <div className="flex items-center gap-3">
                <input id="advanced" type="checkbox" checked={advanced} onChange={e => setAdvanced(e.target.checked)} />
                <label htmlFor="advanced" className="text-sm text-slate-300">Create full team roster (president, VP, secretary, fin sec)</label>
              </div>
              {advanced && (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm text-slate-200">President name</label>
                      <input value={presidentName} onChange={e => setPresidentName(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-200">VP name</label>
                      <input value={vpName} onChange={e => setVpName(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white" />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm text-slate-200">Secretary name</label>
                      <input value={secretaryName} onChange={e => setSecretaryName(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-200">Financial Secretary name</label>
                      <input value={finSecName} onChange={e => setFinSecName(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white" />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm text-slate-200">President photo</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => uploadImageFile(e.target.files ? e.target.files[0] : null, setPresImagePath, setPresImage, 'President photo')}
                        className="mt-2 w-full rounded-2xl"
                      />
                      {presImagePath && !imageUploading && (
                        <p className="mt-2 text-xs text-slate-300">Uploaded to local storage.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm text-slate-200">VP photo</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => uploadImageFile(e.target.files ? e.target.files[0] : null, setVpImagePath, setVpImage, 'VP photo')}
                        className="mt-2 w-full rounded-2xl"
                      />
                      {vpImagePath && !imageUploading && (
                        <p className="mt-2 text-xs text-slate-300">Uploaded to local storage.</p>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm text-slate-200">Secretary photo</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => uploadImageFile(e.target.files ? e.target.files[0] : null, setSecImagePath, setSecImage, 'Secretary photo')}
                        className="mt-2 w-full rounded-2xl"
                      />
                      {secImagePath && !imageUploading && (
                        <p className="mt-2 text-xs text-slate-300">Uploaded to local storage.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm text-slate-200">Financial Secretary photo</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => uploadImageFile(e.target.files ? e.target.files[0] : null, setFinImagePath, setFinImage, 'Financial Secretary photo')}
                        className="mt-2 w-full rounded-2xl"
                      />
                      {finImagePath && !imageUploading && (
                        <p className="mt-2 text-xs text-slate-300">Uploaded to local storage.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={createTeam} className="inline-flex h-full w-full items-center justify-center rounded-2xl bg-gold px-5 py-3 text-sm font-semibold text-navy transition hover:bg-[#b79431]">Add team</button>
              {advanced && (
                <button type="button" onClick={async () => {
                  // submit full team form
                  if (!name.trim() || !presidentName.trim() || !vpName.trim() || !secretaryName.trim() || !finSecName.trim()) {
                    notify.error('All names are required for full team creation')
                    return
                  }
                  const fd = new FormData()
                  fd.append('name', name.trim())
                  fd.append('description', description.trim())
                  fd.append('president_name', presidentName.trim())
                  fd.append('vp_name', vpName.trim())
                  fd.append('secretary_name', secretaryName.trim())
                  fd.append('financial_secretary_name', finSecName.trim())
                  if (presImagePath) fd.append('president_image_url', presImagePath)
                  else if (presImage) fd.append('president_image', presImage)
                  if (vpImagePath) fd.append('vp_image_url', vpImagePath)
                  else if (vpImage) fd.append('vp_image', vpImage)
                  if (secImagePath) fd.append('secretary_image_url', secImagePath)
                  else if (secImage) fd.append('secretary_image', secImage)
                  if (finImagePath) fd.append('financial_secretary_image_url', finImagePath)
                  else if (finImage) fd.append('financial_secretary_image', finImage)
                  try {
                    await api.post('/api/teams/full', fd)
                    notify.success('Full team created')
                    setName('')
                    setDescription('')
                    setPresidentName('')
                    setVpName('')
                    setSecretaryName('')
                    setFinSecName('')
                    setPresImage(null)
                    setVpImage(null)
                    setSecImage(null)
                    setFinImage(null)
                    setAdvanced(false)
                    fetchTeams()
                  } catch (err: any) {
                    notify.error(err?.response?.data?.detail || err?.response?.data || 'Failed to create full team')
                  }
                }} className="inline-flex h-full w-full items-center justify-center rounded-2xl bg-[#1a2744] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#162033]">Add full team roster</button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/90 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.8)]">
          <div className="border-b border-white/10 bg-slate-900/95 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">Existing teams</h2>
          </div>
          <div className="overflow-x-auto p-6">
            <table className="min-w-full text-left text-sm text-slate-200">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="px-3 py-3">Team</th>
                  <th className="px-3 py-3">Candidates</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-sm text-slate-400">
                      Loading teams…
                    </td>
                  </tr>
                ) : teams.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-sm text-slate-400">
                      No teams created yet.
                    </td>
                  </tr>
                ) : (
                  teams.map((team) => (
                    <tr key={team.id} className="hover:bg-white/5">
                      <td className="px-3 py-4">
                        <div className="font-medium text-white">{team.name}</div>
                        <div className="text-xs text-slate-400">{team.description || 'No description'}</div>
                      </td>
                      <td className="px-3 py-4 text-slate-200">{team.candidate_count ?? 0}</td>
                      <td className="px-3 py-4">
                        <button
                          onClick={() => removeTeam(team.id)}
                          className="rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:border-white/20"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AdminProtectedPage>
  )
}
