'use client'

import { useRef, useState, type CSSProperties, type ReactNode } from 'react'

const TOOLTIP_WIDTH = 280
const VIEWPORT_PADDING = 8

type TooltipProps = {
  content: ReactNode
  children: ReactNode
  className?: string
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [style, setStyle] = useState<CSSProperties>({})

  const handleMouseEnter = () => {
    if (!wrapperRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()

    let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2
    left = Math.max(VIEWPORT_PADDING, left)
    left = Math.min(left, window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_PADDING)

    setStyle({ position: 'fixed', left, top: rect.bottom + 8, width: TOOLTIP_WIDTH })
    setVisible(true)
  }

  return (
    <div
      ref={wrapperRef}
      className={`relative inline-block ${className ?? ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className="z-50 rounded-xl bg-white p-3"
          style={{
            ...style,
            whiteSpace: 'normal',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
            lineHeight: 1.4,
            border: '1px solid var(--sds-color-border-default-default,#d9d9d9)',
            boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)',
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}
