'use client'

import React, { useEffect, useMemo, useState } from 'react'
import api from '../../../lib/api'
import AdminProtectedPage from '../../components/AdminProtectedPage'
import { notify } from '../../../lib/notifications'
import { saveAs } from 'file-saver'

export default function AdminMembers() {
  const [members, setMembers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<any>({ full_name: '', email: '', phone: '' })
  const [editing, setEditing] = useState<any>(null)
  const [reviewingMember, setReviewingMember] = useState<any>(null)

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/members')
      setMembers(data)
    } catch (error) {
      setMembers([])
      notify.error('Unable to load members.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  const createMember = async () => {
    try {
      const payload = { full_name: form.full_name, email: form.email, phone: form.phone, password: 'ChangeMe123', role: 'member', is_approved: true }
      await api.post('/api/members', payload)
      notify.success('Member created')
      setForm({ full_name: '', email: '', phone: '' })
      setShowCreate(false)
      fetchMembers()
    } catch (err: any) {
      notify.error(err?.response?.data?.detail || err?.response?.data || 'Create failed.')
    }
  }

  const startEdit = (member: any) => {
    setEditing(member)
    setForm({ full_name: member.full_name, email: member.email, phone: member.phone })
  }

  const updateMember = async () => {
    try {
      await api.put(`/api/members/${editing.id}`, form)
      notify.success('Member updated')
      setEditing(null)
      setForm({ full_name: '', email: '', phone: '' })
      fetchMembers()
    } catch (err: any) {
      notify.error(err?.response?.data?.detail || err?.response?.data || 'Update failed.')
    }
  }

  const approve = async (id: string) => {
    try {
      await api.patch(`/api/members/${id}/approve`)
      notify.success('Member approved.')
      setReviewingMember(null)
      fetchMembers()
    } catch (err: any) {
      notify.error(err?.response?.data?.detail || err?.response?.data || 'Approval failed.')
    }
  }

  const deny = async (id: string) => {
    try {
      await api.delete(`/api/members/${id}`)
      notify.success('Member denied.')
      setReviewingMember(null)
      fetchMembers()
    } catch (err: any) {
      notify.error(err?.response?.data?.detail || err?.response?.data || 'Deny failed.')
    }
  }

  const remove = async (id: string) => {
    try {
      await api.delete(`/api/members/${id}`)
      notify.success('Member removed.')
      fetchMembers()
    } catch (err: any) {
      notify.error(err?.response?.data?.detail || err?.response?.data || 'Remove failed.')
    }
  }

  const exportToCsv = () => {
    if (!members || members.length === 0) return notify.error('No members to export')
    const header = ['id', 'full_name', 'email', 'phone', 'role', 'is_approved', 'photo_url', 'created_at']
    const rows = members.map((m) => header.map((h) => JSON.stringify(m[h] ?? '')).join(','))
    const csv = [header.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, 'members_export.csv')
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const filteredMembers = useMemo(
    () => members.filter((member) => {
      const term = search.toLowerCase()
      return (
        member.full_name?.toLowerCase().includes(term) ||
        member.email?.toLowerCase().includes(term)
      )
    }),
    [members, search]
  )

  return (
    <AdminProtectedPage>
      <section className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gold/80">Members</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Community approvals</h1>
            <p className="mt-2 text-sm text-slate-300">Review member applications and keep the voter roster up to date.</p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/10 px-5 py-4 shadow-[0_20px_40px_-20px_rgba(15,23,42,0.55)]">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-300">Total members</p>
            <p className="mt-2 text-2xl font-semibold text-white">{members.length}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-900/90 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.8)]">
          <div className="flex flex-col gap-3 border-b border-white/10 bg-slate-950/95 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white">Search members</p>
              <p className="mt-1 text-sm text-slate-400">Filter by name or email.</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search members..."
                className="w-full rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-3 text-sm text-white shadow-sm outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20 sm:w-80"
              />
              <button
                onClick={exportToCsv}
                className="rounded-2xl bg-gold px-3 py-2 text-xs font-semibold text-navy transition hover:bg-[#b79431]"
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto p-5">
            <div className="mb-4 flex items-center justify-between">
              <div />
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCreate((s) => !s)}
                  className="rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-white/20"
                >
                  {showCreate ? 'Cancel' : 'Create member'}
                </button>
              </div>
            </div>

            {showCreate && (
              <div className="mb-4 rounded-lg border border-white/10 bg-slate-900/80 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <input value={form.full_name} onChange={(e) => setForm((f: any) => ({ ...f, full_name: e.target.value }))} placeholder="Full name" className="rounded-md px-3 py-2 bg-slate-800 text-white" />
                  <input value={form.email} onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))} placeholder="Email" className="rounded-md px-3 py-2 bg-slate-800 text-white" />
                  <input value={form.phone} onChange={(e) => setForm((f: any) => ({ ...f, phone: e.target.value }))} placeholder="Phone" className="rounded-md px-3 py-2 bg-slate-800 text-white" />
                </div>
                <div className="mt-3">
                  <button onClick={createMember} className="rounded-2xl bg-gold px-4 py-2 text-sm font-semibold text-navy">Create</button>
                </div>
              </div>
            )}
            <table className="min-w-full divide-y divide-white/10 text-sm text-slate-200">
              <thead>
                <tr className="text-left text-slate-400">
                  <th className="px-3 py-3">Photo</th>
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Phone</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400">
                      Loading members…
                    </td>
                  </tr>
                ) : !filteredMembers.length ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400">
                      No members match your search.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-white/5">
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-3">
                          {member.photo_url ? (
                            <img
                              src={member.photo_url}
                              alt={member.full_name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-100">
                              {getInitials(member.full_name)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 font-medium text-white">{member.full_name}</td>
                      <td className="px-3 py-4 text-slate-300">{member.email}</td>
                      <td className="px-3 py-4 text-slate-300">{member.phone}</td>
                      <td className="px-3 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${member.is_approved ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
                          {member.is_approved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-3 py-4 space-x-2">
                        {!member.is_approved ? (
                          <button
                            onClick={() => setReviewingMember(member)}
                            className="rounded-2xl bg-sky-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-400"
                          >
                            Review
                          </button>
                        ) : null}
                        <select
                          value={member.role}
                          onChange={(e) => {
                            const newRole = e.target.value
                            if (newRole !== member.role) {
                              api.put(`/api/members/${member.id}`, { role: newRole })
                                .then(() => {
                                  notify.success(`Role changed to ${newRole}`)
                                  fetchMembers()
                                })
                                .catch((err) => notify.error(err?.response?.data?.detail || 'Failed to update role'))
                            }
                          }}
                          className="rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-white/20"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => startEdit(member)}
                          className="rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-white/20"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => remove(member.id)}
                          className="rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-white/20"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {editing && (
          <div className="mt-6 rounded-[1rem] border border-white/10 bg-slate-900 p-4">
            <h3 className="text-lg font-semibold text-white">Edit member</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input value={form.full_name} onChange={(e) => setForm((f: any) => ({ ...f, full_name: e.target.value }))} placeholder="Full name" className="rounded-md px-3 py-2 bg-slate-800 text-white" />
              <input value={form.email} onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))} placeholder="Email" className="rounded-md px-3 py-2 bg-slate-800 text-white" />
              <input value={form.phone} onChange={(e) => setForm((f: any) => ({ ...f, phone: e.target.value }))} placeholder="Phone" className="rounded-md px-3 py-2 bg-slate-800 text-white" />
            </div>
            <div className="mt-3 flex gap-3">
              <button onClick={updateMember} className="rounded-2xl bg-gold px-4 py-2 text-sm font-semibold text-navy">Save</button>
              <button onClick={() => { setEditing(null); setForm({ full_name: '', email: '', phone: '' }) }} className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white">Cancel</button>
            </div>
          </div>
        )}

        {/* Review Modal */}
        {reviewingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-8 shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-white">Review Member</h2>
                <button
                  onClick={() => setReviewingMember(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Photo */}
                {reviewingMember.photo_url ? (
                  <div className="flex justify-center">
                    <img
                      src={reviewingMember.photo_url}
                      alt={reviewingMember.full_name}
                      className="h-48 w-48 rounded-3xl border border-white/10 object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <div className="flex h-48 w-48 items-center justify-center rounded-3xl border border-white/10 bg-slate-800">
                      <span className="text-4xl font-semibold text-slate-400">{getInitials(reviewingMember.full_name)}</span>
                    </div>
                  </div>
                )}

                {/* Details */}
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Full Name</p>
                    <p className="mt-1 text-sm text-white">{reviewingMember.full_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Email</p>
                    <p className="mt-1 text-sm text-white">{reviewingMember.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Phone</p>
                    <p className="mt-1 text-sm text-white">{reviewingMember.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Status</p>
                    <p className="mt-1 text-sm">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${reviewingMember.is_approved ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
                        {reviewingMember.is_approved ? 'Approved' : 'Pending'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Registered</p>
                    <p className="mt-1 text-sm text-white">{new Date(reviewingMember.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Actions */}
                {!reviewingMember.is_approved && (
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => approve(reviewingMember.id)}
                      className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => deny(reviewingMember.id)}
                      className="flex-1 rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-400"
                    >
                      Deny
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setReviewingMember(null)}
                  className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </AdminProtectedPage>
  )
}
