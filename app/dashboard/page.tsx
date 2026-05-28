'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Vote,
  CheckCircle,
  Clock,
  LogOut,
  User,
  Calendar,
  Trophy,
  ChevronRight,
  Bell,
  Shield,
} from 'lucide-react'
import api from '../../lib/api'
import { getUser } from '../../lib/auth'
import ProtectedPage from '../components/ProtectedPage'

interface VotedPositions {
  voted_positions: string[]
  voted_candidates?: string[]
  voted_titles?: string[]
}

interface ElectionSettings {
  election_name: string
  is_active: boolean
  voting_start: string
  voting_end: string
  allow_registration: boolean
}

interface Candidate {
  id: string
  full_name: string
  profile_picture: string
  party_affiliation: string
  position_title: string
  position_name: string
  team_name: string
  running_mate_name: string
}

export default function Dashboard() {
  const [votedPositions, setVotedPositions] = useState<Set<string>>(new Set())
  const [votedTitles, setVotedTitles] = useState<string[]>([])
  const [settings, setSettings] = useState<ElectionSettings | null>(null)
  const [positions, setPositions] = useState<any[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState('')
  const [hasFaceSetup, setHasFaceSetup] = useState<boolean | null>(null)
  const user = getUser()

  const normalizePositionKey = (value: string | undefined | null) => {
    const raw = String(value || '').trim().toLowerCase()
    return raw
      .replace(/[_\-\s]+/g, ' ')
      .replace(/[^a-z0-9 ]+/g, '')
      .trim()
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [votesRes, settingsRes, positionsRes, candidatesRes] = await Promise.all([
          api.get('/api/votes/my-votes'),
          api.get('/api/election/settings'),
          api.get('/api/positions'),
          api.get('/api/candidates'),
        ])

        if (votesRes.status === 200) {
          const titles = votesRes.data.voted_titles || votesRes.data.voted_positions || []
          setVotedPositions(
            new Set((titles as string[]).map((t) => normalizePositionKey(t)))
          )
          setVotedTitles(votesRes.data.voted_titles || [])
        }
        if (settingsRes.status === 200) {
          setSettings(settingsRes.data)
        }
        if (positionsRes.status === 200) {
          setPositions(Array.isArray(positionsRes.data) ? positionsRes.data : [])
        }
        if (candidatesRes.status === 200) {
          setCandidates(Array.isArray(candidatesRes.data) ? candidatesRes.data : [])
        }

        try {
          const faceRefRes = await api.get('/api/votes/face-descriptor')
          if (faceRefRes.status === 200) {
            const refData = faceRefRes.data
            if (refData?.descriptor && Array.isArray(refData.descriptor) && refData.descriptor.length > 0) {
              setHasFaceSetup(true)
            } else {
              setHasFaceSetup(false)
            }
          }
        } catch (err: any) {
          if (err?.response?.status === 404) {
            setHasFaceSetup(false)
          } else {
            console.warn('Unable to resolve face verification status', err)
            setHasFaceSetup(false)
          }
        }
      } catch (error) {
        console.error('Dashboard fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    if (!settings) return

    const parseTimestamp = (value?: string) => {
      if (!value) return null
      const date = new Date(value)
      return isNaN(date.getTime()) ? null : date
    }

    const updateTimer = () => {
      const now = new Date()
      const target = settings.is_active
        ? parseTimestamp(settings.voting_end)
        : parseTimestamp(settings.voting_start)

      if (!target) {
        setTimeLeft(settings.is_active ? 'Live now' : '')
        return
      }

      const diff = target.getTime() - now.getTime()
      if (diff <= 0) {
        setTimeLeft(settings.is_active ? 'Live now' : 'Voting has ended')
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`)
    }

    updateTimer()
    const interval = window.setInterval(updateTimer, 1000)
    return () => window.clearInterval(interval)
  }, [settings])

  const getElectionStatus = () => {
    if (!settings) return { label: 'Loading...', color: 'gray' }
    if (settings.is_active) return { label: 'VOTING IS OPEN', color: 'green' }

    const now = new Date()
    if (settings.voting_end && new Date(settings.voting_end) < now) {
      return { label: 'ELECTION ENDED', color: 'red' }
    }
    return { label: 'NOT STARTED YET', color: 'yellow' }
  }

  const electionStatus = getElectionStatus()
  const countdownLabel = (() => {
    if (!settings) return 'Loading...'
    if (settings.is_active) return timeLeft || 'Live now'
    if (!timeLeft) return 'Pending schedule'
    const numericParts = timeLeft.match(/\d+/g)
    return numericParts?.length ? timeLeft : timeLeft
  })()
  const totalVoted = votedPositions.size
  const candidatePreview = candidates
  const uniquePositionCount = useMemo(() => {
    const categories = new Set<string>()
    positions.forEach((position: any) => {
      const key = normalizePositionKey(position.title || position.display_name)
      if (key) {
        categories.add(key)
      }
    })
    return Math.max(3, categories.size)
  }, [positions])

  const positionCards = positions.map((position) => ({
    id: position.id,
    title: position.title,
    display_name: position.display_name,
    description: position.display_name || position.title,
    is_combined: position.is_combined,
    icon: position.is_combined ? Trophy : Shield,
  }))

  const hasVotedForPosition = (positionTitle: string) => {
    return votedTitles.includes(positionTitle)
  }

  const resolveImageUrl = (image?: string | null) => {
    if (!image) return undefined
    const rawImgPath = String(image).trim()
    if (!rawImgPath) return undefined
    if (/^(https?:\/\/|data:)/i.test(rawImgPath)) {
      return rawImgPath
    }
    const apiBase = ((process.env.NEXT_PUBLIC_API_URL || api.defaults.baseURL || '') as string).replace(/\/\/+$|\/$/, '')
    return apiBase ? `${apiBase}${rawImgPath}` : rawImgPath
  }

  if (loading) {
    return (
      <ProtectedPage>
        <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4 py-20 text-[#1a2744]">
          <div className="rounded-3xl border border-slate-200 bg-white px-8 py-10 shadow-lg text-center">
            <div className="mb-5 h-14 w-14 rounded-full border-4 border-[#1a2744] border-t-[#c9a84c] animate-spin mx-auto" />
            <p className="text-lg font-semibold">Loading your dashboard…</p>
            <p className="text-sm text-slate-500 mt-2">Fetching election status and candidate previews.</p>
          </div>
        </div>
      </ProtectedPage>
    )
  }

  return (
    <ProtectedPage>
      <div className="min-h-screen bg-[#f8f9fa] text-[#1a2744]">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[2rem] bg-white p-8 shadow-xl border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-[#c9a84c]">Member Dashboard</p>
                  <h1 className="mt-3 text-3xl font-semibold leading-tight">Welcome back, {user?.full_name || user?.name || 'Member'}</h1>
                  <p className="mt-3 max-w-2xl text-sm text-slate-500">
                    Review election status, preview candidates, and complete your voting in one polished member portal.
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-[#f8f9fa] p-5 text-right">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Voting progress</p>
                  <p className="mt-3 text-4xl font-bold text-[#1a2744]">{uniquePositionCount ? `${totalVoted}/${uniquePositionCount}` : '0/0'}</p>
                  <p className="text-sm text-slate-500">positions voted</p>
                </div>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-[#f8f9fa] p-6">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Current status</p>
                  <div className="mt-4 flex items-center gap-3">
                    <span className={`inline-flex h-3.5 w-3.5 rounded-full ${
                      electionStatus.color === 'green'
                        ? 'bg-green-500'
                        : electionStatus.color === 'red'
                        ? 'bg-red-500'
                        : 'bg-yellow-500'
                    }`} />
                    <p className="font-semibold text-[#1a2744]">{electionStatus.label}</p>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">{settings?.election_name || 'Election details unavailable'}</p>
                </div>
                <div className="rounded-3xl bg-[#f8f9fa] p-6">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Countdown</p>
                  <p className="mt-4 text-3xl font-semibold text-[#1a2744]">{countdownLabel}</p>
                  <p className="mt-2 text-sm text-slate-500">
                    {settings?.is_active ? 'Time until voting closes' : 'Time until voting opens'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] bg-white p-8 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-[#c9a84c]">Quick actions</p>
                  <h2 className="mt-3 text-2xl font-semibold">Ready to vote?</h2>
                </div>
                <div className="rounded-full bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a2744]">{settings?.is_active ? 'Live now' : 'Not live'}</div>
              </div>
              <div className="mt-6 space-y-4">
                <Link
                  href={settings?.is_active ? '/verify-face' : '#'}
                  className={`flex items-center justify-between rounded-3xl border px-5 py-4 text-sm font-semibold transition ${
                    settings?.is_active
                      ? 'border-[#c9a84c] bg-[#1a2744] text-white hover:bg-[#18223d]'
                      : 'border-slate-200 bg-slate-50 text-slate-500 pointer-events-none'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Vote size={18} className={settings?.is_active ? 'text-white' : 'text-slate-400'} />
                    Click to verify and vote
                  </span>
                  <ChevronRight size={18} className={settings?.is_active ? 'text-white' : 'text-slate-400'} />
                </Link>
                <div className="rounded-3xl border border-slate-200 bg-[#f8f9fa] p-5">
                  {hasFaceSetup === null ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-900">Checking face verification status…</div>
                  ) : hasFaceSetup ? (
                    <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
                      <p className="font-semibold">Face verification is set up.</p>
                      <p className="mt-2 text-sm text-emerald-900/80">You're ready to verify your identity and access the voting ballot.</p>
                      <div className="mt-3">
                        <Link href="/dashboard/face-setup" className="inline-flex rounded-full bg-[#1a2744] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#18223d]">
                          Update face recognition
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                      <p className="font-semibold">Face verification setup required.</p>
                      <p className="mt-2 text-sm text-amber-900/80">Set up face recognition before you can access the ballot.</p>
                      <div className="mt-3">
                        <Link href="/dashboard/face-setup" className="inline-flex rounded-full bg-[#1a2744] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#18223d]">
                          Set up face recognition
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
                <div className="rounded-3xl border border-slate-200 bg-[#f8f9fa] p-5">
                  <div className="flex items-center gap-3">
                    <Bell size={20} className="text-[#c9a84c]" />
                    <div>
                      <p className="font-semibold text-[#1a2744]">Vote once per position</p>
                      <p className="text-sm text-slate-500">Once you submit a position vote, it is final. Take a moment to review your choices.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-4">
              <div className="rounded-[2rem] bg-white p-6 shadow-xl border border-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">Election details</h2>
                    <p className="mt-2 text-sm text-slate-500">Everything you need to know about the current election.</p>
                  </div>
                  <Calendar size={24} className="text-[#c9a84c]" />
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl bg-[#f8f9fa] p-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Election name</p>
                    <p className="mt-3 text-base font-semibold text-[#1a2744]">{settings?.election_name || 'Not available'}</p>
                  </div>
                  <div className="rounded-3xl bg-[#f8f9fa] p-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Voting opens</p>
                    <p className="mt-3 text-base font-semibold text-[#1a2744]">
                      {settings?.voting_start ? new Date(settings.voting_start).toLocaleString() : 'TBD'}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-[#f8f9fa] p-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Voting closes</p>
                    <p className="mt-3 text-base font-semibold text-[#1a2744]">
                      {settings?.voting_end ? new Date(settings.voting_end).toLocaleString() : 'TBD'}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-[#f8f9fa] p-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Registration</p>
                    <p className="mt-3 text-base font-semibold text-[#1a2744]">
                      {settings?.allow_registration ? 'Open' : 'Closed'}
                    </p>
                  </div>
                </div>
              </div>

            </div>

            <div className="space-y-4">
              <div className="rounded-[2rem] bg-white p-6 shadow-xl border border-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">Meet the candidates</h2>
                    <p className="mt-2 text-sm text-slate-500">Top candidates from the current election.</p>
                  </div>
                  <Link href="/vote" className="text-sm font-semibold text-[#c9a84c] hover:underline flex items-center gap-1">
                    View all
                    <ChevronRight size={16} />
                  </Link>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {candidatePreview.map((candidate, index) => (
                    <motion.div
                      key={candidate.id}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                      className="rounded-3xl border border-slate-200 bg-[#f8f9fa] p-5"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-[#c9a84c] bg-[#1a2744] flex items-center justify-center text-xl font-bold text-[#c9a84c]">
                          {resolveImageUrl(candidate.profile_picture) ? (
                            <img src={resolveImageUrl(candidate.profile_picture)} alt={candidate.full_name} className="h-full w-full object-cover" />
                          ) : (
                            <span>{candidate.full_name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-base font-semibold text-[#1a2744]">{candidate.full_name}</p>
                          <p className="text-sm text-[#c9a84c]">{candidate.position_name}</p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2 text-sm text-slate-500">
                        <p>{candidate.team_name}</p>
                        <p>{candidate.party_affiliation}</p>
                        <p>{candidate.running_mate_name ? `Running mate: ${candidate.running_mate_name}` : 'No running mate listed'}</p>
                      </div>
                    </motion.div>
                  ))}
                  {candidatePreview.length === 0 && (
                    <div className="rounded-3xl border border-slate-200 bg-[#f8f9fa] p-8 text-center text-sm text-slate-500">
                      Candidate information is not available yet.
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-[#f8f9fa] p-5 text-center sm:flex-row">
                  {settings?.is_active ? (
                    <Link
                      href="/vote"
                      className="inline-flex items-center justify-center rounded-3xl bg-[#1a2744] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#18223d]"
                    >
                      Click here to view candidates and vote
                    </Link>
                  ) : (
                    <div className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-500 pointer-events-none">
                      <Clock size={18} />
                      Voting Not Open Yet
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[2rem] bg-white p-6 shadow-xl border border-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">Member summary</h2>
                  <User size={24} className="text-[#c9a84c]" />
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl bg-[#f8f9fa] p-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Name</p>
                    <p className="mt-3 text-base font-semibold text-[#1a2744]">{user?.full_name || user?.name || 'Member'}</p>
                  </div>
                  <div className="rounded-3xl bg-[#f8f9fa] p-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Email</p>
                    <p className="mt-3 text-base font-semibold text-[#1a2744]">{user?.email || 'Not set'}</p>
                  </div>
                  <div className="rounded-3xl bg-[#f8f9fa] p-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Ballot goal</p>
                    <p className="mt-3 text-base font-semibold text-[#1a2744]">Cast votes for all positions</p>
                  </div>
                  <div className="rounded-3xl bg-[#f8f9fa] p-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Next step</p>
                    <p className="mt-3 text-base font-semibold text-[#1a2744]">{totalVoted === 3 ? 'Review your selections' : 'Complete your ballot'}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <footer className="rounded-[2rem] bg-white p-6 text-center text-sm text-slate-500 shadow-sm border border-slate-200">
            <p>© {new Date().getFullYear()} Association of Liberians in Musanze</p>
            <p className="mt-1">
              Designed & Developed by <span className="font-semibold text-[#c9a84c]">Solomon Kamara</span>
            </p>
          </footer>
        </div>
      </div>
    </ProtectedPage>
  )
}
