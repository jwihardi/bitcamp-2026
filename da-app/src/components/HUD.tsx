'use client'

import { useEffect, useRef, useState } from 'react'
import { useGame } from '../context/GameContext'
import { DAY_DURATION_SECONDS, ROUNDS } from '../lib/constants'

function fmtMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`
  return `$${n.toFixed(0)}`
}

function fmtCount(n: number) {
  return n.toLocaleString()
}

export function HUD() {
  const { state, dispatch } = useGame()
  const { round, arr, runway, users, features, vcChips, upgrades, phase } = state
  const config = ROUNDS[round]

  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Count up while the game is active; pause during end/shop screens.
  useEffect(() => {
    if (phase === 'game_over' || phase === 'ipo' || phase === 'prestige_shop') return
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [phase])

  // Reset day counter when a new run begins (tickCount drops back to 0).
  const prevTickCountRef = useRef(state.tickCount)
  useEffect(() => {
    if (state.tickCount === 0 && prevTickCountRef.current !== 0) {
      const id = window.setTimeout(() => setElapsedSeconds(0), 0)
      prevTickCountRef.current = state.tickCount
      return () => window.clearTimeout(id)
    }
    prevTickCountRef.current = state.tickCount
  }, [state.tickCount])

  const currentDay = Math.floor(elapsedSeconds / DAY_DURATION_SECONDS) + 1

  const [advanceBanner, setAdvanceBanner] = useState<{
    roundLabel: string
    slots: number
  } | null>(null)
  const [showFlash, setShowFlash] = useState(false)

  const previousRoundRef = useRef(round)
  useEffect(() => {
    if (previousRoundRef.current === round) return

    const bannerId = window.setTimeout(() => {
      setShowFlash(true)
      setAdvanceBanner({
        roundLabel: config.label,
        slots: config.agentSlotsUnlocked,
      })
    }, 0)
    const flashOffId = window.setTimeout(() => setShowFlash(false), 150)
    const bannerOffId = window.setTimeout(() => setAdvanceBanner(null), 3000)

    previousRoundRef.current = round

    return () => {
      window.clearTimeout(bannerId)
      window.clearTimeout(flashOffId)
      window.clearTimeout(bannerOffId)
    }
  }, [round, config.label, config.agentSlotsUnlocked])

  const hasPrestigeAccess =
    vcChips > 0 ||
    upgrades.fasterTicks > 0 ||
    upgrades.biggerBudget > 0 ||
    upgrades.promptTemplates

  const arrTarget = config.arr || 100_000_000
  const arrProgress = Math.min(100, (100 * (config.arr ? arr : state.valuation)) / arrTarget)
  const runwayTone = runway < 50_000 ? 'text-red-600' : 'text-stone-700'

  return (
    <>
      {showFlash && <div className="pointer-events-none fixed inset-0 z-40 bg-white/70" />}

      {advanceBanner && (
        <div className="pointer-events-none fixed left-1/2 top-6 z-50 -translate-x-1/2">
          <div className="rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-medium text-stone-900 shadow-xl">
            {advanceBanner.roundLabel} unlocked! {advanceBanner.slots} agent slots available.
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Funding Gate</p>
              <h1 className="mt-1 text-2xl font-semibold text-stone-950">{config.label}</h1>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-medium text-stone-700">Day {currentDay}</span>
              <span className={`font-medium ${runwayTone}`}>Runway: {fmtMoney(runway)} runway</span>
              {vcChips > 0 && <span className="text-stone-700">VC Chips: {vcChips}</span>}
              {hasPrestigeAccess && phase === 'playing' && (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'OPEN_PRESTIGE_SHOP' })}
                  className="rounded-full border border-stone-300 px-3 py-1.5 text-stone-700"
                >
                  Chip Shop
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
            <div className="rounded-2xl bg-stone-100 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-stone-700">
                  {fmtMoney(arr)} / {fmtMoney(arrTarget)} ARR
                </span>
                <span className="text-xs text-stone-500">{arrProgress.toFixed(0)}%</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-stone-200">
                <div
                  className="h-full rounded-full bg-stone-900 transition-[width] duration-300"
                  style={{ width: `${arrProgress}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl bg-stone-100 p-4">
              {config.users != null ? (
                <p className="text-sm font-medium text-stone-700">
                  {fmtCount(users)} / {fmtCount(config.users)} users
                </p>
              ) : config.features != null ? (
                <p className="text-sm font-medium text-stone-700">
                  {Math.floor(features)} / {config.features} features
                </p>
              ) : (
                <p className="text-sm font-medium text-stone-500">No secondary condition</p>
              )}
            </div>

            <div
              className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                phase === 'burn_mode'
                  ? 'bg-red-100 text-red-700 ring-2 ring-red-200'
                  : 'bg-stone-100 text-stone-700'
              }`}
            >
              {phase === 'burn_mode' ? 'Burn mode active' : 'Stable'}
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
