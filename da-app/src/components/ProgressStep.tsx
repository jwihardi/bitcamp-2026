import { CheckIcon } from './icons/CheckIcon'

type ProgressStepProps = {
  variant?: 'default' | 'unmet'
  className?: string
}

export function ProgressStep({ variant = 'default', className }: ProgressStepProps) {
  const met = variant === 'default'

  return (
    <div className={`flex items-start ${className ?? ''}`}>
      <div
        className="relative flex items-center justify-center overflow-clip rounded-full p-2 shrink-0"
        style={{
          backgroundColor: met
            ? 'var(--sds-color-background-brand-default)'
            : 'var(--sds-color-background-disabled-default)',
          boxShadow: met
            ? 'inset 0px -4px 0px 0px var(--sds-color-background-brand-hover)'
            : 'inset 0px -4px 0px 0px var(--sds-color-background-neutral-tertiary-hover)',
        }}
      >
        <CheckIcon
          size={20}
          color={met ? 'var(--sds-color-icon-brand-on-brand)' : 'var(--sds-color-icon-disabled-on-disabled)'}
        />
      </div>
    </div>
  )
}
