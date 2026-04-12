import type { Agent as LibAgent, AgentIcon } from '@/lib/types'
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

type AgentItemDisplay = {
  emoji: string
  name: string
  sublabel: string
  /** Shown as the large translucent serif number on the right */
  count: number
}

function fromLibAgent(agent: LibAgent): AgentItemDisplay {
  const model = MODELS[agent.modelId]
  const baseArr = BASE_OUTPUT[agent.role].arr ?? 500
  const estimatedRevenue = Math.round(baseArr * getOutputMultiplier(agent.qualityScore))
  return {
    emoji:    AGENT_ICONS[agent.icon],
    name:     agent.name,
    sublabel: `$${estimatedRevenue.toLocaleString()} · ${model.name}`,
    count:    agent.qualityScore,
  }
}

type AgentItemProps =
  | {
      agent: LibAgent
      emoji?: never; name?: never; sublabel?: never; count?: never
      canAfford?: never; onClick?: never; onDoubleClick?: never
      className?: string
    }
  | {
      agent?: never
      emoji: string
      name: string
      sublabel?: string
      /** Total agents purchased — shown as large serif number */
      count?: number
      canAfford?: boolean
      /** Single click — buy one agent */
      onClick?: () => void
      /** Right click — open agent editor */
      onContextMenu?: () => void
      className?: string
    }

export function AgentItem(props: AgentItemProps) {
  const { className } = props

  const display: AgentItemDisplay = props.agent
    ? fromLibAgent(props.agent)
    : {
        emoji:    props.emoji,
        name:     props.name ?? '',
        sublabel: props.sublabel ?? '',
        count:    props.count ?? 0,
      }

  const canAfford       = props.agent ? undefined : (props.canAfford ?? false)
  const handleClick     = props.agent ? undefined : props.onClick
  const handleCtxMenu   = props.agent ? undefined : props.onContextMenu

  return (
    <div
      className={`relative flex h-[72px] items-center justify-between overflow-hidden rounded-[8px] pl-20 pr-2 ${className ?? ''}`}
      style={{
        background: 'white',
        border: '1px solid var(--sds-color-border-default-default, #d9d9d9)',
        boxShadow: '0px 2px 0px 0px var(--sds-color-border-default-default, #d9d9d9)',
        cursor: handleClick ? (canAfford ? 'pointer' : 'not-allowed') : undefined,
        opacity: canAfford === false ? 0.55 : 1,
        userSelect: 'none',
      }}
      onClick={canAfford ? handleClick : undefined}
      onContextMenu={handleCtxMenu ? (e) => { e.preventDefault(); handleCtxMenu() } : undefined}
    >
      {/* Agent icon — overflows left edge */}
      <div
        className="absolute size-32 pointer-events-none select-none flex items-center justify-center text-6xl leading-none"
        style={{ left: -30, top: -24 }}
        aria-hidden
      >
        {display.emoji}
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
          {display.name}
        </p>
        {display.sublabel ? (
          <div className="flex items-center gap-2">
            <Text size="sm" weight="bold" style={{ color: 'var(--sds-color-text-brand-tertiary, #1fc46a)' }}>
              {display.sublabel.split(' · ')[0]}
            </Text>
            {display.sublabel.includes(' · ') && (
              <Text size="sm" weight="normal" style={{ color: 'var(--sds-color-text-default-tertiary, #b3b3b3)' }}>
                {display.sublabel.split(' · ')[1]}
              </Text>
            )}
          </div>
        ) : null}
      </div>

      {/* Count — large translucent serif watermark */}
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
        {display.count}
      </p>
    </div>
  )
}
