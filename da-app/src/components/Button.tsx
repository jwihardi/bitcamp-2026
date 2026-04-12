import { type ButtonHTMLAttributes, type ReactNode } from 'react'

export type ButtonVariant = 'Primary' | 'Neutral' | 'Subtle'
export type ButtonSize = 'Medium' | 'Small'

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  label?: string
  variant?: ButtonVariant
  size?: ButtonSize
  iconStart?: ReactNode
  iconEnd?: ReactNode
}

// Design tokens (all defined in globals.css)
const BG = {
  primaryDefault:  'var(--sds-color-background-brand-default,#1fc46a)',
  primaryHover:    'var(--sds-color-background-brand-hover,#00a657)',
  neutralDefault:  'var(--sds-color-background-neutral-tertiary,#e3e3e3)',
  neutralHover:    'var(--sds-color-background-neutral-secondary,#cdcdcd)',
  disabled:        'var(--sds-color-background-disabled-default,#d9d9d9)',
}

const SHADOW = {
  primaryDefault:  '0px 4px 0px 0px var(--sds-color-background-brand-hover,#00a657)',
  primaryHover:    '0px 4px 0px 0px var(--sds-color-background-positive-hover,#008043)',
  neutralDefault:  '0px 4px 0px 0px var(--sds-color-background-neutral-tertiary-hover,#cdcdcd)',
  neutralHover:    '0px 4px 0px 0px var(--sds-color-background-neutral-secondary-hover,#b2b2b2)',
  disabled:        '0px 4px 0px 0px var(--sds-color-background-neutral-tertiary-hover,#cdcdcd)',
}

const TEXT_COLOR = {
  onBrand:   'var(--sds-color-text-brand-on-brand,#f5f5f5)',
  default:   'var(--sds-color-text-default-default,#1e1e1e)',
  disabled:  'var(--sds-color-icon-disabled-on-disabled,#b3b3b3)',
}

export function Button({
  label = 'Button',
  variant = 'Primary',
  size = 'Medium',
  iconStart,
  iconEnd,
  disabled,
  className,
  style,
  ...rest
}: ButtonProps) {
  const pad = size === 'Medium' ? '12px' : '8px'

  // Compute base (non-hover) background, shadow, and text color
  let bg: string | undefined
  let shadow: string | undefined
  let textColor: string

  if (disabled) {
    bg        = variant === 'Subtle' ? undefined : BG.disabled
    shadow    = variant === 'Subtle' ? undefined : SHADOW.disabled
    textColor = TEXT_COLOR.disabled
  } else if (variant === 'Primary') {
    bg        = BG.primaryDefault
    shadow    = SHADOW.primaryDefault
    textColor = TEXT_COLOR.onBrand
  } else if (variant === 'Neutral') {
    bg        = BG.neutralDefault
    shadow    = SHADOW.neutralDefault
    textColor = TEXT_COLOR.default
  } else {
    // Subtle
    bg        = undefined
    shadow    = undefined
    textColor = TEXT_COLOR.default
  }

  return (
    <button
      type="button"
      disabled={disabled}
      className={[
        // layout
        'inline-flex items-center justify-center gap-2',
        'overflow-hidden',
        // shape
        'rounded-[var(--sds-size-radius-200,8px)]',
        // typography
        'font-bold leading-none whitespace-nowrap',
        'font-[family-name:var(--sds-typography-body-font-family,"Nunito",sans-serif)]',
        'text-[length:var(--sds-typography-body-size-medium,16px)]',
        // interaction
        !disabled && 'cursor-pointer',
        disabled  && 'cursor-not-allowed',
        // Subtle hover: add border
        !disabled && variant === 'Subtle' && [
          'hover:border hover:border-[var(--sds-color-border-default-default,#d9d9d9)]',
          'border border-transparent', // reserve border space so layout doesn't shift
        ],
        // Primary hover: darker bg + darker shadow
        !disabled && variant === 'Primary' && [
          `hover:bg-[var(--sds-color-background-brand-hover,#00a657)]`,
          `hover:shadow-[0px_4px_0px_0px_var(--sds-color-background-positive-hover,#008043)]`,
          `active:translate-y-[3px] active:shadow-none`,
        ],
        // Neutral hover: darker bg + darker shadow
        !disabled && variant === 'Neutral' && [
          `hover:bg-[var(--sds-color-background-neutral-secondary,#cdcdcd)]`,
          `hover:shadow-[0px_4px_0px_0px_var(--sds-color-background-neutral-secondary-hover,#b2b2b2)]`,
          `active:translate-y-[3px] active:shadow-none`,
        ],
        className,
      ].flat().filter(Boolean).join(' ')}
      style={{
        padding:    pad,
        background: bg,
        boxShadow:  shadow,
        color:      textColor,
        ...style,
      }}
      {...rest}
    >
      {iconStart}
      <span>{label}</span>
      {iconEnd}
    </button>
  )
}
