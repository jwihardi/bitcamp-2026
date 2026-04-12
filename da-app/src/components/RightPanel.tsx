'use client'

import type { Agent, Model } from '@/app/game-config'
import type { IdleAgentType } from '@/app/api/evaluate-idle/route'
import { AgentItem } from './AgentItem'
import { Button } from './Button'
import { Text } from './Text'
import { Tooltip } from './Tooltip'

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

const MODEL_EMOJI: Record<string, string> = {
  nimbus_1:     '☁️',
  quanta_s:     '⚡',
  synapse_pro:  '🧠',
  oracle_ultra: '🔮',
  oracle_apex:  '✨',
}

const MODEL_DESCRIPTION: Record<string, string> = {
  nimbus_1:     'Entry-level model. Reliable for simple tasks with low token costs.',
  quanta_s:     'Mid-tier model with noticeably better output quality. Good efficiency.',
  synapse_pro:  'High-quality model suited for complex agent workflows.',
  oracle_ultra: 'Top-tier model with maximum quality ceiling. Heavy token cost.',
  oracle_apex:  'Frontier-grade model. Exceptional quality — but expensive to run.',
}

type RightPanelProps = {
  agents: Agent[]
  models: Model[]
  tokens: number
  unlockedAgentIds: Set<IdleAgentType>
  getCost: (agent: Agent) => number
  getUsersPerSecond: (agent: Agent) => number
  onBuy: (id: IdleAgentType, isFirstBuy: boolean) => void
  onOpenEditor: (id: IdleAgentType) => void
  onUnlockModel: (modelId: string) => void
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
  onUnlockModel,
}: RightPanelProps) {
  const visibleAgents = agents.filter(
    (a) => unlockedAgentIds.has(a.id) || a.count > 0,
  )

  const SECTION_TITLE: React.CSSProperties = {
    fontFamily: 'var(--sds-typography-family-serif, "Noto Serif", serif)',
    fontSize: 24,
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: '-0.48px',
    color: 'black',
  }

  const teaserAgent = agents.find((a) => !unlockedAgentIds.has(a.id) && a.count === 0) ?? null

  return (
    <div
      className="flex flex-col shrink-0 h-full"
      style={{
        minWidth: 360,
        width: 'clamp(360px, 24vw, 640px)',
        background: 'white',
        borderLeft: '1px solid #d9d9d9',
      }}
    >
      {/* ── Model shop ── */}
      <section className="flex flex-col gap-3 px-4 py-3 w-full shrink-0">
        <p style={SECTION_TITLE}>Shop</p>

        <div className="flex flex-col gap-2 w-full">
          {models.map((model) => {
            const canAfford = tokens >= model.unlockCost
            const owned = model.unlocked

            return (
              <div
                key={model.id}
                className="flex items-center justify-between gap-3 px-3 py-3 rounded-[8px]"
                style={{
                  background: owned ? 'rgba(31,196,106,0.06)' : 'white',
                  border: `1px solid ${owned ? 'var(--sds-color-text-brand-tertiary,#1fc46a)' : 'var(--sds-color-border-default-default,#d9d9d9)'}`,
                  boxShadow: owned ? 'none' : '0px 2px 0px 0px var(--sds-color-background-neutral-tertiary-hover,#cdcdcd)',
                }}
              >
                {/* Emoji + info */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <Tooltip
                    content={
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xl leading-none">{MODEL_EMOJI[model.id] ?? '🤖'}</span>
                          <Text size="md" weight="bold" style={{ color: '#1e1e1e' }}>{model.name}</Text>
                          {!owned && (
                            <Text size="sm" weight="semibold" className="ml-auto" style={{ color: 'var(--sds-color-text-brand-tertiary,#1fc46a)' }}>
                              {formatCost(model.unlockCost)}
                            </Text>
                          )}
                        </div>
                        <Text
                          size="sm"
                          className="!whitespace-normal"
                          style={{ color: '#666', lineHeight: 1.4, overflowWrap: 'anywhere' }}
                        >
                          {MODEL_DESCRIPTION[model.id] ?? ''}
                        </Text>
                        <Text
                          size="sm"
                          className="!whitespace-normal"
                          style={{ color: '#b3b3b3', lineHeight: 1.4, overflowWrap: 'anywhere' }}
                        >
                          ×{model.qualityMultiplier.toFixed(1)} quality · ${model.costPerToken}/tok
                        </Text>
                      </div>
                    }
                  >
                    <span className="text-2xl leading-none shrink-0 cursor-default" aria-hidden>
                      {MODEL_EMOJI[model.id] ?? '🤖'}
                    </span>
                  </Tooltip>
                  <div className="min-w-0 flex-1">
                    <Text as="p" size="md" weight="bold" style={{ color: '#1e1e1e' }}>
                      {model.name}
                    </Text>
                    <Text as="p" size="sm" style={{ color: 'var(--sds-color-text-default-tertiary,#b3b3b3)', lineHeight: 1.4 }}>
                      ×{model.qualityMultiplier.toFixed(1)} quality · ${model.costPerToken}/tok
                    </Text>
                  </div>
                </div>

                {/* Action */}
                {owned ? (
                  <Text size="sm" weight="bold" style={{ color: 'var(--sds-color-text-brand-tertiary,#1fc46a)', flexShrink: 0 }}>
                    ✓ Owned
                  </Text>
                ) : (
                  <Button
                    label={formatCost(model.unlockCost)}
                    variant="Primary"
                    size="Small"
                    disabled={!canAfford}
                    onClick={() => onUnlockModel(model.id)}
                  />
                )}
              </div>
            )
          })}
        </div>
      </section>

      <div style={{ borderTop: '1px solid #f0f0f0' }} />

      {/* ── Agents ── */}
      <section className="flex flex-col gap-2 items-start px-4 pb-4 pt-3 w-full flex-1 overflow-y-auto">
        <p style={SECTION_TITLE}>Agents</p>

        <div className="flex flex-col gap-3 py-1 w-full">
          {visibleAgents.length === 0 && !teaserAgent ? (
            <p className="text-sm" style={{ color: '#b3b3b3' }}>
              Keep earning — agents unlock as you grow.
            </p>
          ) : (
            <>
              {visibleAgents.map((agent) => {
                const cost = getCost(agent)
                const canAfford = tokens >= cost
                const selectedModel = models.find((m) => m.id === agent.selectedModel)
                const modelName = selectedModel?.name ?? agent.selectedModel
                const ups = getUsersPerSecond(agent)
                const sublabel = agent.count > 0
                  ? `+${formatPerSecond(ups)}/s · ${modelName}`
                  : `${formatCost(cost)} · ${modelName}`

                return (
                  <AgentItem
                    key={agent.id}
                    emoji={agent.emoji}
                    name={agent.name}
                    sublabel={sublabel}
                    count={agent.count}
                    canAfford={canAfford}
                    onClick={() => onBuy(agent.id, agent.count === 0)}
                    onContextMenu={() => onOpenEditor(agent.id)}
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
                    border: '1px solid var(--sds-color-border-default-default,#d9d9d9)',
                    boxShadow: '0px 2px 0px 0px var(--sds-color-background-neutral-tertiary-hover,#cdcdcd)',
                    opacity: 0.6,
                  }}
                >
                  {/* Progress bar at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: '#f0f0f0' }}>
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (tokens / teaserAgent.unlockThreshold) * 100)}%`,
                        background: 'var(--sds-color-background-brand-default,#1fc46a)',
                      }}
                    />
                  </div>

                  {/* Blurred emoji */}
                  <div
                    className="absolute size-32 pointer-events-none select-none flex items-center justify-center text-6xl leading-none"
                    style={{ left: -30, top: -24, filter: 'blur(4px)', opacity: 0.4 }}
                    aria-hidden
                  >
                    {teaserAgent.emoji}
                  </div>

                  {/* Text */}
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
                    <Text as="p" size="sm" style={{ color: 'var(--sds-color-text-default-tertiary,#b3b3b3)' }}>
                      Unlocks at {formatCost(teaserAgent.unlockThreshold)}
                    </Text>
                  </div>

                  {/* Lock watermark */}
                  <p className="shrink-0 leading-tight" style={{ fontSize: 48, color: 'rgba(179,179,179,0.35)' }}>
                    🔒
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
