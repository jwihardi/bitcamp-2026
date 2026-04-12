type ProgressStemProps = {
  variant?: 'default' | 'unmet'
  className?: string
}

export function ProgressStem({ variant = 'default', className }: ProgressStemProps) {
  const met = variant === 'default'

  return (
    <div
      className={`relative overflow-clip rounded-full ${className ?? ''}`}
      style={{ height: '12px' }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={{
          backgroundColor: met
            ? 'var(--sds-color-background-brand-default)'
            : 'var(--sds-color-background-disabled-default)',
        }}
      />
      <div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          boxShadow: met
            ? 'inset 0px -4px 0px 0px var(--sds-color-background-brand-hover)'
            : 'inset 0px -4px 0px 0px var(--sds-color-background-neutral-tertiary-hover)',
        }}
      />
    </div>
  )
}
