'use client'

import { useEffect, useState } from 'react'
import { useGame } from '../context/GameContext'
import { ROUNDS } from '../lib/constants'
import { checkMilestone } from '../lib/tickEngine'

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`
  return `$${n.toFixed(0)}`
}

function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function HUD() {
  const { state, dispatch } = useGame()
  const { round, arr, runway, users, features, vcChips, upgrades, phase } = state

  const config = ROUNDS[round]
  const [timerState, setTimerState] = useState(() => ({
    round,
    timeRemaining: config.timeLimit,
  }))

  useEffect(() => {
    if (phase === 'game_over' || phase === 'ipo' || phase === 'prestige_shop') return

    const id = setInterval(() => {
      setTimerState((current) => {
        if (current.round !== round) {
          return {
            round,
            timeRemaining: ROUNDS[round].timeLimit,
          }
        }

        if (current.timeRemaining <= 1) {
          dispatch({ type: 'GAME_OVER' })
          return { ...current, timeRemaining: 0 }
        }

        return {
          ...current,
          timeRemaining: current.timeRemaining - 1,
        }
      })
    }, 1000)

    return () => clearInterval(id)
  }, [phase, round, dispatch])

  const timeRemaining =
    timerState.round === round ? timerState.timeRemaining : config.timeLimit
  const hasPrestigeAccess =
    vcChips > 0 ||
    upgrades.fasterTicks > 0 ||
    upgrades.biggerBudget > 0 ||
    upgrades.promptTemplates

  useEffect(() => {
    if (phase !== 'playing') return
    const threshold = config.timeLimit * 0.2
    const milestoneMet = checkMilestone(state)
    if (timeRemaining <= threshold && !milestoneMet) {
      dispatch({ type: 'ENTER_BURN_MODE' })
    }
  }, [timeRemaining, phase, config.timeLimit, state, dispatch])

  return (
    <header>
      <span>{config.label}</span>

      <div>
        <span>ARR: {fmt(arr)} / {fmt(config.arr || 100_000_000)}</span>
        <progress value={config.arr ? arr : state.valuation} max={config.arr || 100_000_000} />
      </div>

      {config.users != null && (
        <span>Users: {users.toLocaleString()} / {config.users.toLocaleString()}</span>
      )}

      {config.features != null && (
        <span>Features: {Math.floor(features)} / {config.features}</span>
      )}

      <span>Time: {fmtTime(timeRemaining)}</span>

      <span>Runway: {fmt(runway)}</span>

      {vcChips > 0 && <span>VC Chips: {vcChips}</span>}

      {hasPrestigeAccess && phase === 'playing' && (
        <button type="button" onClick={() => dispatch({ type: 'OPEN_PRESTIGE_SHOP' })}>
          Chip Shop
        </button>
      )}

      {phase === 'burn_mode' && <span>⚠ Burn mode active</span>}
    </header>
  )
}
