'use client'

import type { Agent, Model } from '@/app/game-config'
import type { IdleAgentType } from '@/app/api/evaluate-idle/route'

type IdleAgentItemProps = {
  agent: Agent
  models: Model[]
  tokens: number
  cost: number
  quality: number
  usersPerSecond: number
  isEvaluating: boolean
  onOpenBuy: (id: IdleAgentType) => void
  onOpenPrompt: (id: IdleAgentType) => void
  onChangeModel: (agentId: IdleAgentType, modelId: string) => void
  className?: string
}

export function IdleAgentItem({
  agent,
  models,
  tokens,
  cost,
  quality,
  usersPerSecond,
  isEvaluating,
  onOpenBuy,
  onOpenPrompt,
  onChangeModel,
  className,
}: IdleAgentItemProps) {
  const canAfford = tokens >= cost
  const unlockedModels = models.filter((m) => m.unlocked)
  const hasMultipleModels = unlockedModels.length > 1

  const formatNumber = (n: number) => {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
    return n.toFixed(1)
  }

  const formatCost = (n: number) => {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B'
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K'
    return '$' + Math.floor(n)
  }

  const promptColor =
    isEvaluating
      ? { border: '#e0d4ff', color: '#8200db', bg: '#faf5ff' }
      : quality < 60
        ? { border: '#fed7aa', color: '#9a3412', bg: '#fff7ed' }
        : { border: '#e0d4ff', color: '#8200db', bg: '#faf5ff' }

  return (
    <div
      className={`relative flex flex-col overflow-visible rounded-[12px] p-3 gap-2 ${className ?? ''}`}
      style={{
        background: 'white',
        border: '1px solid var(--sds-color-border-default-default, #d9d9d9)',
        boxShadow: '0px 2px 0px 0px var(--sds-color-border-default-default, #d9d9d9)',
      }}
    >
      {/* Top row: icon + info + buy button */}
      <div className="flex items-center gap-3">
        {/* Emoji icon */}
        <div
          className="flex items-center justify-center rounded-[12px] shrink-0 text-2xl"
          style={{
            width: 48,
            height: 48,
            backgroundImage: agent.iconGrad,
          }}
        >
          {agent.emoji}
        </div>

        {/* Name + stats */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className="leading-tight truncate"
              style={{
                fontFamily: 'var(--sds-typography-family-serif, "Noto Serif", serif)',
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: '-0.32px',
                color: '#1e1e1e',
              }}
            >
              {agent.name}
            </p>
            {agent.count > 0 && (
              <span
                className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                style={{ background: '#f0fdf4', color: '#16a34a' }}
              >
                ×{agent.count}
              </span>
            )}
          </div>
          {agent.count > 0 && (
            <p className="text-xs" style={{ color: '#b3b3b3' }}>
              +{formatNumber(usersPerSecond)}/s · {Math.round(quality)}%
            </p>
          )}
        </div>

        {/* Buy button */}
        <button
          onClick={() => onOpenBuy(agent.id)}
          disabled={!canAfford}
          className="shrink-0 flex flex-col items-center justify-center rounded-[8px] px-3 py-1.5 font-bold text-white text-xs leading-tight transition-opacity"
          style={{
            backgroundImage: canAfford ? agent.buttonGrad : undefined,
            background: canAfford ? undefined : '#d9d9d9',
            boxShadow: canAfford ? '0px 3px 0px 0px rgba(0,0,0,0.2)' : '0px 3px 0px 0px #b2b2b2',
            opacity: canAfford ? 1 : 0.6,
            cursor: canAfford ? 'pointer' : 'not-allowed',
            minWidth: 56,
          }}
        >
          <span style={{ fontSize: 11 }}>{formatCost(cost)}</span>
          <span style={{ fontSize: 13 }}>BUY</span>
        </button>
      </div>

      {/* Bottom row: prompt button + model selector */}
      {agent.count > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onOpenPrompt(agent.id)}
            disabled={isEvaluating}
            className="flex items-center gap-1 rounded-[6px] px-2 py-1 text-xs font-medium border transition-colors"
            style={{
              borderColor: promptColor.border,
              color: promptColor.color,
              background: promptColor.bg,
              cursor: isEvaluating ? 'not-allowed' : 'pointer',
            }}
          >
            {isEvaluating ? '⏳ Evaluating...' : `📝 Prompt (${Math.round(quality)}%)`}
          </button>

          {hasMultipleModels && (
            <select
              value={agent.selectedModel}
              onChange={(e) => onChangeModel(agent.id, e.target.value)}
              className="text-xs rounded-[6px] px-2 py-1 border"
              style={{
                borderColor: '#d9d9d9',
                color: '#1e1e1e',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              {unlockedModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  )
}
