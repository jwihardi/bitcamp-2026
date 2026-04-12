'use client'

import { useRef, useState, type CSSProperties } from 'react'
import type { Model, ModelId } from '@/lib/types'
import { Text } from './Text'

const MODEL_ICONS: Record<ModelId, string> = {
  nimbus_1:     '☁️',
  quanta_s:     '⚡',
  synapse_pro:  '🧠',
  oracle_ultra: '🔮',
}

const TOOLTIP_WIDTH = 208 // w-52
const VIEWPORT_PADDING = 8

type ModelShopItemProps = {
  model: Model
}

export function ModelShopItem({ model }: ModelShopItemProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [tooltipStyle, setTooltipStyle] = useState<CSSProperties>({})

  const icon = MODEL_ICONS[model.id]
  const cost = `$${model.prestigeCost}`

  const handleMouseEnter = () => {
    if (!wrapperRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()

    // Start by centering the tooltip over the card
    let viewportLeft = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2

    // Clamp to keep inside the viewport
    viewportLeft = Math.max(VIEWPORT_PADDING, viewportLeft)
    viewportLeft = Math.min(viewportLeft, window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_PADDING)

    // Convert from viewport coords to coords relative to the wrapper
    setTooltipStyle({ left: viewportLeft - rect.left, transform: 'none' })
    setVisible(true)
  }

  return (
    <div
      ref={wrapperRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
    >
      {/* Card */}
      <div
        className="flex w-[72px] h-[72px] cursor-pointer flex-col items-center justify-center gap-[var(--sds-size-space-050,2px)] overflow-hidden rounded-[var(--sds-size-radius-200,8px)] p-[var(--sds-size-space-150,6px)] transition-colors duration-150 hover:bg-stone-100 hover:border-stone-300"
        style={{
          background: 'white',
          border: '1px solid var(--sds-color-border-default-default, #d9d9d9)',
          boxShadow: '0px 2px 0px 0px var(--sds-color-background-neutral-tertiary-hover, #cdcdcd)',
        }}
      >
        <span className="flex size-8 items-center justify-center text-2xl leading-none" aria-hidden>
          {icon}
        </span>
        <Text
          as="p"
          size="sm"
          weight="normal"
          className="w-full overflow-hidden text-ellipsis text-center"
          style={{
            lineHeight: 'var(--sds-typography-body-line-height-default, 1.4)',
            color: 'black',
          }}
        >
          {model.name}
        </Text>
      </div>

      {/* Tooltip */}
      {visible && (
        <div
          className="absolute bottom-[calc(100%+8px)] z-50 w-52 rounded-xl bg-white p-3"
          style={{
            ...tooltipStyle,
            border: '1px solid var(--sds-color-border-default-default, #d9d9d9)',
            boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl leading-none" aria-hidden>{icon}</span>
            <Text size="md" weight="bold" style={{ color: 'black' }}>
              {model.name}
            </Text>
            <Text
              size="sm"
              weight="semibold"
              className="ml-auto"
              style={{ color: 'var(--sds-color-text-brand-tertiary, #1fc46a)' }}
            >
              {cost}
            </Text>
          </div>
          <Text
            size="sm"
            weight="normal"
            className="mt-1 block !whitespace-normal"
            style={{
              color: '#666',
              lineHeight: 'var(--sds-typography-body-line-height-default, 1.4)',
            }}
          >
            {model.description}
          </Text>
        </div>
      )}
    </div>
  )
}
