'use client'

import { useGame } from '../context/GameContext'
import { ROUND_ORDER } from '../lib/constants'
import { AgentCard } from './AgentCard'
import { EmptySlot } from './EmptySlot'

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

  return (
    <section>
      <h2>Agents</h2>
      <div>
        {Array.from({ length: MAX_SLOTS }, (_, i) => {
          const agent = agents[i]

          if (agent) {
            return <AgentCard key={agent.id} agent={agent} />
          }

          if (i < agentSlots) {
            return <EmptySlot key={`empty-${i}`} />
          }

          // Locked slot
          return (
            <div key={`locked-${i}`}>
              <span>🔒</span>
              <span>Unlocks at {SLOT_UNLOCK_ROUND[i] ?? 'Series B'}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
