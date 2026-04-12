'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CFOHealth, CFOReport, GameState } from '../lib/types'
import { useGame } from '../context/GameContext'
import { TIP_CARDS } from '../lib/constants'

type CFOApiResponse = Omit<CFOReport, 'consultedAt'>

type LocalCFOState = {
  report: CFOReport
  signature: string
  round: GameState['round']
}

function parseRetryDelayMs(message: string): number | null {
  const match = message.match(/retry in ([\d.]+)s/i)
  if (!match) return null
  const seconds = Number(match[1])
  if (Number.isNaN(seconds) || seconds <= 0) return null
  return Math.ceil(seconds * 1000)
}

const HEALTH_BG: Record<CFOHealth, string> = {
  healthy: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  critical: 'bg-red-100 text-red-800',
}

const HEALTH_RING: Record<CFOHealth, string> = {
  healthy: 'ring-emerald-200',
  warning: 'ring-amber-200',
  critical: 'ring-red-300',
}

function buildCFOPayload(state: GameState) {
  return {
    round: state.round,
    phase: state.phase,
    arr: state.arr,
    runway: state.runway,
    users: state.users,
    features: state.features,
    agentSlots: state.agentSlots,
    tickInterval: state.tickInterval,
    agents: state.agents.map((a) => ({
      name: a.name,
      role: a.role,
      score: a.qualityScore,
      tokenCount: a.tokenCount,
      isOffTask: a.isOffTask,
      hasEval: a.evalResult != null,
      evalEfficiency: a.evalResult?.tokenEfficiency ?? null,
    })),
  }
}

function buildStateSignature(state: GameState): string {
  return JSON.stringify({
    round: state.round,
    agents: state.agents.map((agent) => ({
      id: agent.id,
      role: agent.role,
      prompt: agent.prompt,
      qualityScore: agent.qualityScore,
      tokenCount: agent.tokenCount,
      modelId: agent.modelId,
      hasEval: agent.evalResult != null,
    })),
  })
}

export function CFOPanel() {
  const { state, cfoActivityVersion, enqueueTipCard, hasFiredTip } = useGame()
  const [loading, setLoading] = useState(false)
  const [local, setLocal] = useState<LocalCFOState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryAfterMs, setRetryAfterMs] = useState(0)
  const inFlightRef = useRef(false)
  const lastRefreshActivityRef = useRef(-1)
  const prevRoundRef = useRef(state.round)

  const panelDisabled =
    state.phase === 'game_over' ||
    state.phase === 'ipo' ||
    state.phase === 'prestige_shop'
  const signature = useMemo(() => buildStateSignature(state), [state])
  const stale = local == null || local.signature !== signature
  const roundAdvanced = prevRoundRef.current !== state.round
  const shouldRefreshAfterInteraction =
    stale && cfoActivityVersion > lastRefreshActivityRef.current
  const shouldAutoRefresh = roundAdvanced || shouldRefreshAfterInteraction
  const rateLimited = retryAfterMs > 0

  const refreshCFO = useCallback(async (force = false) => {
    if (panelDisabled || inFlightRef.current) return
    if (!force && rateLimited) return
    if (!force && !shouldAutoRefresh) return
    inFlightRef.current = true
    lastRefreshActivityRef.current = cfoActivityVersion
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/cfo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildCFOPayload(state)),
      })

      if (!response.ok) {
        let detail = `CFO unavailable (${response.status})`
        try {
          const data = (await response.json()) as { error?: string }
          if (data.error) detail = data.error
        } catch {
          // keep default detail
        }
        throw new Error(detail)
      }

      const data = (await response.json()) as CFOApiResponse
      if (
        !data ||
        typeof data.verdict !== 'string' ||
        !Array.isArray(data.advice) ||
        typeof data.health !== 'string' ||
        typeof data.lesson?.topic !== 'string' ||
        typeof data.lesson?.body !== 'string'
      ) {
        throw new Error('CFO response was malformed.')
      }

      const report: CFOReport = { ...data, consultedAt: state.tickCount }

      setLocal({
        report,
        signature,
        round: state.round,
      })
      setRetryAfterMs(0)
      prevRoundRef.current = state.round

      if (!hasFiredTip('first_cfo_consult')) {
        const tip = TIP_CARDS.find((t) => t.id === 'first_cfo_consult') ?? null
        enqueueTipCard(tip)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'CFO unavailable — try again.'
      const retryDelayMs = parseRetryDelayMs(message)
      if (retryDelayMs != null) {
        setRetryAfterMs(retryDelayMs)
        setError(`CFO is rate-limited. Try again in about ${Math.ceil(retryDelayMs / 1000)}s.`)
      } else {
        setError(message)
      }
    } finally {
      inFlightRef.current = false
      setLoading(false)
    }
  }, [
    cfoActivityVersion,
    enqueueTipCard,
    hasFiredTip,
    local,
    panelDisabled,
    rateLimited,
    roundAdvanced,
    shouldRefreshAfterInteraction,
    signature,
    state,
  ])

  useEffect(() => {
    if (retryAfterMs <= 0) return
    const id = window.setTimeout(() => {
      setRetryAfterMs(0)
    }, retryAfterMs)
    return () => window.clearTimeout(id)
  }, [retryAfterMs])

  useEffect(() => {
    if (panelDisabled || state.tickCount === 0) return
    if (rateLimited) return
    if (!shouldAutoRefresh) return

    const id = window.setTimeout(() => {
      void refreshCFO()
    }, local ? 900 : 1200)

    return () => window.clearTimeout(id)
  }, [local, panelDisabled, rateLimited, refreshCFO, shouldAutoRefresh, state.tickCount])

  useEffect(() => {
    prevRoundRef.current = local?.round ?? prevRoundRef.current
  }, [local])

  if (panelDisabled) return null

  const report = local?.report
  const health = report?.health
  const lastConsultedLabel = report
    ? `${Math.max(0, state.tickCount - report.consultedAt)} ticks ago`
    : 'Waiting for your first action'

  return (
    <aside
      className={`fixed bottom-4 right-4 z-30 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl ring-1 transition-all ${
        health ? HEALTH_RING[health] : 'ring-stone-100'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-stone-500">
            Live Advisor
          </p>
          <h2 className="mt-1 text-lg font-semibold text-stone-900">AI CFO</h2>
          <p className="mt-0.5 text-[11px] text-stone-500">
            {loading ? 'Updating advice…' : lastConsultedLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refreshCFO(true)}
            disabled={loading || rateLimited}
            className="rounded-xl border border-stone-300 px-3 py-1.5 text-[11px] font-semibold text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400"
          >
            {loading ? 'Refreshing…' : rateLimited ? 'Cooling down…' : 'Refresh'}
          </button>
          {health && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${HEALTH_BG[health]}`}
            >
              {health}
            </span>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">
          {error}
        </p>
      )}

      {!report && !error && (
        <p className="mt-4 text-[12px] text-stone-500">
          Your CFO stays visible, but only sends a new message after you hire, edit, or
          otherwise meaningfully change the company.
        </p>
      )}

      {report && (
        <div className={`mt-4 space-y-4 ${stale ? 'opacity-60' : ''}`}>
          {stale && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
              Things have changed. The CFO will post a fresh message after your next action,
              or you can refresh manually.
            </p>
          )}

          <p className="text-sm font-medium text-stone-800">{report.verdict}</p>

          <div className="space-y-2">
            {report.advice.map((tip, idx) => (
              <div
                key={`${idx}-${tip.slice(0, 16)}`}
                className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-[12px] text-stone-700"
              >
                <span className="mr-2 font-semibold text-stone-900">{idx + 1}.</span>
                {tip}
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-stone-200 bg-amber-50/60 px-3 py-3">
            <div className="flex items-center gap-2">
              <span className="text-base">💡</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                {report.lesson.topic}
              </span>
            </div>
            <p className="mt-2 text-[12px] leading-snug text-stone-700">
              {report.lesson.body}
            </p>
          </div>
        </div>
      )}
    </aside>
  )
}
