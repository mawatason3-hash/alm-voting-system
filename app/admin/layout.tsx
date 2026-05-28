  'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import api from '../../lib/api'

const navItems = [
  { label: '📊 Control Center', href: '/admin/dashboard' },
  { label: '👥 Ballot Configuration', href: '/admin/teams' },
  { label: '📋 Live Standings', href: '/admin/results' },
  { label: '📥 Official Data Export', href: '/admin/results/csv' },
  { label: '🛎️ Support Requests', href: '/admin/requests' },
  { label: '📬 Access Requests', href: '/admin/access-requests' },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [pendingAccessRequests, setPendingAccessRequests] = useState(0)
  const showShell = pathname !== '/admin/login'
  const sectionLabel = pathname?.split('/').filter(Boolean).slice(-1)[0] || 'dashboard'
  const activeSection = sectionLabel === 'admin' ? 'Dashboard' : sectionLabel.charAt(0).toUpperCase() + sectionLabel.slice(1)

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const response = await api.get('/api/access-requests/pending-count')
        if (response.status === 200) {
          setPendingAccessRequests(response.data?.pending_count || 0)
        }
      } catch (err) {
        console.warn('Unable to load pending access request count', err)
      }
    }

    fetchPendingCount()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-slate-950 to-slate-900 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col">
        <header className="border-b border-white/10 bg-navy/95 px-4 py-4 shadow-[0_10px_40px_-20px_rgba(15,23,42,0.9)] backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {showShell ? (
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10 md:hidden"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-gold" />
                  Menu
                </button>
              ) : null}
              <Link href="/admin/dashboard" className="text-xl font-semibold tracking-tight text-white">
                ALM Voting Admin
              </Link>
            </div>
            <div className="hidden items-center gap-3 text-sm text-slate-300 md:flex">
              <span className="rounded-full bg-white/10 px-3 py-1 text-gold">Secure portal</span>
              <span className="text-slate-400">Manage elections, approvals and live results.</span>
            </div>
          </div>
        </header>

        {showShell ? (
          <div
            className={`fixed inset-0 z-40 transition-opacity md:hidden ${mobileMenuOpen ? 'visible opacity-100' : 'pointer-events-none opacity-0'}`}
            aria-hidden={!mobileMenuOpen}
          >
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <aside
              className={`absolute left-0 top-0 z-50 h-full w-[calc(100%-1.5rem)] max-w-xs overflow-y-auto border-r border-white/10 bg-slate-950/98 p-6 shadow-2xl transition-transform duration-300 ${
                mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
            >
              <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Admin menu</p>
                  <h2 className="text-lg font-semibold text-white">Quick navigation</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>

              <nav className="space-y-2">
                {navItems.map((item) => {
                  const active = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                        active
                          ? 'bg-gold text-navy shadow-[0_8px_30px_-18px_rgba(255,209,102,0.8)]'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {item.label}
                      {item.href === '/admin/access-requests' && pendingAccessRequests > 0 ? (
                        <span className="ml-2 inline-flex rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                          {pendingAccessRequests}
                        </span>
                      ) : null}
                    </Link>
                  )
                })}
              </nav>
            </aside>
          </div>
        ) : null}

        <div className="flex flex-1">
          {showShell ? (
            <aside className="hidden w-80 shrink-0 flex-col gap-6 border-r border-white/10 bg-slate-950/95 px-6 py-8 text-slate-100 md:flex">
              <div className="space-y-4">
                <div className="rounded-[2rem] bg-gradient-to-br from-slate-900 to-navy p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.8)]">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Administrator</p>
                  <h1 className="mt-3 text-2xl font-semibold text-white">Election Control</h1>
                  <p className="mt-3 text-sm text-slate-400">
                    Approvals, teams, candidates, audit trails, and live election status — all in one place.
                  </p>
                </div>
              </div>

              <nav className="space-y-2">
                {navItems.map((item) => {
                  const active = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                        active
                          ? 'bg-gold text-navy shadow-[0_8px_30px_-18px_rgba(255,209,102,0.8)]'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {item.label}
                      {item.href === '/admin/access-requests' && pendingAccessRequests > 0 ? (
                        <span className="ml-2 inline-flex rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                          {pendingAccessRequests}
                        </span>
                      ) : null}
                    </Link>
                  )
                })}
              </nav>

              <div className="mt-auto rounded-[1.75rem] border border-white/10 bg-slate-900/95 p-5 text-sm text-slate-300">
                <p className="font-semibold text-white">Admin navigation</p>
                <p className="mt-2 text-xs leading-5">
                  Use this menu to move fast between election controls, candidate workflows, and audit history.
                </p>
              </div>
            </aside>
          ) : null}

          <main className="flex-1 p-4 sm:p-6 md:p-8">
            <div className="mx-auto w-full max-w-7xl">
              {showShell ? (
                <div className="mb-6 rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-5 shadow-[0_15px_40px_-20px_rgba(15,23,42,0.8)] backdrop-blur-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin summary</p>
                      <h2 className="mt-2 text-xl font-semibold text-white">Quick status</h2>
                      <p className="mt-1 text-sm text-slate-400">Current admin section and quick action overview for fast management.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <span className="rounded-full bg-white/5 px-3 py-2 text-sm text-slate-200">Section: {activeSection}</span>
                      <span className="rounded-full bg-gold/10 px-3 py-2 text-sm font-semibold text-gold">{navItems.length} admin links</span>
                    </div>
                  </div>
                </div>
              ) : null}
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
