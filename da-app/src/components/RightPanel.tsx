'use client'

import type { Agent, Model } from '@/app/game-config'
import type { IdleAgentType } from '@/app/api/evaluate-idle/route'
import { MODELS } from '../lib/constants'
import { IdleAgentItem } from './IdleAgentItem'
import { ModelShopItem } from './ModelShopItem'

const ALL_MODELS = Object.values(MODELS)

function formatCost(n: number): string {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K'
  return '$' + Math.floor(n)
}

type RightPanelProps = {
  agents: Agent[]
  models: Model[]
  tokens: number
  unlockedAgentIds: Set<IdleAgentType>
  getCost: (agent: Agent) => number
  getAgentQuality: (agent: Agent) => number
  getUsersPerSecond: (agent: Agent) => number
  evaluatingAgentIds: Set<IdleAgentType>
  onOpenBuy: (id: IdleAgentType) => void
  onOpenPrompt: (id: IdleAgentType) => void
  onChangeModel: (agentId: IdleAgentType, modelId: string) => void
}

export function RightPanel({
  agents,
  models,
  tokens,
  unlockedAgentIds,
  getCost,
  getAgentQuality,
  getUsersPerSecond,
  evaluatingAgentIds,
  onOpenBuy,
  onOpenPrompt,
  onChangeModel,
}: RightPanelProps) {
  // Permanently visible: owned or ever had enough tokens to see them
  const visibleAgents = agents.filter(
    (a) => unlockedAgentIds.has(a.id) || a.count > 0,
  )

  // The one next-up teaser: first agent (by unlock order) not yet permanently visible
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
          {visibleAgents.length === 0 && !teaserAgent && (
            <p className="text-sm" style={{ color: '#b3b3b3' }}>
              Keep earning tokens — agents unlock as you grow.
            </p>
          )}

          {visibleAgents.map((agent) => (
            <IdleAgentItem
              key={agent.id}
              agent={agent}
              models={models}
              tokens={tokens}
              cost={getCost(agent)}
              quality={getAgentQuality(agent)}
              usersPerSecond={getUsersPerSecond(agent)}
              isEvaluating={evaluatingAgentIds.has(agent.id)}
              onOpenBuy={onOpenBuy}
              onOpenPrompt={onOpenPrompt}
              onChangeModel={onChangeModel}
              className="w-full"
            />
          ))}

          {/* Teaser card — next locked agent */}
          {teaserAgent && (
            <div
              className="relative flex items-center gap-3 rounded-[12px] p-3 w-full overflow-hidden"
              style={{
                background: '#f9f9f9',
                border: '1px dashed #d9d9d9',
              }}
            >
              {/* Blurred icon */}
              <div
                className="flex items-center justify-center rounded-[12px] shrink-0 text-2xl"
                style={{
                  width: 48,
                  height: 48,
                  backgroundImage: teaserAgent.iconGrad,
                  filter: 'blur(4px) grayscale(0.6)',
                  opacity: 0.5,
                }}
              >
                {teaserAgent.emoji}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p
                  style={{
                    fontFamily: 'var(--sds-typography-family-serif, "Noto Serif", serif)',
                    fontSize: 16,
                    fontWeight: 600,
                    letterSpacing: '-0.32px',
                    color: '#b3b3b3',
                  }}
                >
                  ???
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#b3b3b3' }}>
                  Unlocks at {formatCost(teaserAgent.unlockThreshold)}
                </p>
                {/* Progress bar toward unlock */}
                <div
                  className="mt-1.5 w-full h-1.5 rounded-full overflow-hidden"
                  style={{ background: '#e5e5e5' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (tokens / teaserAgent.unlockThreshold) * 100)}%`,
                      background: 'linear-gradient(to right, #d9d9d9, #b3b3b3)',
                    }}
                  />
                </div>
              </div>

              {/* Locked buy button */}
              <div
                className="shrink-0 flex flex-col items-center justify-center rounded-[8px] px-3 py-1.5"
                style={{
                  background: '#e5e5e5',
                  minWidth: 56,
                }}
              >
                <span className="text-base">🔒</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
