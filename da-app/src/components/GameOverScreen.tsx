'use client'

import { useGame } from '../context/GameContext'
import { ROUNDS } from '../lib/constants'

export function GameOverScreen() {
  const { state, dispatch } = useGame()

  if (state.phase !== 'game_over') return null

  return (
    <div>
      <h1>Game Over</h1>
      <p>You made it to {ROUNDS[state.round].label}</p>
      <p>Peak ARR: ${state.arr.toLocaleString()}</p>
      <p>Ticks survived: {state.tickCount}</p>
      <button onClick={() => dispatch({ type: 'NEW_RUN' })}>Try again</button>
    </div>
  )
}
