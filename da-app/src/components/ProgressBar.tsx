type ProgressBarProps = {
  value?: number   // 0–100
  color?: string
  className?: string
}

export function ProgressBar({ value = 100, color = '#ffc800', className }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value))

  return (
    <div
      className={`relative h-4 rounded-lg overflow-hidden ${className ?? ''}`}
      style={{ backgroundColor: '#e5e5e5' }}
    >
      <div
        className="h-full rounded-lg relative"
        style={{ width: `${pct}%`, backgroundColor: color }}
      >
        {/* gloss highlight */}
        <div
          className="absolute rounded-lg bg-white opacity-20"
          style={{ top: 4, left: 8, height: '4.8px', width: 31 }}
        />
      </div>
    </div>
  )
}
