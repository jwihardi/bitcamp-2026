'use client'

import { useGame } from '../context/GameContext'

export function ChaosEventCard() {
  const { state, dispatch } = useGame()
  const event = state.activeChaosEvent

  if (!event) return null

  return (
    <aside>
      <p>Chaos event</p>
      <h3>{event.title}</h3>
      <p>{event.description}</p>
      <p>{event.penaltyDescription}</p>
      <button type="button" onClick={() => dispatch({ type: 'DISMISS_CHAOS_EVENT' })}>
        Dismiss
      </button>
    </aside>
  )
}
