'use client'

import { GoldButton } from './GoldButton'

type MoneyPileProps = {
  /** Fill level 0–100 (ARR progress toward current round goal). */
  percentage: number
  /** Company name displayed in the badge. */
  companyName?: string
  /** Current total user count. */
  userCount?: number
  /** Users added per second across all agents. */
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
  userCount = 0,
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
      {/* White base */}
      <div className="absolute inset-0 bg-white" />

      {/* Money pile — background fill, slides up from bottom as pct increases */}
      <img
        src="/money-pile.png"
        alt=""
        aria-hidden
        className="absolute bottom-0 w-full h-full object-cover object-bottom pointer-events-none"
        style={{
          transform: `translateY(${100 - pct}%)`,
          transition: 'transform 0.5s ease-out',
          filter: 'blur(3px)',
          zIndex: 0,
        }}
      />

      {/* Radial vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 32%, #fff 0%, #dfdfdf 15%, #bfbfbf 28%, #808080 50%, #282828 75%, #000 100%)',
          opacity: 0.5,
          mixBlendMode: 'multiply',
          zIndex: 1,
        }}
      />

      {/* Foreground: badge + label + coin */}
      <div className="relative flex flex-col items-center gap-2 pt-8 px-4" style={{ zIndex: 2 }}>
        {/* Company name badge */}
        <div className="bg-black/20 rounded-lg px-16 py-[2px]">
          <p
            className="text-[#f3f3f3] text-2xl font-semibold leading-tight whitespace-nowrap"
            style={{ letterSpacing: '-0.48px', fontFamily: 'Nunito, sans-serif' }}
          >
            {companyName}
          </p>
        </div>

        {/* Click prompt + live stats */}
        <div className="flex flex-col items-center text-black text-center">
          <p className="text-xl leading-tight" style={{ fontFamily: 'Nunito, sans-serif' }}>
            Click to attract users!
          </p>
          <p className="text-2xl font-bold leading-snug tabular-nums" style={{ fontFamily: 'Nunito, sans-serif' }}>
            {formatPerSecond(userCount)} users
          </p>
          <p className="text-base leading-snug opacity-70" style={{ fontFamily: 'Nunito, sans-serif' }}>
            +{formatPerSecond(usersPerSecond)}/sec
          </p>
        </div>

        {/* Gold coin — tap triggers particle burst + parent handler */}
        <GoldButton size={251} onClick={onGoldButtonClick} />
      </div>

    </div>
  )
}
