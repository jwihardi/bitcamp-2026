import type { Agent, AgentIcon } from '@/lib/types'
import { MODELS, BASE_OUTPUT } from '@/lib/constants'
import { Text } from './Text'

const AGENT_ICONS: Record<AgentIcon, string> = {
  robot:     '🤖',
  briefcase: '💼',
  chart:     '📊',
  wrench:    '🔧',
  lightbulb: '💡',
  rocket:    '🚀',
}

function getOutputMultiplier(q: number): number {
  return 0.2 + (q / 100) * 1.8
}

type AgentItemProps = {
  agent: Agent
  className?: string
}

export function AgentItem({ agent, className }: AgentItemProps) {
  const model = MODELS[agent.modelId]
  const baseArr = BASE_OUTPUT[agent.role].arr ?? 500
  const estimatedRevenue = Math.round(baseArr * getOutputMultiplier(agent.qualityScore))

  return (
    <div
      className={`relative flex h-[72px] items-center justify-between overflow-hidden rounded-[8px] pl-16 pr-2 ${className ?? ''}`}
      style={{
        background: 'white',
        border: '1px solid var(--sds-color-border-default-default, #d9d9d9)',
        boxShadow: '0px 2px 0px 0px var(--sds-color-border-default-default, #d9d9d9)',
      }}
    >
      {/* Agent icon — overflows left edge */}
      <div
        className="absolute size-32 pointer-events-none select-none flex items-center justify-center text-6xl leading-none"
        style={{ left: -30, top: -24 }}
        aria-hidden
      >
        {AGENT_ICONS[agent.icon]}
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col justify-end gap-1 pb-2 pl-8 pr-4 min-w-0 h-full">
        <p
          className="leading-tight truncate"
          style={{
            fontFamily: 'var(--sds-typography-family-serif, "Noto Serif", serif)',
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: '-0.48px',
            color: '#1e1e1e',
          }}
        >
          {agent.name}
        </p>
        <div className="flex items-center gap-2">
          <Text size="sm" weight="bold" style={{ color: 'var(--sds-color-text-brand-tertiary, #1fc46a)' }}>
            ${estimatedRevenue.toLocaleString()}
          </Text>
          <Text size="sm" weight="normal" style={{ color: 'var(--sds-color-text-default-tertiary, #b3b3b3)' }}>
            {model.name}
          </Text>
        </div>
      </div>

      {/* Quality score */}
      <p
        className="shrink-0 leading-tight whitespace-nowrap"
        style={{
          fontFamily: 'var(--sds-typography-family-serif, "Noto Serif", serif)',
          fontSize: 48,
          fontWeight: 700,
          letterSpacing: '-0.96px',
          color: 'rgba(179, 179, 179, 0.35)',
        }}
      >
        {agent.qualityScore}
      </p>
    </div>
  )
}
