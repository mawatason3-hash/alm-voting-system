'use client'

import React, { useEffect, useMemo, useState } from 'react'
import api from '../../../lib/api'
import Link from 'next/link'

interface VoteChoice {
  candidate_name: string
  position: string
  team_name: string
  running_mate?: string | null
  voted_at: string
  voter_name?: string
  voter_email?: string
}

interface VoterChoices {
  voter_name: string
  voter_email: string
  choices: VoteChoice[]
}

function sanitizeText(value: unknown) {
  return String(value ?? '').trim()
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminVoteChoicesPage() {
  const [groupedChoices, setGroupedChoices] = useState<VoterChoices[]>([])
  const [allChoices, setAllChoices] = useState<VoteChoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [positionFilter, setPositionFilter] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError('')
      try {
        const [groupRes, allRes] = await Promise.all([
          api.get('/api/admin/vote-choices/by-voter'),
          api.get('/api/admin/vote-choices'),
        ])

        setGroupedChoices(Array.isArray(groupRes.data) ? groupRes.data : [])
        setAllChoices(Array.isArray(allRes.data) ? allRes.data : [])
      } catch (err: any) {
        console.error('Failed to load vote choices', err)
        setError(err?.response?.data?.detail || err?.message || 'Unable to load vote choices')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const flatChoices = useMemo(() => {
    return groupedChoices.flatMap((voter) =>
      voter.choices.map((choice) => ({
        ...choice,
        voter_name: voter.voter_name,
        voter_email: voter.voter_email,
      }))
    )
  }, [groupedChoices])

  const uniquePositions = useMemo(() => {
    return new Set(flatChoices.map((item) => sanitizeText(item.position))).size
  }, [flatChoices])

  const filteredGroupedChoices = useMemo(() => {
    const terms = search
      .split(/\s+/)
      .map((term) => term.trim().toLowerCase())
      .filter(Boolean)

    return groupedChoices
      .map((voter) => {
        const filteredChoices = voter.choices.filter((choice) => {
          const matchesPosition = positionFilter
            ? sanitizeText(choice.position).toLowerCase().includes(positionFilter.toLowerCase())
            : true
          const matchesTeam = teamFilter
            ? sanitizeText(choice.team_name).toLowerCase().includes(teamFilter.toLowerCase())
            : true
          const votedAt = new Date(choice.voted_at)
          const afterFrom = dateFrom ? votedAt >= new Date(dateFrom) : true
          const beforeTo = dateTo ? votedAt <= new Date(dateTo) : true
          const matchesSearch = terms.length
            ? terms.every((term) =>
                sanitizeText(voter.voter_name).toLowerCase().includes(term) ||
                sanitizeText(voter.voter_email).toLowerCase().includes(term) ||
                sanitizeText(choice.position).toLowerCase().includes(term) ||
                sanitizeText(choice.candidate_name).toLowerCase().includes(term) ||
                sanitizeText(choice.team_name).toLowerCase().includes(term)
              )
            : true

          return matchesPosition && matchesTeam && afterFrom && beforeTo && matchesSearch
        })

        return { ...voter, choices: filteredChoices }
      })
      .filter((voter) => voter.choices.length > 0)
  }, [groupedChoices, search, positionFilter, teamFilter, dateFrom, dateTo])

  const totalVoters = filteredGroupedChoices.length
  const totalChoices = filteredGroupedChoices.reduce((sum, voter) => sum + voter.choices.length, 0)
  const positionsCovered = new Set(filteredGroupedChoices.flatMap((voter) => voter.choices.map((choice) => sanitizeText(choice.position)))).size

  const exportAllCSV = () => {
    const rows = [
      ['Voter Name', 'Voter Email', 'Position', 'Candidate Name', 'Team', 'Running Mate', 'Voted At'],
      ...allChoices.map((choice) => [
        choice.voter_name || '',
        choice.voter_email || '',
        choice.position || '',
        choice.candidate_name || '',
        choice.team_name || '',
        choice.running_mate || '',
        formatDate(choice.voted_at),
      ]),
    ]

    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `alm-vote-choices-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const printVoterChoices = (voter: VoterChoices) => {
    const printContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Vote Record — ${voter.voter_name}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #000; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
    .org-name { font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
    .doc-title { font-size: 14px; color: #333; margin-top: 8px; }
    .voter-info { background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
    .voter-name { font-size: 20px; font-weight: bold; }
    .voter-email { color: #555; font-size: 13px; }
    .choice-row { border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .position-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 4px; }
    .candidate-name { font-size: 16px; font-weight: bold; }
    .team-name { font-size: 13px; color: #555; }
    .running-mate { font-size: 12px; color: #777; margin-top: 4px; }
    .footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 16px; font-size: 11px; color: #888; text-align: center; }
    .confidential { color: #c00; font-weight: bold; font-size: 12px; text-align: center; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="org-name">Association of Liberians in Musanze</div>
    <div class="doc-title">Official Vote Record — ALM General Elections</div>
  </div>
  <div class="confidential">CONFIDENTIAL — OFFICIAL ELECTION DOCUMENT</div>
  <div class="voter-info">
    <div class="voter-name">${voter.voter_name}</div>
    <div class="voter-email">${voter.voter_email}</div>
  </div>
  <h3 style="margin-bottom: 16px;">Vote Choices:</h3>
  ${voter.choices
      .map((choice) => `
        <div class="choice-row">
          <div class="position-label">${choice.position}</div>
          <div class="candidate-name">${choice.candidate_name}</div>
          <div class="team-name">${choice.team_name}</div>
          ${choice.running_mate ? `<div class="running-mate">Running mate: ${choice.running_mate}</div>` : ''}
          <div style="margin-top: 8px; font-size: 11px; color: #666;">Voted at: ${formatDate(choice.voted_at)}</div>
        </div>
      `)
      .join('')}
  <div class="footer">
    Generated on: ${new Date().toLocaleString()}<br/>
    ALM Voting System — Official Record<br/>
    This document is confidential and intended for authorized use only.
  </div>
</body>
</html>`

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 500)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-6 rounded-[2rem] border border-white/10 bg-gradient-to-br from-navy to-slate-900 p-8 shadow-2xl">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Vote Choices</p>
            <h1 className="mt-3 text-4xl font-semibold text-white">Recorded ballot selections</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Review every vote choice recorded by members, filter by voter, position or team, and print or export official election records.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Total voters who voted</p>
              <p className="mt-3 text-4xl font-semibold text-white">{totalVoters}</p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Total vote choices</p>
              <p className="mt-3 text-4xl font-semibold text-white">{totalChoices}</p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Positions covered</p>
              <p className="mt-3 text-4xl font-semibold text-white">{positionsCovered}</p>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 xl:grid-cols-[1.5fr_0.8fr]">
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-xl">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Search</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search voter, email, candidate, team"
                  className="w-full rounded-3xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-gold"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Filter position</span>
                <input
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                  placeholder="Position name"
                  className="w-full rounded-3xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-gold"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Filter team</span>
                <input
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  placeholder="Team name"
                  className="w-full rounded-3xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-gold"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-500">From</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-3xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-gold"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-500">To</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-3xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-gold"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-xl">
            <h2 className="text-sm uppercase tracking-[0.3em] text-slate-500">Actions</h2>
            <button
              onClick={exportAllCSV}
              className="mt-4 inline-flex items-center justify-center rounded-3xl bg-gold px-5 py-3 text-sm font-semibold text-navy shadow-xl transition hover:bg-amber-400"
            >
              Export All as CSV
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-[2rem] border border-red-500/20 bg-red-500/5 p-6 text-red-200">{error}</div>
        ) : loading ? (
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 text-slate-400">Loading vote history…</div>
        ) : filteredGroupedChoices.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-white/10 bg-slate-900/80 p-10 text-center text-slate-400">
            No vote choices match the selected filters. Adjust your search or clear filters.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-xl overflow-hidden">
              <div className="grid gap-4 text-sm text-slate-300 sm:grid-cols-[1fr_auto]">
                <p>{filteredGroupedChoices.length} voters found across {totalChoices} recorded choices.</p>
                <button
                  onClick={() => setExpandedEmail(null)}
                  className="rounded-3xl border border-white/10 bg-white/5 px-4 py-2 text-slate-200 transition hover:bg-white/10"
                >
                  Collapse all
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredGroupedChoices.map((voter) => (
                <div key={voter.voter_email} className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-xl">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Voter name</p>
                      <h2 className="mt-2 text-xl font-semibold text-white">{voter.voter_name}</h2>
                      <p className="text-sm text-slate-400">{voter.voter_email}</p>
                      <p className="mt-3 text-sm text-slate-300">{voter.choices.length} choice{voter.choices.length === 1 ? '' : 's'} recorded</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => setExpandedEmail(expandedEmail === voter.voter_email ? null : voter.voter_email)}
                        className="rounded-3xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                      >
                        {expandedEmail === voter.voter_email ? 'Hide' : 'View'}
                      </button>
                      <button
                        onClick={() => printVoterChoices(voter)}
                        className="rounded-3xl bg-gold px-5 py-3 text-sm font-semibold text-navy transition hover:bg-amber-400"
                      >
                        Print
                      </button>
                    </div>
                  </div>

                  {expandedEmail === voter.voter_email && (
                    <div className="mt-6 space-y-4 rounded-[1.75rem] border border-white/10 bg-slate-950/90 p-6">
                      {voter.choices.map((choice, index) => (
                        <div key={`${choice.position}-${index}`} className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{choice.position}</p>
                              <h3 className="mt-2 text-lg font-semibold text-white">{choice.candidate_name}</h3>
                              <p className="text-sm text-slate-400">{choice.team_name}</p>
                            </div>
                            <div className="text-right text-sm text-slate-400">
                              <p>{formatDate(choice.voted_at)}</p>
                            </div>
                          </div>
                          {choice.running_mate ? (
                            <div className="mt-4 rounded-3xl bg-slate-950 p-4 text-sm text-slate-300">
                              <strong className="text-slate-100">Running mate:</strong> {choice.running_mate}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
