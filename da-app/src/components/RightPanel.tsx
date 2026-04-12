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

  const teaserAgent = agents.find((a) => !unlockedAgentIds.has(a.id) && a.count === 0) ?? null

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
          {visibleAgents.length === 0 && !teaserAgent && (
            <p className="text-sm" style={{ color: '#b3b3b3' }}>
              Keep earning — agents unlock as you grow.
            </p>
          )}

          {visibleAgents.map((agent) => {
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
          })}

          {/* Teaser — next locked agent */}
          {teaserAgent && (
            <div
              className="relative flex h-[72px] items-center justify-between overflow-hidden rounded-[8px] pl-20 pr-2 w-full"
              style={{
                background: 'white',
                border: '1px dashed #d9d9d9',
                boxShadow: '0px 2px 0px 0px #d9d9d9',
              }}
            >
              {/* Progress bar at bottom */}
              <div
                className="absolute bottom-0 left-0 right-0 h-[3px]"
                style={{ background: '#f0f0f0' }}
              >
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (tokens / teaserAgent.unlockThreshold) * 100)}%`,
                    background: 'linear-gradient(to right, #d9d9d9, #b3b3b3)',
                  }}
                />
              </div>

              {/* Blurred emoji overflowing left */}
              <div
                className="absolute size-32 pointer-events-none select-none flex items-center justify-center text-6xl leading-none"
                style={{
                  left: -30,
                  top: -24,
                  filter: 'blur(5px) grayscale(0.8)',
                  opacity: 0.4,
                }}
                aria-hidden
              >
                {teaserAgent.emoji}
              </div>

              {/* Name + unlock label */}
              <div className="flex flex-1 flex-col justify-end gap-1 pb-2 pl-8 pr-4 min-w-0 h-full">
                <p
                  className="leading-tight truncate"
                  style={{
                    fontFamily: 'var(--sds-typography-family-serif, "Noto Serif", serif)',
                    fontSize: 24,
                    fontWeight: 600,
                    letterSpacing: '-0.48px',
                    color: '#b3b3b3',
                  }}
                >
                  ???
                </p>
                <p
                  className="text-xs"
                  style={{ color: '#b3b3b3' }}
                >
                  Unlocks at {formatCost(teaserAgent.unlockThreshold)}
                </p>
              </div>

              {/* Lock icon watermark */}
              <p
                className="shrink-0 leading-tight"
                style={{
                  fontSize: 32,
                  color: 'rgba(179, 179, 179, 0.35)',
                }}
              >
                🔒
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
