'use client'

import type { Agent, Model } from '@/app/game-config'
import type { IdleAgentType } from '@/app/api/evaluate-idle/route'
import { MODELS } from '../lib/constants'
import { AgentItem } from './AgentItem'
import { ModelShopItem } from './ModelShopItem'

const ALL_MODELS = Object.values(MODELS)

function formatCost(n: number): string {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K'
  return '$' + Math.floor(n)
}

function formatPerSecond(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toFixed(1)
}

type RightPanelProps = {
  agents: Agent[]
  models: Model[]
  tokens: number
  unlockedAgentIds: Set<IdleAgentType>
  getCost: (agent: Agent) => number
  getUsersPerSecond: (agent: Agent) => number
  /** Single click — buy one. `isFirstBuy` true when count was 0. */
  onBuy: (id: IdleAgentType, isFirstBuy: boolean) => void
  /** Double click — open agent editor */
  onOpenEditor: (id: IdleAgentType) => void
}

export function RightPanel({
  agents,
  models,
  tokens,
  unlockedAgentIds,
  getCost,
  getUsersPerSecond,
  onBuy,
  onOpenEditor,
}: RightPanelProps) {
  const visibleAgents = agents.filter(
    (a) => unlockedAgentIds.has(a.id) || a.count > 0,
  )

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
      {/* Model shop */}
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
          {visibleAgents.length === 0 ? (
            <p className="text-sm" style={{ color: '#b3b3b3' }}>
              Keep earning — agents unlock as you grow.
            </p>
          ) : (
            visibleAgents.map((agent) => {
              const cost = getCost(agent)
              const canAfford = tokens >= cost
              const selectedModel = models.find((m) => m.id === agent.selectedModel)
              const modelName = selectedModel?.name ?? agent.selectedModel
              const ups = getUsersPerSecond(agent)
              const sublabel = agent.count > 0
                ? `+${formatPerSecond(ups)}/s · ${modelName}`
                : modelName

              return (
                <AgentItem
                  key={agent.id}
                  emoji={agent.emoji}
                  name={agent.name}
                  sublabel={sublabel}
                  count={agent.count}
                  canAfford={canAfford}
                  onClick={() => onBuy(agent.id, agent.count === 0)}
                  onDoubleClick={() => onOpenEditor(agent.id)}
                  className="w-full"
                />
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}
