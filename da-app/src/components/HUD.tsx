'use client'

import { useEffect, useRef, useState } from 'react'
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
  const { round, arr, runway, users, features, vcChips, phase } = state

  const config = ROUNDS[round]
  const [timeRemaining, setTimeRemaining] = useState(config.timeLimit)

  // Reset timer when round changes
  const prevRound = useRef(round)
  useEffect(() => {
    if (prevRound.current !== round) {
      setTimeRemaining(ROUNDS[round].timeLimit)
      prevRound.current = round
    }
  }, [round])

  // Countdown
  useEffect(() => {
    if (phase === 'game_over' || phase === 'ipo' || phase === 'prestige_shop') return

    const id = setInterval(() => {
      setTimeRemaining(t => {
        if (t <= 1) {
          dispatch({ type: 'GAME_OVER' })
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => clearInterval(id)
  }, [phase, dispatch])

  // Burn mode trigger
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

      {phase === 'burn_mode' && <span>⚠ Burn mode active</span>}
    </header>
  )
}
