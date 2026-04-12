import { type CSSProperties, type ElementType, type ReactNode } from 'react'

type TextSize = 'sm' | 'md' | 'lg'
type TextWeight = 'normal' | 'semibold' | 'bold'

const SIZE: Record<TextSize, string> = {
  sm: 'var(--sds-typography-body-size-sm, 14px)',
  md: 'var(--sds-typography-body-size-md, 16px)',
  lg: 'var(--sds-typography-body-size-lg, 20px)',
}

const WEIGHT: Record<TextWeight, string> = {
  normal:   'var(--sds-typography-weight-normal, 400)',
  semibold: 'var(--sds-typography-weight-semibold, 600)',
  bold:     'var(--sds-typography-weight-bold, 700)',
}

type TextProps = {
  children: ReactNode
  as?: ElementType
  size?: TextSize
  weight?: TextWeight
  className?: string
  style?: CSSProperties
}

export function Text({
  children,
  as: Tag = 'span',
  size = 'md',
  weight = 'normal',
  className,
  style,
}: TextProps) {
  return (
    <Tag
      className={`leading-none whitespace-nowrap ${className ?? ''}`}
      style={{
        fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
        fontSize: SIZE[size],
        fontWeight: WEIGHT[weight],
        ...style,
      }}
    >
      {children}
    </Tag>
  )
}
