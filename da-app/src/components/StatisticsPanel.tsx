'use client'

import { useMemo } from 'react'
import type { Model, FundingStage } from '../app/game-config'
import { FundingProgress } from './FundingProgress'
import { ProgressBar } from './ProgressBar'

type HistoryPoint = {
  time: number
  value: number
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

type TrendChartCardProps = {
  title: string
  totalLabel: string
  totalValue: number
  history: HistoryPoint[]
  lineColor: string
  areaColor: string
  valueFormatter?: (value: number) => string
}

function TrendChartCard({
  title,
  totalLabel,
  totalValue,
  history,
  lineColor,
  areaColor,
  valueFormatter,
}: TrendChartCardProps) {
  const width = 720
  const height = 180
  const padding = 14
  const formatValue = valueFormatter ?? ((value: number) => `$${formatNumber(value)}`)

  const points = useMemo(() => {
    if (history.length === 0) return [{ x: padding, y: height - padding }]
    const values = history.map((point) => point.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = Math.max(1, max - min)
    const stepX = (width - padding * 2) / Math.max(1, history.length - 1)

    return history.map((point, index) => {
      const x = padding + index * stepX
      const normalized = (point.value - min) / span
      const y = height - padding - normalized * (height - padding * 2)
      return { x, y }
    })
  }, [history])

  const linePath = useMemo(() => {
    if (points.length === 0) return ''
    return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  }, [points])

  const areaPath = useMemo(() => {
    if (points.length === 0) return ''
    const first = points[0]
    const last = points[points.length - 1]
    return `${linePath} L ${last.x} ${height - padding} L ${first.x} ${height - padding} Z`
  }, [height, linePath, padding, points])

  const latest = history[history.length - 1]?.value ?? 0
  const start = history[0]?.value ?? 0
  const delta = latest - start

  return (
    <div
      className="flex w-full flex-col gap-3 rounded-xl px-3 py-3"
      style={{
        border: '1px solid #d9d9d9',
        boxShadow: '0px 2px 0px 0px #cdcdcd',
        background: '#fbfbfb',
      }}
    >
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col">
          <p
            style={{
              fontFamily: 'var(--sds-typography-family-serif, "Noto Serif", serif)',
              fontSize: 20,
              fontWeight: 600,
              lineHeight: 1.2,
              color: 'black',
            }}
          >
            {title}
          </p>
          <p
            style={{
              fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
              fontSize: 14,
              fontWeight: 700,
              lineHeight: 1.3,
              color: '#6b7280',
            }}
          >
            {totalLabel} {formatValue(totalValue)}
          </p>
        </div>
        <p
          style={{
            fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1.3,
            color: delta >= 0 ? '#1fc46a' : '#ef4444',
            whiteSpace: 'nowrap',
          }}
        >
          {delta >= 0 ? '+' : '-'}{formatValue(Math.abs(delta))} in window
        </p>
      </div>

      <div className="w-full overflow-hidden rounded-lg" style={{ background: '#f5f5f5' }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[180px] w-full" preserveAspectRatio="none" aria-label={`${title} trend chart`}>
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#d4d4d4" strokeWidth={1} />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e5e7eb" strokeWidth={1} />
          <line x1={padding} y1={(height - padding * 2) * 0.33 + padding} x2={width - padding} y2={(height - padding * 2) * 0.33 + padding} stroke="#ececec" strokeWidth={1} />
          <line x1={padding} y1={(height - padding * 2) * 0.66 + padding} x2={width - padding} y2={(height - padding * 2) * 0.66 + padding} stroke="#ececec" strokeWidth={1} />
          {areaPath && <path d={areaPath} fill={areaColor} />}
          {linePath && <path d={linePath} fill="none" stroke={lineColor} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
      </div>

      <div className="flex items-center justify-between">
        <p
          style={{
            fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.3,
            color: '#9ca3af',
          }}
        >
          Start {formatValue(start)}
        </p>
        <p
          style={{
            fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
            fontSize: 13,
            fontWeight: 700,
            lineHeight: 1.3,
            color: '#4b5563',
          }}
        >
          Latest {formatValue(latest)}
        </p>
      </div>
    </div>
  )
}

export type StatisticsPanelProps = {
  tokens: number
  totalEarned: number
  lifetimeRevenue: number
  lifetimeCosts: number
  elapsedGameSeconds: number
  lifetimeProfitHistory: HistoryPoint[]
  lifetimeCostHistory: HistoryPoint[]
  cashHistory: HistoryPoint[]
  userbaseHistory: HistoryPoint[]
  usersPerSecondHistory: HistoryPoint[]
  profitPerSecondHistory: HistoryPoint[]
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
  lifetimeCosts,
  elapsedGameSeconds,
  lifetimeProfitHistory,
  lifetimeCostHistory,
  cashHistory,
  userbaseHistory,
  usersPerSecondHistory,
  profitPerSecondHistory,
  usersPerSecond,
  clickPower,
  currentStageIndex,
  userbase,
  profitPerSecond,
  unlockedModels,
  totalModels,
  nextStage,
}: StatisticsPanelProps) {
  const generalRows: Array<{ label: string; value: string }> = [
    { label: 'Cash in bank:', value: `$${formatNumber(tokens)}` },
    { label: 'Money earned (this startup):', value: `$${formatNumber(totalEarned)}` },
    { label: 'Money earned (all time):', value: `$${formatNumber(lifetimeRevenue)}` },
    { label: 'Users per second:', value: formatNumber(usersPerSecond) },
    { label: 'User attract clicks:', value: formatNumber(clickPower) },
    { label: 'Time elapsed:', value: formatElapsed(elapsedGameSeconds) },
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

      {/* Lifetime profits */}
      <div className="flex flex-col gap-4 items-start w-full shrink-0">
        <SectionHeading>Lifetime profits</SectionHeading>
        <TrendChartCard
          title="Net profit"
          totalLabel="Total"
          totalValue={lifetimeRevenue}
          history={lifetimeProfitHistory}
          lineColor="#1fc46a"
          areaColor="rgba(31,196,106,0.16)"
        />
      </div>

      {/* Lifetime costs */}
      <div className="flex flex-col gap-4 items-start w-full shrink-0">
        <SectionHeading>Lifetime costs</SectionHeading>
        <TrendChartCard
          title="Operating cost"
          totalLabel="Total"
          totalValue={lifetimeCosts}
          history={lifetimeCostHistory}
          lineColor="#f97316"
          areaColor="rgba(249,115,22,0.16)"
        />
      </div>

      <div className="flex flex-col gap-4 items-start w-full shrink-0">
        <SectionHeading>Cash balance</SectionHeading>
        <TrendChartCard
          title="Treasury balance"
          totalLabel="Current"
          totalValue={tokens}
          history={cashHistory}
          lineColor="#2563eb"
          areaColor="rgba(37,99,235,0.16)"
        />
      </div>

      <div className="flex flex-col gap-4 items-start w-full shrink-0">
        <SectionHeading>User growth</SectionHeading>
        <TrendChartCard
          title="Active users"
          totalLabel="Current"
          totalValue={Math.floor(userbase)}
          history={userbaseHistory}
          lineColor="#0ea5a4"
          areaColor="rgba(14,165,164,0.16)"
          valueFormatter={(value) => formatNumber(value)}
        />
      </div>

      <div className="flex flex-col gap-4 items-start w-full shrink-0">
        <SectionHeading>User throughput</SectionHeading>
        <TrendChartCard
          title="Users per second"
          totalLabel="Current"
          totalValue={usersPerSecond}
          history={usersPerSecondHistory}
          lineColor="#8b5cf6"
          areaColor="rgba(139,92,246,0.16)"
          valueFormatter={(value) => `${formatNumber(value)}/s`}
        />
      </div>

      <div className="flex flex-col gap-4 items-start w-full shrink-0">
        <SectionHeading>Profit velocity</SectionHeading>
        <TrendChartCard
          title="Net income per second"
          totalLabel="Current"
          totalValue={profitPerSecond}
          history={profitPerSecondHistory}
          lineColor="#dc2626"
          areaColor="rgba(220,38,38,0.16)"
          valueFormatter={(value) => `$${formatNumber(value)}/s`}
        />
      </div>
    </div>
  )
}
