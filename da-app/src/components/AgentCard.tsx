'use client'

import { useState } from 'react'
import type { Agent, AgentIcon } from '../lib/types'
import { useGame } from '../context/GameContext'
import {
  AGENT_ICONS,
  DEFAULT_MODEL_ID,
  MODELS,
  ROLE_COLORS,
} from '../lib/constants'
import { getAgentTickCost, hasActivePrompt } from '../lib/tickEngine'
import { AgentEditModal } from './AgentEditModal'

type Props = { agent: Agent }

function scoreBadgeClass(score: number) {
  if (score >= 90) return 'bg-purple-100 text-purple-800'
  if (score >= 70) return 'bg-teal-100 text-teal-800'
  if (score >= 40) return 'bg-amber-100 text-amber-800'
  return 'bg-red-100 text-red-800'
}

function efficiencyBadgeClass(efficiency: number) {
  if (efficiency > 50) return 'bg-purple-100 text-purple-800'
  if (efficiency >= 25) return 'bg-teal-100 text-teal-800'
  if (efficiency >= 10) return 'bg-amber-100 text-amber-800'
  return 'bg-red-100 text-red-800'
}

export function AgentCard({ agent }: Props) {
  const { dispatch, notifyCFOActivity } = useGame()
  const [editOpen, setEditOpen] = useState(false)
  const [confirmFire, setConfirmFire] = useState(false)

  function handleNameChange(value: string) {
    dispatch({ type: 'UPDATE_AGENT_NAME', agentId: agent.id, name: value })
  }

  function handleIconChange(icon: AgentIcon) {
    dispatch({ type: 'UPDATE_AGENT_ICON', agentId: agent.id, icon })
  }

  function handleFire() {
    dispatch({ type: 'FIRE_AGENT', agentId: agent.id })
    notifyCFOActivity()
    setConfirmFire(false)
  }

  const roleName = agent.role.charAt(0).toUpperCase() + agent.role.slice(1)
  const hasPrompt = agent.prompt.trim().length > 0
  const model = MODELS[agent.modelId] ?? MODELS[DEFAULT_MODEL_ID]
  const effectiveTokens = agent.evalResult?.estimatedTokensPerTick ?? agent.tokenCount
  const perTickCost = getAgentTickCost(agent)
  const overCap = agent.qualityScore > model.qualityCap
  const evalCached = agent.evalResult != null
  const promptActive = hasActivePrompt(agent)

  return (
    <>
      <article
        className={`rounded-2xl border bg-white p-4 shadow-sm transition-colors ${
          agent.isOffTask ? 'border-red-300' : 'border-stone-200'
        }`}
      >
        {/* Top row: icon picker + name + role badge */}
        <div className="flex items-start gap-3">
          {/* Icon picker */}
          <div className="flex flex-wrap gap-1">
            {(Object.entries(AGENT_ICONS) as [AgentIcon, string][]).map(([key, emoji]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleIconChange(key)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-base transition-colors ${
                  agent.icon === key
                    ? 'bg-stone-200 ring-2 ring-amber-400'
                    : 'bg-stone-100 hover:bg-stone-200'
                }`}
                aria-label={key}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Name + role */}
          <div className="min-w-0 flex-1">
            <input
              type="text"
              value={agent.name}
              onChange={e => handleNameChange(e.target.value)}
              className="w-full truncate rounded-lg bg-transparent px-1 py-0.5 text-sm font-semibold text-stone-800 outline-none ring-stone-300 transition hover:bg-stone-100 focus:bg-stone-100 focus:ring-1"
              placeholder="Agent name"
            />
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[agent.role]}`}>
              {roleName}
            </span>
          </div>
        </div>

        {/* Score + token row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${scoreBadgeClass(agent.qualityScore)}`}>
            {agent.qualityScore}/100
            {agent.driftRisk && ' ⚠'}
            {evalCached && ' ✦'}
            {overCap && ` ↕${model.qualityCap}`}
          </span>
          {agent.evalResult && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${efficiencyBadgeClass(agent.evalResult.tokenEfficiency)}`}
              title="Token efficiency: revenue / tokens per tick"
            >
              {agent.evalResult.tokenEfficiency.toFixed(1)} $/tok
            </span>
          )}
          <span
            className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600"
            title={`${model.name} — $${model.costPerToken}/token · cap ${model.qualityCap}`}
          >
            {model.name}
          </span>
          <span className="text-xs text-stone-400">
            {agent.tokenCount} tokens
          </span>
          {!hasPrompt && (
            <span className="text-xs text-red-400">No prompt yet</span>
          )}
        </div>

        {/* Per-tick cost line */}
        <p className="mt-1 text-[11px] text-stone-400">
          ~${perTickCost.toLocaleString()}/tick
          <span className="text-stone-500">
            {promptActive
              ? ` (${effectiveTokens} tok × $${model.costPerToken}${agent.evalResult ? ' · AI est' : ''} + salary)`
              : ' (idle: no prompt)'}
          </span>
        </p>

        {/* Off-task banner */}
        {agent.isOffTask && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600">
            {agent.name} went off-task this tick — no output
          </p>
        )}

        {/* Actions row */}
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="rounded-xl bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-200"
          >
            Edit prompt
          </button>

          {!confirmFire ? (
            <button
              type="button"
              onClick={() => setConfirmFire(true)}
              className="rounded-xl px-3 py-1.5 text-xs text-stone-400 transition-colors hover:text-red-500"
            >
              Fire
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500">Sure?</span>
              <button
                type="button"
                onClick={handleFire}
                className="rounded-xl bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200"
              >
                Yes, fire
              </button>
              <button
                type="button"
                onClick={() => setConfirmFire(false)}
                className="rounded-xl px-2 py-1.5 text-xs text-stone-400 hover:text-stone-600"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </article>

      {editOpen && <AgentEditModal agent={agent} onClose={() => setEditOpen(false)} />}
    </>
  )
}
