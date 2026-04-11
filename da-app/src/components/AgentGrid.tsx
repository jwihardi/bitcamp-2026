'use client'

import { useState } from 'react'
import { useGame } from '../context/GameContext'
import { AgentCard } from './AgentCard'
import { HireAgentModal } from './HireAgentModal'

const MAX_SLOTS = 8

// Which round unlocks each slot index
const SLOT_UNLOCK_ROUND: Record<number, string> = {
  2: 'Seed',
  3: 'Seed',
  4: 'Series A',
  5: 'Series A',
  6: 'Series B',
  7: 'Series B',
}

export function AgentGrid() {
  const { state } = useGame()
  const { agents, agentSlots } = state
  const [modalOpen, setModalOpen] = useState(false)

  const slotsAvailable = agentSlots - agents.length
  const canHire = slotsAvailable > 0

  // Next round that unlocks more slots (for tooltip when disabled)
  const nextUnlockRound = Object.entries(SLOT_UNLOCK_ROUND).find(
    ([idx]) => Number(idx) >= agentSlots,
  )?.[1]

  return (
    <section>
      {/* Header row */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-800">Your Team</h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={!canHire}
          title={!canHire && nextUnlockRound ? `More slots unlock at ${nextUnlockRound}` : undefined}
          className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-semibold text-stone-950 transition-colors hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
        >
          + Add Agent
        </button>
      </div>

      {/* Agent grid */}
      {agents.length === 0 ? (
        <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-stone-300 text-sm text-stone-400">
          No agents yet — hire your first agent to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {agents.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}

      {/* Slot availability hint */}
      {agentSlots < MAX_SLOTS && (
        <p className="mt-3 text-xs text-stone-400">
          {slotsAvailable > 0
            ? `${slotsAvailable} slot${slotsAvailable !== 1 ? 's' : ''} available`
            : `All ${agentSlots} slots filled`}
          {nextUnlockRound ? ` · more unlock at ${nextUnlockRound}` : ''}
        </p>
      )}

      {/* Hire modal */}
      {modalOpen && <HireAgentModal onClose={() => setModalOpen(false)} />}
    </section>
  )
}
