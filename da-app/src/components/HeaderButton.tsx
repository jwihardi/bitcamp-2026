import { type ReactNode } from 'react'
import { Star } from 'lucide-react'
import { Text } from './Text'

type HeaderButtonProps = {
  text?: string
  variant?: 'Default' | 'Active'
  icon?: ReactNode
  onClick?: () => void
  className?: string
}

export function HeaderButton({
  text = 'Button',
  variant = 'Default',
  icon,
  onClick,
  className,
}: HeaderButtonProps) {
  const isActive = variant === 'Active'
  const color = isActive
    ? 'var(--sds-color-text-brand-tertiary, #1fc46a)'
    : 'var(--sds-color-text-default-tertiary, #b3b3b3)'

  const defaultIcon = (
    <Star
      size={32}
      strokeWidth={1.5}
      fill={isActive ? 'currentColor' : 'none'}
      style={{ color, flexShrink: 0 }}
    />
  )

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 py-1 ${className ?? ''}`}
    >
      {icon ?? defaultIcon}
      <Text
        size="md"
        weight={isActive ? 'bold' : 'semibold'}
        style={{ color }}
      >
        {text}
      </Text>
    </button>
  )
}
