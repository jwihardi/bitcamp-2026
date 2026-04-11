'use client'

import { useGame } from '../context/GameContext'

export function TipCard() {
  const { state, dispatch } = useGame()
  const tip = state.activeTipCard

  if (!tip) return null

  const dismiss = () => dispatch({ type: 'DISMISS_TIP_CARD' })

  return (
    <aside>
      {tip.concept && <span>{tip.concept}</span>}
      <h3>{tip.title}</h3>
      <p>{tip.body}</p>
      <button onClick={dismiss}>{tip.dismissLabel}</button>
    </aside>
  )
}
