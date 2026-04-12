'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useGame } from '../context/GameContext'

const AUTO_DISMISS_MS = 5000

export function TipCard() {
  const { activeTipCard, dismissTipCard } = useGame()
  const [isVisible, setIsVisible] = useState(false)
  const dismissTimeoutRef = useRef<number | null>(null)
  const autoDismissTimeoutRef = useRef<number | null>(null)

  const dismiss = useCallback(() => {
    setIsVisible(false)

    if (autoDismissTimeoutRef.current != null) {
      window.clearTimeout(autoDismissTimeoutRef.current)
      autoDismissTimeoutRef.current = null
    }

    if (dismissTimeoutRef.current != null) {
      window.clearTimeout(dismissTimeoutRef.current)
    }

    dismissTimeoutRef.current = window.setTimeout(() => {
      dismissTipCard()
      dismissTimeoutRef.current = null
    }, 250)
  }, [dismissTipCard])

  useEffect(() => {
    if (!activeTipCard) {
      if (autoDismissTimeoutRef.current != null) {
        window.clearTimeout(autoDismissTimeoutRef.current)
        autoDismissTimeoutRef.current = null
      }

      const hideId = window.setTimeout(() => {
        setIsVisible(false)
      }, 0)

      return () => window.clearTimeout(hideId)
    }

    const id = window.setTimeout(() => {
      setIsVisible(true)
    }, 0)

    autoDismissTimeoutRef.current = window.setTimeout(() => {
      dismiss()
    }, AUTO_DISMISS_MS)

    return () => {
      window.clearTimeout(id)
      if (autoDismissTimeoutRef.current != null) {
        window.clearTimeout(autoDismissTimeoutRef.current)
        autoDismissTimeoutRef.current = null
      }
    }
  }, [activeTipCard, dismiss])

  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current != null) {
        window.clearTimeout(dismissTimeoutRef.current)
      }
      if (autoDismissTimeoutRef.current != null) {
        window.clearTimeout(autoDismissTimeoutRef.current)
      }
    }
  }, [])

  if (!activeTipCard) return null

  return (
    <aside
      className={`fixed left-4 top-4 z-50 w-[min(320px,calc(100vw-2rem))] rounded-2xl border border-black/10 bg-white p-4 text-left shadow-xl transition-all duration-[250ms] ease-out ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'
      }`}
    >
      {activeTipCard.concept && (
        <span className="mb-2 inline-flex rounded-full bg-stone-100 px-2 py-1 text-[11px] font-medium text-stone-700">
          {activeTipCard.concept}
        </span>
      )}
      <h3 className="text-sm font-medium text-stone-950">{activeTipCard.title}</h3>
      <p className="mt-2 text-[13px] leading-5 text-stone-700">{activeTipCard.body}</p>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg bg-stone-900 px-3 py-2 text-xs font-medium text-white"
        >
          {activeTipCard.dismissLabel}
        </button>
      </div>
    </aside>
  )
}
