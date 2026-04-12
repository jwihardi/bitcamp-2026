'use client'

import { GoldButton } from './GoldButton'

type MoneyPileProps = {
  /** Fill level 0–100 (ARR progress toward current round goal). */
  percentage: number
  /** Company name displayed in the badge. */
  companyName?: string
  /** Users added per second across all marketing agents. */
  usersPerSecond?: number
  className?: string
  onGoldButtonClick?: () => void
}

function formatPerSecond(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return `${Math.round(n)}`
}

export function MoneyPile({
  percentage,
  companyName = 'Your Company',
  usersPerSecond = 0,
  className,
  onGoldButtonClick,
}: MoneyPileProps) {
  const pct = Math.min(100, Math.max(0, percentage))

  return (
    <div
      className={`relative w-full overflow-hidden ${className ?? ''}`}
      style={{ height: '100dvh', minWidth: '360px' }}
    >
      {/* White base + radial vignette matching Figma mix-blend-multiply gradient */}
      <div className="absolute inset-0 bg-white" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 32%, #fff 0%, #dfdfdf 15%, #bfbfbf 28%, #808080 50%, #282828 75%, #000 100%)',
          opacity: 0.5,
          mixBlendMode: 'multiply',
        }}
      />

      {/* Foreground: badge + label + coin */}
      <div className="relative z-10 flex flex-col items-center gap-2 pt-8 px-4">
        {/* Company name badge */}
        <div className="bg-black/20 rounded-lg px-16 py-[2px]">
          <p
            className="text-[#f3f3f3] text-2xl font-semibold leading-tight whitespace-nowrap"
            style={{ letterSpacing: '-0.48px', fontFamily: 'Nunito, sans-serif' }}
          >
            {companyName}
          </p>
        </div>

        {/* Click prompt + per-second stat */}
        <div className="flex flex-col items-center text-black text-center">
          <p className="text-xl leading-tight" style={{ fontFamily: 'Nunito, sans-serif' }}>
            Click to attract users!
          </p>
          <p className="text-base leading-snug" style={{ fontFamily: 'Nunito, sans-serif' }}>
            per second: {formatPerSecond(usersPerSecond)}
          </p>
        </div>

        {/* Gold coin — tap triggers particle burst + parent handler */}
        <GoldButton size={251} onClick={onGoldButtonClick} />
      </div>

      {/* Money pile — slides up from bottom as pct increases */}
      <img
        src="/money-pile.png"
        alt="Money pile"
        className="absolute bottom-0 w-full h-full object-cover object-bottom pointer-events-none"
        style={{
          transform: `translateY(${100 - pct}%)`,
          transition: 'transform 0.5s ease-out',
        }}
      />
    </div>
  )
}
