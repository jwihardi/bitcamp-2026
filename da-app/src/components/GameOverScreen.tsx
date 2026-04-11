'use client'

import { useGame } from '../context/GameContext'
import { ROUNDS } from '../lib/constants'

function fmtMoney(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`
  return `$${value.toFixed(0)}`
}

export function GameOverScreen() {
  const { state, dispatch } = useGame()

  if (state.phase !== 'game_over') return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-4">
      <div className="w-full max-w-xl rounded-[28px] bg-white p-8 text-center shadow-2xl">
        <p className="text-xs uppercase tracking-[0.35em] text-stone-500">Game Over</p>
        <h1 className="mt-3 text-4xl font-semibold text-stone-950">You made it to {ROUNDS[state.round].label}</h1>
        <p className="mt-4 text-stone-600">Peak ARR: {fmtMoney(state.arr)} ARR</p>
        <p className="mt-2 text-stone-600">Ticks survived: {state.tickCount}</p>
        <button
          type="button"
          onClick={() => dispatch({ type: 'NEW_RUN' })}
          className="mt-8 rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
