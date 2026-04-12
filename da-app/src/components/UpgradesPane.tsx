'use client'

import type { ReputationUpgrade } from '@/app/game-config'
import { Button } from './Button'
import { Text } from './Text'
import { Tooltip } from './Tooltip'

type UpgradesPaneProps = {
  reputation: number
  upgrades: ReputationUpgrade[]
  onBuy: (id: string) => void
}

const SERIF: React.CSSProperties = {
  fontFamily: 'var(--sds-typography-family-serif, "Noto Serif", serif)',
}

const UPGRADE_EMOJI: Record<string, string> = {
  'click-boost-1': '🖱️',
  'starting-cash':  '💸',
  'starting-users': '👥',
  'prompt-boost':   '✍️',
  'user-gen-boost': '📈',
  'cost-reduction': '⚙️',
  'revenue-boost':  '💰',
  'model-unlock':   '🔓',
}

export function UpgradesPane({ reputation, upgrades, onBuy }: UpgradesPaneProps) {
  return (
    <div className="flex flex-col gap-8 px-6 pt-6 pb-3">
      {/* Title row */}
      <div className="flex items-baseline justify-between gap-4">
        <p style={{ ...SERIF, fontSize: 40, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.8px', color: 'black' }}>
          Upgrades
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-base leading-none" aria-hidden>🏆</span>
          <Text size="md" weight="bold" style={{ color: 'var(--sds-color-text-brand-tertiary, #1fc46a)' }}>
            {reputation} pts
          </Text>
        </div>
      </div>

      {/* Upgrade list */}
      <div className="flex flex-col gap-2">
        {upgrades.map((upgrade) => (
          <UpgradeCard
            key={upgrade.id}
            upgrade={upgrade}
            canAfford={reputation >= upgrade.cost}
            onBuy={() => onBuy(upgrade.id)}
          />
        ))}
      </div>
    </div>
  )
}

function UpgradeCard({
  upgrade,
  canAfford,
  onBuy,
}: {
  upgrade: ReputationUpgrade
  canAfford: boolean
  onBuy: () => void
}) {
  const purchased = upgrade.purchased

  return (
    <div
      className="flex items-center justify-between gap-3 px-3 py-3 rounded-[8px]"
      style={{
        background: purchased ? 'rgba(31,196,106,0.06)' : 'white',
        border: `1px solid ${purchased ? 'var(--sds-color-text-brand-tertiary,#1fc46a)' : 'var(--sds-color-border-default-default,#d9d9d9)'}`,
        boxShadow: purchased ? 'none' : '0px 2px 0px 0px var(--sds-color-background-neutral-tertiary-hover,#cdcdcd)',
      }}
    >
      {/* Emoji icon + info */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <Tooltip
          content={
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xl leading-none">{UPGRADE_EMOJI[upgrade.id] ?? '⭐'}</span>
                <Text size="md" weight="bold" style={{ color: '#1e1e1e' }}>{upgrade.name}</Text>
                <Text size="sm" weight="semibold" className="ml-auto" style={{ color: 'var(--sds-color-text-brand-tertiary,#1fc46a)' }}>
                  {upgrade.cost} pts
                </Text>
              </div>
              <Text size="sm" style={{ color: '#666', lineHeight: 1.4 }}>
                {upgrade.description}
              </Text>
            </div>
          }
        >
          <span className="text-xl leading-none shrink-0 cursor-default" aria-hidden>
            {UPGRADE_EMOJI[upgrade.id] ?? '⭐'}
          </span>
        </Tooltip>
        <div className="min-w-0 flex-1">
          <Text as="p" size="md" weight="bold" style={{ color: '#1e1e1e' }}>
            {upgrade.name}
          </Text>
          <Text as="p" size="sm" style={{ color: 'var(--sds-color-text-default-tertiary,#b3b3b3)', lineHeight: 'var(--sds-typography-body-line-height-default,1.4)' }}>
            {upgrade.description}
          </Text>
        </div>
      </div>

      {/* Action */}
      {purchased ? (
        <Text size="sm" weight="bold" style={{ color: 'var(--sds-color-text-brand-tertiary,#1fc46a)', flexShrink: 0 }}>
          ✓ Active
        </Text>
      ) : (
        <Button
          label={`${upgrade.cost} pts`}
          variant="Primary"
          size="Small"
          disabled={!canAfford}
          onClick={onBuy}
        />
      )}
    </div>
  )
}
