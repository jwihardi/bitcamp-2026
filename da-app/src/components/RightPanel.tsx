'use client'

import { useGame } from '../context/GameContext'
import { MODELS } from '../lib/constants'
import { AgentItem } from './AgentItem'
import { ModelShopItem } from './ModelShopItem'
import { Text } from './Text'

const ALL_MODELS = Object.values(MODELS)

export function RightPanel() {
  const { state } = useGame()
  const { agents } = state

  return (
    <div
      className="flex flex-col shrink-0 h-full"
      style={{
        minWidth: 360,
        width: 360,
        background: 'white',
        borderLeft: '1px solid #d9d9d9',
      }}
    >
      {/* Shop */}
      <section className="flex flex-col gap-2 items-start px-4 py-3 w-full">
        <p
          style={{
            fontFamily: 'var(--sds-typography-family-serif, "Noto Serif", serif)',
            fontSize: 24,
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: '-0.48px',
            color: 'black',
          }}
        >
          Shop
        </p>
        <div className="flex gap-2 items-center justify-center overflow-hidden py-1 w-full">
          {ALL_MODELS.map((model) => (
            <ModelShopItem key={model.id} model={model} />
          ))}
        </div>
      </section>

      {/* Agents */}
      <section className="flex flex-col gap-2 items-start px-4 pb-4 pt-3 w-full flex-1 overflow-y-auto">
        <p
          style={{
            fontFamily: 'var(--sds-typography-family-serif, "Noto Serif", serif)',
            fontSize: 24,
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: '-0.48px',
            color: 'black',
          }}
        >
          Agents
        </p>
        <div className="flex flex-col gap-3 py-1 w-full">
          {agents.length === 0 ? (
            <Text size="sm" style={{ color: '#b3b3b3' }}>No agents hired yet.</Text>
          ) : (
            agents.map((agent) => (
              <AgentItem key={agent.id} agent={agent} className="w-full" />
            ))
          )}
        </div>
      </section>
    </div>
  )
}
