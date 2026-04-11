'use client'

import { useGame } from '../context/GameContext'

export function ChaosEventCard() {
  const { state, dispatch } = useGame()
  const event = state.activeChaosEvent

  if (!event) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center p-4 sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-stone-950/60" aria-hidden="true" />

      {/* Card */}
      <aside className="relative z-10 w-full max-w-md rounded-[28px] border border-red-200 bg-white p-6 shadow-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-red-500">
          Chaos Event
        </p>
        <h3 className="mt-2 text-lg font-semibold text-stone-950">{event.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">{event.description}</p>
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700">
          {event.penaltyDescription}
        </p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => dispatch({ type: 'DISMISS_CHAOS_EVENT' })}
            className="rounded-xl bg-stone-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700"
          >
            Understood
          </button>
        </div>
      </aside>
    </div>
  )
}
