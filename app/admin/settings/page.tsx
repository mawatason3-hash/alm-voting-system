'use client'
import React, { useEffect, useState } from 'react'
import api from '../../../lib/api'
import AdminProtectedPage from '../../components/AdminProtectedPage'
import { notify } from '../../../lib/notifications'

function formatLocalDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<any>({
    election_name: '',
    is_active: false,
    voting_start: '',
    voting_end: '',
    allow_registration: false,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/election/settings')
      .then((r) => {
        setSettings({
          ...r.data,
          voting_start: formatLocalDate(r.data.voting_start),
          voting_end: formatLocalDate(r.data.voting_end),
        })
      })
      .catch(() => {
        setSettings({
          election_name: '',
          is_active: false,
          voting_start: '',
          voting_end: '',
          allow_registration: false,
        })
        notify.error('Unable to load settings')
      })
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    try {
      await api.patch('/api/election/settings', {
        ...settings,
        voting_start: settings.voting_start || null,
        voting_end: settings.voting_end || null,
      })
      notify.success('Settings saved')
    } catch (err: any) {
      notify.error(err?.response?.data?.detail || err?.response?.data || 'Unable to save settings')
    }
  }

  return (
    <AdminProtectedPage>
      <section className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-gold/80">Settings</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Election settings</h1>
          <p className="mt-2 text-sm text-slate-300">Control election lifecycle and registration behavior.</p>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/90 p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.8)]">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            {loading ? (
              <div className="col-span-full text-slate-400">Loading election settings…</div>
            ) : (
              <>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-200">Election name</label>
                    <input
                      value={settings.election_name}
                      onChange={(e) => setSettings({ ...settings, election_name: e.target.value })}
                      className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-slate-200">
                      Voting starts
                      <input
                        type="datetime-local"
                        value={settings.voting_start}
                        onChange={(e) => setSettings({ ...settings, voting_start: e.target.value })}
                        className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-200">
                      Voting ends
                      <input
                        type="datetime-local"
                        value={settings.voting_end}
                        onChange={(e) => setSettings({ ...settings, voting_end: e.target.value })}
                        className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-4 py-4 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={settings.is_active}
                        onChange={(e) => setSettings({ ...settings, is_active: e.target.checked })}
                        className="h-5 w-5 rounded border-white/20 bg-slate-800 text-gold"
                      />
                      <span>Election active</span>
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-4 py-4 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={settings.allow_registration}
                        onChange={(e) => setSettings({ ...settings, allow_registration: e.target.checked })}
                        className="h-5 w-5 rounded border-white/20 bg-slate-800 text-gold"
                      />
                      <span>Allow registration</span>
                    </label>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/95 p-6 text-slate-300">
                  <h2 className="text-lg font-semibold text-white">Settings summary</h2>
                  <p className="mt-3 text-sm leading-6">
                    Configure the election title, toggle active mode, and set the voting window.
                    Use registration controls to manage whether new voters may sign up.
                  </p>
                  <div className="mt-6 space-y-3 text-sm">
                    <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                      <span>Active status</span>
                      <span className="font-semibold text-white">{settings.is_active ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                      <span>Registration</span>
                      <span className="font-semibold text-white">{settings.allow_registration ? 'Open' : 'Closed'}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                      <span>Vote window</span>
                      <span className="font-semibold text-white">{settings.voting_start ? settings.voting_start : 'Not scheduled'} → {settings.voting_end ? settings.voting_end : 'Not scheduled'}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mt-4 flex justify-end lg:mt-0">
            <button
              onClick={save}
              className="rounded-2xl bg-gold px-6 py-3 text-sm font-semibold text-navy transition hover:bg-[#b79431]"
            >
              Save settings
            </button>
          </div>
        </div>
      </section>
    </AdminProtectedPage>
  )
}
