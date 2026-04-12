'use client'

import { useEffect, useState } from 'react'
import type { Model, FundingStage } from '../app/game-config'
import { FundingProgress } from './FundingProgress'
import { ProgressBar } from './ProgressBar'

const MODEL_EMOJI: Record<string, string> = {
  nimbus_1:     '☁️',
  quanta_s:     '⚡',
  synapse_pro:  '🧠',
  oracle_ultra: '🔮',
  oracle_apex:  '🔮',
}

function formatNumber(num: number): string {
  if (!Number.isFinite(num)) return '0'
  if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T'
  if (num >= 1e9)  return (num / 1e9).toFixed(2) + 'B'
  if (num >= 1e6)  return (num / 1e6).toFixed(2) + 'M'
  if (num >= 1e3)  return (num / 1e3).toFixed(2) + 'K'
  return Math.floor(num).toString()
}

function formatElapsed(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${seconds % 60}s`
}

type SectionHeadingProps = { children: React.ReactNode }
function SectionHeading({ children }: SectionHeadingProps) {
  return (
    <div
      className="flex flex-col items-start justify-center pb-2 w-full shrink-0"
      style={{ borderBottom: '1px solid #d9d9d9' }}
    >
      <p
        style={{
          fontFamily: 'var(--sds-typography-family-serif, "Noto Serif", serif)',
          fontSize: 24,
          fontWeight: 600,
          lineHeight: 1.2,
          letterSpacing: '-0.48px',
          color: 'black',
        }}
      >
        {children}
      </p>
    </div>
  )
}

type StatRowProps = { label: string; value: string; stripe: 'even' | 'odd' }
function StatRow({ label, value, stripe }: StatRowProps) {
  return (
    <div
      className="flex items-start justify-between w-full shrink-0 px-1 py-1.5"
      style={{
        backgroundColor: stripe === 'even' ? '#f5f5f5' : '#e6e6e6',
        fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
        fontSize: 16,
        fontWeight: 500,
        lineHeight: 1,
        letterSpacing: '-0.2px',
        color: 'black',
        whiteSpace: 'nowrap',
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

export type StatisticsPanelProps = {
  tokens: number
  totalEarned: number
  lifetimeRevenue: number
  usersPerSecond: number
  clickPower: number
  currentStageIndex: number
  userbase: number
  profitPerSecond: number
  unlockedModels: Model[]
  totalModels: number
  nextStage: FundingStage | null
}

export function StatisticsPanel({
  tokens,
  totalEarned,
  lifetimeRevenue,
  usersPerSecond,
  clickPower,
  currentStageIndex,
  userbase,
  profitPerSecond,
  unlockedModels,
  totalModels,
  nextStage,
}: StatisticsPanelProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const generalRows: Array<{ label: string; value: string }> = [
    { label: 'Cash in bank:', value: `$${formatNumber(tokens)}` },
    { label: 'Money earned (this startup):', value: `$${formatNumber(totalEarned)}` },
    { label: 'Money earned (all time):', value: `$${formatNumber(lifetimeRevenue)}` },
    { label: 'Users per second:', value: formatNumber(usersPerSecond) },
    { label: 'User attract clicks:', value: formatNumber(clickPower) },
    { label: 'Time elapsed:', value: formatElapsed(elapsedSeconds) },
  ]

  const usersPct = nextStage
    ? Math.min(100, (Math.floor(userbase) / nextStage.userRequirement) * 100)
    : 100

  const profitPct =
    nextStage && nextStage.profitRequirement > 0
      ? Math.min(100, Math.max(0, (profitPerSecond / nextStage.profitRequirement) * 100))
      : 100

  return (
    <div
      className="flex flex-col gap-8 items-start w-full overflow-y-auto"
      style={{ padding: '24px', background: 'white' }}
    >
      {/* Title */}
      <p
        style={{
          fontFamily: 'var(--sds-typography-family-serif, "Noto Serif", serif)',
          fontSize: 40,
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: '-0.8px',
          color: 'black',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Statistics
      </p>

      {/* General */}
      <div className="flex flex-col gap-4 items-start w-full shrink-0">
        <SectionHeading>General</SectionHeading>
        <div
          className="flex flex-col items-start w-full shrink-0 overflow-hidden"
          style={{
            fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
          }}
        >
          {generalRows.map((row, i) => (
            <StatRow
              key={row.label}
              label={row.label}
              value={row.value}
              stripe={i % 2 === 0 ? 'even' : 'odd'}
            />
          ))}
        </div>
      </div>

      {/* Funding stage */}
      <div className="flex flex-col gap-4 items-start w-full shrink-0">
        <SectionHeading>Funding stage</SectionHeading>

        <FundingProgress stage={currentStageIndex} />

        <div className="flex flex-col gap-1 items-start w-full shrink-0">
          <p
            style={{
              fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
              fontSize: 16,
              fontWeight: 700,
              lineHeight: 1.4,
              color: 'black',
              whiteSpace: 'nowrap',
            }}
          >
            To next funding round:
          </p>

          {nextStage ? (
            <div className="flex flex-col gap-1 items-start w-full shrink-0">
              {/* Users */}
              <div className="flex flex-col gap-1 items-start w-full shrink-0">
                <p
                  style={{
                    fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
                    fontSize: 16,
                    fontWeight: 700,
                    lineHeight: 1.4,
                    color: 'black',
                  }}
                >
                  Users
                </p>
                <div className="flex gap-2 items-center w-full shrink-0">
                  <span
                    style={{
                      fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
                      fontSize: 16,
                      fontWeight: 400,
                      lineHeight: 1.4,
                      color: 'black',
                      whiteSpace: 'nowrap',
                      minWidth: 128,
                    }}
                  >
                    {formatNumber(Math.floor(userbase))}/{formatNumber(nextStage.userRequirement)}
                  </span>
                  <ProgressBar value={usersPct} color="#3f81ea" className="flex-1" />
                </div>
              </div>

              {/* Profit per second */}
              {nextStage.profitRequirement > 0 && (
                <div className="flex flex-col gap-1 items-start w-full shrink-0">
                  <p
                    style={{
                      fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
                      fontSize: 16,
                      fontWeight: 700,
                      lineHeight: 1.4,
                      color: 'black',
                    }}
                  >
                    Profit per second
                  </p>
                  <div className="flex gap-2 items-center w-full shrink-0">
                    <span
                      style={{
                        fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
                        fontSize: 16,
                        fontWeight: 400,
                        lineHeight: 1.4,
                        color: 'black',
                        whiteSpace: 'nowrap',
                        minWidth: 128,
                      }}
                    >
                      ${formatNumber(profitPerSecond)}/s / ${formatNumber(nextStage.profitRequirement)}/s
                    </span>
                    <ProgressBar value={profitPct} color="#58cc02" className="flex-1" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p
              style={{
                fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
                fontSize: 16,
                fontWeight: 700,
                lineHeight: 1.4,
                color: '#1fc46a',
              }}
            >
              You&apos;ve reached IPO! 🎉
            </p>
          )}
        </div>
      </div>

      {/* Upgrades */}
      <div className="flex flex-col gap-4 items-start w-full shrink-0">
        <SectionHeading>Upgrades</SectionHeading>
        <p
          style={{
            fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 1.4,
            color: 'black',
            whiteSpace: 'nowrap',
          }}
        >
          You&apos;ve unlocked {unlockedModels.length}/{totalModels}.
        </p>
        <div className="flex gap-3 items-center flex-wrap shrink-0">
          {unlockedModels.map((model) => (
            <div
              key={model.id}
              className="flex flex-col gap-0.5 items-center justify-center overflow-hidden p-1.5 rounded-lg"
              style={{
                width: 72,
                height: 72,
                background: 'white',
                border: '1px solid #d9d9d9',
                boxShadow: '0px 2px 0px 0px #cdcdcd',
                flexShrink: 0,
              }}
            >
              <span className="text-2xl leading-none" aria-hidden>
                {MODEL_EMOJI[model.id] ?? '🤖'}
              </span>
              <p
                className="w-full overflow-hidden text-ellipsis text-center"
                style={{
                  fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
                  fontSize: 14,
                  fontWeight: 400,
                  lineHeight: 1.4,
                  color: 'black',
                  whiteSpace: 'nowrap',
                }}
              >
                {model.name}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Lifetime profits — placeholder (no graph yet) */}
      <div className="flex flex-col gap-4 items-start w-full shrink-0">
        <SectionHeading>Lifetime profits</SectionHeading>
        <p
          style={{
            fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
            fontSize: 14,
            fontWeight: 400,
            color: '#9ca3af',
          }}
        >
          Chart coming soon
        </p>
      </div>

      {/* Lifetime costs — placeholder (no graph yet) */}
      <div className="flex flex-col gap-4 items-start w-full shrink-0">
        <SectionHeading>Lifetime costs</SectionHeading>
        <p
          style={{
            fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
            fontSize: 14,
            fontWeight: 400,
            color: '#9ca3af',
          }}
        >
          Chart coming soon
        </p>
      </div>
    </div>
  )
}
