'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import api from '../lib/api'

export default function Home() {
  const [settings, setSettings] = useState<any>(null)
  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    api.get('/api/election/settings')
      .then(res => setSettings(res.data))
      .catch(() => setSettings(null))
  }, [])

  useEffect(() => {
    if (!settings || !settings.voting_start) return
    const interval = setInterval(() => {
      const start = new Date(settings.voting_start).getTime()
      const now = Date.now()
      const diff = start - now
      if (diff <= 0) {
        setCountdown('Voting open')
        clearInterval(interval)
        return
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((diff / 60000) % 60)
      const seconds = Math.floor((diff / 1000) % 60)
      setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`)
    }, 1000)
    return () => clearInterval(interval)
  }, [settings])

  const electionName = settings?.election_name || 'ALM General Elections'

  const features = [
    { title: 'Secure voting', description: 'Encrypted ballots and trusted member authentication.' },
    { title: 'Transparent results', description: 'Live tallies and fair election reporting.' },
    { title: 'Member-first', description: 'Designed for Liberians in Musanze with a clean, responsive experience.' },
  ]

  return (
    <div className="relative overflow-hidden min-h-screen">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),transparent_20%),radial-gradient(circle_at_right,_rgba(249,115,22,0.15),transparent_20%),linear-gradient(180deg,#071025,#0f172a)]" />
      <div className="absolute -top-20 right-[-10%] h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-400/10 blur-3xl" />
      <div className="absolute inset-0 bg-[url('/logo.jpg')] bg-right-bottom bg-no-repeat bg-[length:35%] opacity-10" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="space-y-6"
          >
            <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-slate-100 shadow-lg shadow-slate-950/20">
              ALM General Elections
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/10 p-2 shadow-lg shadow-slate-950/20">
                  <img src="/logo.jpg" alt="ALM Logo" className="h-full w-full object-contain" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">Association of Liberians in Musanze</p>
                </div>
              </div>
              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                Unity Leads and God Above All.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                A secure election platform built for Liberians living in Musanze. Vote wisely, view transparent results, and stay connected to the community.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="/register" className="inline-flex items-center justify-center rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:-translate-y-0.5 hover:bg-sky-400">
                  Register to Vote
                </a>
                <a href="/login" className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-sky-300 hover:text-sky-100">
                  Login
                </a>
                <a href="/admin/login" className="inline-flex items-center justify-center rounded-full border border-sky-300/60 bg-white/5 px-6 py-3 text-sm font-semibold text-sky-200 transition hover:bg-sky-400/10">
                  Admin Portal
                </a>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
            className="rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between rounded-3xl bg-slate-950/80 px-5 py-4 text-slate-100">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Voting starts in</p>
                <p className="mt-1 text-xs text-slate-500">Election: {electionName}</p>
              </div>
              <div className="inline-flex items-center justify-center rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950">
                Live
              </div>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {['Days', 'Hours', 'Minutes', 'Seconds'].map((label, index) => {
                const parts = countdown.split(' ')
                const value = parts[index] || '--'
                return (
                  <div key={label} className="rounded-3xl bg-slate-950/85 px-4 py-6 text-center text-white shadow-xl shadow-slate-950/25">
                    <div className="text-3xl font-bold tracking-tight">{value}</div>
                    <div className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">{label}</div>
                  </div>
                )
              })}
            </div>
            <div className="mt-8 rounded-3xl bg-slate-900/80 p-5 text-slate-300">
              <p className="text-sm uppercase tracking-[0.22em] text-sky-300">Next step</p>
              <p className="mt-3 text-base leading-7">
                Complete registration, await approval, and cast your vote securely when the election opens.
              </p>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.25 }}
          className="mt-12 grid gap-6 sm:grid-cols-3"
        >
          {features.map(feature => (
            <div key={feature.title} className="rounded-[1.75rem] border border-white/10 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-300">{feature.title}</p>
              <p className="mt-4 text-sm leading-6 text-slate-300">{feature.description}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
