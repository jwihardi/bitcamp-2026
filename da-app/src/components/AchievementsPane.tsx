'use client'

import { ProgressBar } from './ProgressBar'
import { formatCompact, type Achievement } from '@/lib/achievements'

type AchievementsPaneProps = {
  achievements: Achievement[]
}

function progressPct(value: number, target: number): number {
  if (target <= 0) return 100
  return Math.min(100, Math.max(0, (value / target) * 100))
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const unlocked = achievement.unlocked
  const pct = progressPct(achievement.progressValue, achievement.targetValue)
  const formatValue = achievement.formatter ?? formatCompact

  return (
    <div
      className="flex w-full flex-col gap-3 rounded-[10px] px-3 py-3"
      style={{
        background: unlocked ? 'rgba(31,196,106,0.06)' : 'white',
        border: `1px solid ${unlocked ? 'var(--sds-color-text-brand-tertiary,#1fc46a)' : 'var(--sds-color-border-default-default,#d9d9d9)'}`,
        boxShadow: unlocked ? 'none' : '0px 2px 0px 0px var(--sds-color-background-neutral-tertiary-hover,#cdcdcd)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-lg leading-none"
            style={{ background: 'rgba(0,0,0,0.04)' }}
            aria-hidden
          >
            {achievement.emoji}
          </span>
          <div className="min-w-0">
            <p
              className="truncate"
              style={{
                fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
                fontSize: 18,
                fontWeight: 700,
                lineHeight: 1.2,
                color: 'black',
              }}
            >
              {achievement.title}
            </p>
            <p
              className="mt-1"
              style={{
                fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
                fontSize: 14,
                fontWeight: 500,
                lineHeight: 1.35,
                color: '#6b7280',
              }}
            >
              {achievement.description}
            </p>
          </div>
        </div>

        <p
          className="shrink-0"
          style={{
            fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
            fontSize: 12,
            fontWeight: 700,
            lineHeight: 1,
            color: unlocked ? 'var(--sds-color-text-brand-tertiary,#1fc46a)' : '#9ca3af',
            padding: '6px 8px',
            borderRadius: 999,
            background: unlocked ? 'rgba(31,196,106,0.12)' : '#f3f4f6',
          }}
        >
          {unlocked ? 'UNLOCKED' : 'LOCKED'}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <ProgressBar value={pct} color={achievement.color} className="h-3" />
        <div className="flex items-center justify-between">
          <p
            style={{
              fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
              fontSize: 12,
              fontWeight: 600,
              lineHeight: 1.2,
              color: '#6b7280',
            }}
          >
            {formatValue(achievement.progressValue)} / {formatValue(achievement.targetValue)}
          </p>
          <p
            style={{
              fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1.2,
              color: '#374151',
            }}
          >
            {Math.floor(pct)}%
          </p>
        </div>
      </div>
    </div>
  )
}

export function AchievementsPane({
  achievements,
}: AchievementsPaneProps) {
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length

  return (
    <div className="flex flex-col gap-8 px-6 pt-6 pb-4">
      <div className="flex items-baseline justify-between gap-4">
        <p
          style={{
            fontFamily: 'var(--sds-typography-family-serif, "Noto Serif", serif)',
            fontSize: 40,
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '-0.8px',
            color: 'black',
          }}
        >
          Achievements
        </p>
        <p
          style={{
            fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
            fontSize: 15,
            fontWeight: 700,
            lineHeight: 1,
            color: unlockedCount === achievements.length ? 'var(--sds-color-text-brand-tertiary, #1fc46a)' : '#4b5563',
            whiteSpace: 'nowrap',
          }}
        >
          {unlockedCount}/{achievements.length} unlocked
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {achievements.map((achievement) => (
          <AchievementCard key={achievement.id} achievement={achievement} />
        ))}
      </div>
    </div>
  )
}
