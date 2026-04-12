'use client'

import type { Agent, Model } from '@/app/game-config'
import type { IdleAgentType } from '@/app/api/evaluate-idle/route'
import { MODELS } from '../lib/constants'
import { IdleAgentItem } from './IdleAgentItem'
import { ModelShopItem } from './ModelShopItem'

const ALL_MODELS = Object.values(MODELS)

type RightPanelProps = {
  agents: Agent[]
  models: Model[]
  tokens: number
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
  getCost,
  getAgentQuality,
  getUsersPerSecond,
  evaluatingAgentIds,
  onOpenBuy,
  onOpenPrompt,
  onChangeModel,
}: RightPanelProps) {
  const visibleAgents = agents.filter(
    (a) => tokens >= a.unlockThreshold || a.count > 0,
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
          {visibleAgents.length === 0 ? (
            <p className="text-sm" style={{ color: '#b3b3b3' }}>
              Keep earning tokens — agents unlock as you grow.
            </p>
          ) : (
            visibleAgents.map((agent) => (
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
            ))
          )}
        </div>
      </section>
    </div>
  )
}
