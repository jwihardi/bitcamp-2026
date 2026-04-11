'use client'

import { useState } from 'react'
import type { AgentIcon, AgentRole, ModelId } from '../lib/types'
import { useGame } from '../context/GameContext'
import {
  AGENT_ICONS,
  AGENT_SALARY,
  DEFAULT_MODEL_ID,
  MODELS,
  ROLE_COLORS,
} from '../lib/constants'

type Props = { onClose: () => void }

const ROLES: AgentRole[] = ['sales', 'marketing', 'engineering', 'finance']

export function HireAgentModal({ onClose }: Props) {
  const { state, dispatch, notifyCFOActivity } = useGame()
  const [role, setRole] = useState<AgentRole>('sales')
  const [icon, setIcon] = useState<AgentIcon>('robot')
  const [name, setName] = useState('')
  const [modelId, setModelId] = useState<ModelId>(DEFAULT_MODEL_ID)

  const unlockedModels = state.upgrades.unlockedModelIds
    .map((id) => MODELS[id])
    .filter((m): m is NonNullable<typeof m> => Boolean(m))

  const selectedModel = MODELS[modelId] ?? MODELS[DEFAULT_MODEL_ID]
  const idleBurn = AGENT_SALARY[role]

  function handleHire(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    dispatch({
      type: 'HIRE_AGENT',
      agent: {
        id: crypto.randomUUID(),
        name: name.trim(),
        icon,
        role,
        prompt: '',
        tokenCount: 0,
        qualityScore: 0,
        driftRisk: false,
        isOffTask: false,
        modelId,
        evalResult: null,
        evalPromptSnapshot: null,
      },
    })

    notifyCFOActivity()

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-950/70"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-stone-950 p-6 text-stone-50 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Hire an agent</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-stone-400 transition-colors hover:text-stone-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleHire} className="mt-6 space-y-5">
          {/* Role */}
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-stone-400">Role</p>
            <div className="flex flex-wrap gap-2">
              {ROLES.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    role === r
                      ? ROLE_COLORS[r]
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
                  }`}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Icon */}
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-stone-400">Icon</p>
            <div className="flex gap-2">
              {(Object.entries(AGENT_ICONS) as [AgentIcon, string][]).map(([key, emoji]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIcon(key)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-colors ${
                    icon === key
                      ? 'bg-stone-600 ring-2 ring-amber-300'
                      : 'bg-stone-800 hover:bg-stone-700'
                  }`}
                  aria-label={key}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-stone-400">Name</p>
            <input
              type="text"
              placeholder="Name your agent"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
              className="w-full rounded-xl bg-stone-800 px-4 py-2 text-sm text-stone-100 placeholder-stone-500 outline-none ring-1 ring-stone-700 transition focus:ring-amber-300"
            />
          </div>

          {/* Model */}
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-stone-400">Model</p>
            <div className="flex flex-col gap-2">
              {unlockedModels.map((m) => {
                const selected = modelId === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModelId(m.id)}
                    className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                      selected
                        ? 'border-amber-300 bg-stone-800'
                        : 'border-stone-700 bg-stone-900 hover:border-stone-500'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-100">{m.name}</p>
                      <p className="truncate text-xs text-stone-400">{m.tagline}</p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-stone-300">
                      <p>${m.costPerToken}/token</p>
                      <p className="text-stone-500">Cap {m.qualityCap}</p>
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-[11px] leading-snug text-stone-500">
              Active prompts burn{' '}
              <span className="text-stone-300">salary + tokens × ${selectedModel.costPerToken}</span>.
              Empty prompts cost $0/tick. A filled {role} agent starts around ${idleBurn.toLocaleString()}/tick plus model compute.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm text-stone-400 transition-colors hover:text-stone-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="rounded-xl bg-amber-300 px-5 py-2 text-sm font-semibold text-stone-950 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
            >
              Hire
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
