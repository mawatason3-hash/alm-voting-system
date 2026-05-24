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
  const [form, setForm] = useState<any>({ full_name: '', email: '', phone: '', member_id: '' })
  const [editing, setEditing] = useState<any>(null)

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
      const payload = { ...form, password: 'ChangeMe123', role: 'member', is_approved: true }
      await api.post('/api/members', payload)
      notify.success('Member created')
      setForm({ full_name: '', email: '', phone: '', member_id: '' })
      setShowCreate(false)
      fetchMembers()
    } catch (err: any) {
      notify.error(err?.response?.data?.detail || err?.response?.data || 'Create failed.')
    }
  }

  const startEdit = (member: any) => {
    setEditing(member)
    setForm({ full_name: member.full_name, email: member.email, phone: member.phone, member_id: member.member_id })
  }

  const updateMember = async () => {
    try {
      await api.put(`/api/members/${editing.id}`, form)
      notify.success('Member updated')
      setEditing(null)
      setForm({ full_name: '', email: '', phone: '', member_id: '' })
      fetchMembers()
    } catch (err: any) {
      notify.error(err?.response?.data?.detail || err?.response?.data || 'Update failed.')
    }
  }

  const approve = async (id: string) => {
    try {
      await api.patch(`/api/members/${id}/approve`)
      notify.success('Member approved.')
      fetchMembers()
    } catch (err: any) {
      notify.error(err?.response?.data?.detail || err?.response?.data || 'Approval failed.')
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
    const header = ['id', 'full_name', 'email', 'phone', 'member_id', 'role', 'is_approved', 'created_at']
    const rows = members.map((m) => header.map((h) => JSON.stringify(m[h] ?? '')).join(','))
    const csv = [header.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, 'members_export.csv')
  }

  const filteredMembers = useMemo(
    () => members.filter((member) => {
      const term = search.toLowerCase()
      return (
        member.full_name?.toLowerCase().includes(term) ||
        member.email?.toLowerCase().includes(term) ||
        member.member_id?.toLowerCase().includes(term)
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
              <p className="mt-1 text-sm text-slate-400">Filter by name, email, or member ID.</p>
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <input value={form.full_name} onChange={(e) => setForm((f: any) => ({ ...f, full_name: e.target.value }))} placeholder="Full name" className="rounded-md px-3 py-2 bg-slate-800 text-white" />
                  <input value={form.email} onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))} placeholder="Email" className="rounded-md px-3 py-2 bg-slate-800 text-white" />
                  <input value={form.phone} onChange={(e) => setForm((f: any) => ({ ...f, phone: e.target.value }))} placeholder="Phone" className="rounded-md px-3 py-2 bg-slate-800 text-white" />
                  <input value={form.member_id} onChange={(e) => setForm((f: any) => ({ ...f, member_id: e.target.value }))} placeholder="Member ID" className="rounded-md px-3 py-2 bg-slate-800 text-white" />
                </div>
                <div className="mt-3">
                  <button onClick={createMember} className="rounded-2xl bg-gold px-4 py-2 text-sm font-semibold text-navy">Create</button>
                </div>
              </div>
            )}
            <table className="min-w-full divide-y divide-white/10 text-sm text-slate-200">
              <thead>
                <tr className="text-left text-slate-400">
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-400">
                      Loading members…
                    </td>
                  </tr>
                ) : !filteredMembers.length ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-400">
                      No members match your search.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-white/5">
                      <td className="px-3 py-4">
                        <div className="font-medium text-white">{member.full_name}</div>
                        <div className="text-xs text-slate-400">{member.member_id || 'No ID'}</div>
                      </td>
                      <td className="px-3 py-4 text-slate-300">{member.email}</td>
                      <td className="px-3 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${member.is_approved ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
                          {member.is_approved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-3 py-4 space-x-2">
                        {!member.is_approved ? (
                          <button
                            onClick={() => approve(member.id)}
                            className="rounded-2xl bg-gold px-3 py-2 text-xs font-semibold text-navy transition hover:bg-[#b79431]"
                          >
                            Approve
                          </button>
                        ) : null}
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
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
              <input value={form.full_name} onChange={(e) => setForm((f: any) => ({ ...f, full_name: e.target.value }))} placeholder="Full name" className="rounded-md px-3 py-2 bg-slate-800 text-white" />
              <input value={form.email} onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))} placeholder="Email" className="rounded-md px-3 py-2 bg-slate-800 text-white" />
              <input value={form.phone} onChange={(e) => setForm((f: any) => ({ ...f, phone: e.target.value }))} placeholder="Phone" className="rounded-md px-3 py-2 bg-slate-800 text-white" />
              <input value={form.member_id} onChange={(e) => setForm((f: any) => ({ ...f, member_id: e.target.value }))} placeholder="Member ID" className="rounded-md px-3 py-2 bg-slate-800 text-white" />
            </div>
            <div className="mt-3 flex gap-3">
              <button onClick={updateMember} className="rounded-2xl bg-gold px-4 py-2 text-sm font-semibold text-navy">Save</button>
              <button onClick={() => { setEditing(null); setForm({ full_name: '', email: '', phone: '', member_id: '' }) }} className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white">Cancel</button>
            </div>
          </div>
        )}
      </section>
    </AdminProtectedPage>
  )
}
