'use client'
import React, { useEffect, useState } from 'react'
import { notify } from '../../lib/notifications'
import api from '../../lib/api'
import ProtectedPage from '../components/ProtectedPage'
import { notify } from '../../lib/notifications'

type Position = any
type Candidate = any

export default function VoteWizard() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/api/positions'),
      api.get('/api/candidates'),
      api.get('/api/teams'),
      api.get('/api/election/settings'),
    ])
      .then(([posRes, candRes, teamRes, settingsRes]) => {
        const posList = posRes.data || []
        posList.sort((a: any, b: any) =>
          a.is_combined === b.is_combined ? a.title.localeCompare(b.title) : a.is_combined ? -1 : 1
        )
        setPositions(posList)
        setCandidates(candRes.data || [])
        setTeams(teamRes.data || [])
        setSettings(settingsRes.data)
      })
      .catch(() => {
        notify.error('Unable to load voting data')
        setPositions([])
        setCandidates([])
        setSettings(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const resolveImageUrl = (image: string | null | undefined) => {
    if (!image) {
      return undefined
    }

    const rawImgPath = String(image).trim()
    if (!rawImgPath) {
      return undefined
    }

    if (/^https?:\/\//i.test(rawImgPath)) {
      return rawImgPath
    }

    let apiBase = ((process.env.NEXT_PUBLIC_API_URL || api.defaults.baseURL || '') as string).replace(/\/\/+$/g, '')
    if (apiBase && apiBase.startsWith('http://') && !apiBase.includes('localhost')) {
      apiBase = apiBase.replace(/^http:/, 'https:')
    }

    return apiBase ? `${apiBase}${rawImgPath}` : rawImgPath
  }

  const getCandidateName = (candidate: any) => {
    const name =
      candidate?.full_name ||
      candidate?.name ||
      candidate?.candidate_name ||
      candidate?.user_name ||
      candidate?.user?.full_name ||
      candidate?.profile?.full_name ||
      (candidate?.first_name ? `${candidate.first_name} ${candidate.last_name || ''}` : null)

    const trimmed = typeof name === 'string' ? name.trim() : ''
    return trimmed || 'Registered Candidate'
  }

  const getRunningMateName = (candidate: any) => {
    const name =
      candidate?.running_mate_name ||
      candidate?.running_mate?.name ||
      candidate?.running_mate?.full_name

    const trimmed = typeof name === 'string' ? name.trim() : ''
    return trimmed || 'No Running Mate Specified'
  }

  const getCandidateImage = (candidate: any) => {
    const rawImgPath =
      candidate?.profile_picture_url ||
      candidate?.photo_url ||
      candidate?.image_url ||
      candidate?.profile_picture ||
      candidate?.avatar ||
      candidate?.picture ||
      candidate?.profile?.picture ||
      candidate?.profile?.image_url ||
      null
    return resolveImageUrl(rawImgPath)
  }

  const getRunningMateImage = (candidate: any) => {
    const rawImgPath =
      candidate?.running_mate_picture_url ||
      candidate?.running_mate_picture ||
      candidate?.running_mate?.picture ||
      candidate?.running_mate?.avatar ||
      candidate?.running_mate?.image_url ||
      candidate?.running_mate?.profile_picture ||
      null
    return resolveImageUrl(rawImgPath)
  }

  const isElectionActive = (value: unknown) =>
    value === true || String(value).toLowerCase() === 'true'

  const electionOpen = isElectionActive(settings?.is_active)

  const getTeamCandidates = (team: any) => {
    if (!team) {
      return []
    }

    const nestedCandidates =
      Array.isArray(team.candidates) ? team.candidates :
      Array.isArray(team?.data?.candidates) ? team.data.candidates :
      Array.isArray(team?.team?.candidates) ? team.team.candidates :
      null

    if (Array.isArray(nestedCandidates)) {
      return nestedCandidates
    }

    return candidates.filter((c: any) => String(c.team_id) === String(team.id))
  }

  const matchesPosition = (candidate: any, terms: string[]) => {
    const label = String(
      candidate?.position_title ||
      candidate?.position_name ||
      candidate?.title ||
      candidate?.name ||
      ''
    ).toLowerCase()
    return terms.some((term) => label.includes(term))
  }

  const teamsWithCandidates = teams.map((team: any) => {
    const teamCandidates = getTeamCandidates(team)
    const president = teamCandidates.find((c: any) => matchesPosition(c, ['president_vp', 'president'])) || teamCandidates.find((c: any) => c.is_combined)
    const secretary = teamCandidates.find((c: any) => matchesPosition(c, ['general_secretary', 'secretary']))
    const financial = teamCandidates.find((c: any) => matchesPosition(c, ['financial_secretary', 'financial']))
    return { team, president, secretary, financial }
  })

  const submitVoteForCandidate = async (candidate: any) => {
    if (!candidate) return

    setSubmitting(true)
    try {
      const payload = {
        candidate_id: String(candidate.id),
        position_id: String(candidate.position_id),
        team_id: String(candidate.team_id),
      }

      const res = await api.post('/api/votes', payload)
      if (res && res.status === 200) {
        notify.success('Vote recorded')
        // disable further voting for this position locally
        setSelected((s) => ({ ...s, [String(candidate.position_id)]: String(candidate.id) }))
      } else {
        notify.error('Unexpected response when recording vote')
      }
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.response?.data || 'Failed to cast vote'
      notify.error(String(message))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ProtectedPage>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-white p-8 shadow-xl border border-slate-200">
          <div className="mb-6">
            <p className="text-sm uppercase tracking-[0.3em] text-[#c9a84c]">Voting ballot</p>
            <h1 className="mt-3 text-3xl font-semibold text-[#1a2744]">Single-page ballot</h1>
            <p className="mt-2 text-sm text-slate-500">Scroll to review each team and cast votes directly from the single-page ballot.</p>
          </div>

          <div className="space-y-8">
            {loading ? (
              <div className="rounded-3xl border border-slate-200 bg-[#f8f9fa] p-6 text-center text-sm text-slate-500">Loading ballot…</div>
            ) : teamsWithCandidates.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-[#f8f9fa] p-6 text-center text-sm text-slate-500">No teams configured yet.</div>
            ) : (
              teamsWithCandidates.map(({ team, president, secretary, financial }: any) => (
                <div key={team.id} className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
                  <div className="bg-[#1f3c88] px-5 py-3 text-center text-sm font-semibold uppercase tracking-[0.2em] text-white">
                    Team: {team.name}
                  </div>
                  <div className="p-6 space-y-6">
                    {/* President & Vice President combined ticket */}
                    <div className="rounded-[1.25rem] border border-[#c9a84c]/20 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">President & Vice President</p>
                      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-[#c9a84c] bg-slate-100">
                              {getCandidateImage(president) ? (
                                <img
                                  src={getCandidateImage(president)}
                                  alt={getCandidateName(president)}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-[#e2e8f0] text-xl font-bold text-[#1f3c88]">
                                  {getCandidateName(president).charAt(0)}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-lg font-semibold text-[#1a2744]">{getCandidateName(president)}</p>
                              <p className="text-sm text-slate-500">{president?.party_affiliation || ''}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div className="h-20 w-20 overflow-hidden rounded-full border border-slate-300 bg-slate-100">
                              {getRunningMateImage(president) ? (
                                <img
                                  src={getRunningMateImage(president)}
                                  alt={getRunningMateName(president)}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-[#e2e8f0] text-xl font-bold text-[#1f3c88]">
                                  {getRunningMateName(president).charAt(0)}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-lg font-semibold text-[#1a2744]">{getRunningMateName(president)}</p>
                              <p className="text-sm text-slate-500">{president?.running_mate_party || ''}</p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 md:mt-0 md:flex md:items-center">
                          <button
                            onClick={() => submitVoteForCandidate(president)}
                            disabled={submitting || !president || !electionOpen || !!selected[String(president?.position_id)]}
                            className={`ml-auto rounded-3xl px-6 py-3 text-sm font-semibold text-white transition-colors ${
                              electionOpen
                                ? 'bg-blue-700 hover:bg-blue-800 cursor-pointer'
                                : 'bg-purple-200 cursor-not-allowed text-purple-400'
                            } disabled:opacity-60`}
                          >
                            Vote Ticket
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Secretary */}
                    <div className="flex items-center justify-between rounded-[1rem] border border-slate-200 bg-[#f8f9fa] p-4">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 overflow-hidden rounded-full bg-slate-100">
                          {getCandidateImage(secretary) ? (
                            <img
                              src={getCandidateImage(secretary)}
                              alt={getCandidateName(secretary)}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-[#e2e8f0] text-lg font-bold text-[#1f3c88]">
                              {getCandidateName(secretary).charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-[#1a2744]">{getCandidateName(secretary)}</p>
                          <p className="text-sm text-slate-500">Secretary</p>
                        </div>
                      </div>
                      <div>
                        <button
                          onClick={() => submitVoteForCandidate(secretary)}
                          disabled={submitting || !secretary || !electionOpen || !!selected[String(secretary?.position_id)]}
                          className={`rounded-3xl px-4 py-2 text-sm font-semibold text-white transition-colors ${
                            electionOpen
                              ? 'bg-blue-700 hover:bg-blue-800 cursor-pointer'
                              : 'bg-purple-200 cursor-not-allowed text-purple-400'
                          } disabled:opacity-60`}
                        >
                          Vote
                        </button>
                      </div>
                    </div>

                    {/* Financial Secretary */}
                    <div className="flex items-center justify-between rounded-[1rem] border border-slate-200 bg-[#f8f9fa] p-4">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 overflow-hidden rounded-full bg-slate-100">
                          {getCandidateImage(financial) ? (
                            <img
                              src={getCandidateImage(financial)}
                              alt={getCandidateName(financial)}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-[#e2e8f0] text-lg font-bold text-[#1f3c88]">
                              {getCandidateName(financial).charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-[#1a2744]">{getCandidateName(financial)}</p>
                          <p className="text-sm text-slate-500">Financial Secretary</p>
                        </div>
                      </div>
                      <div>
                        <button
                          onClick={() => submitVoteForCandidate(financial)}
                          disabled={submitting || !financial || !electionOpen || !!selected[String(financial?.position_id)]}
                          className={`rounded-3xl px-4 py-2 text-sm font-semibold text-white transition-colors ${
                            electionOpen
                              ? 'bg-blue-700 hover:bg-blue-800 cursor-pointer'
                              : 'bg-purple-200 cursor-not-allowed text-purple-400'
                          } disabled:opacity-60`}
                        >
                          Vote
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </ProtectedPage>
  )
}
