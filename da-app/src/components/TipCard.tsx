'use client'

import { useEffect, useRef, useState } from 'react'
import { useGame } from '../context/GameContext'

export function TipCard() {
  const { activeTipCard, dismissTipCard } = useGame()
  const [isVisible, setIsVisible] = useState(false)
  const dismissTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!activeTipCard) {
      const hideId = window.setTimeout(() => {
        setIsVisible(false)
      }, 0)

      return () => window.clearTimeout(hideId)
    }

    const id = window.setTimeout(() => {
      setIsVisible(true)
    }, 0)

    return () => window.clearTimeout(id)
  }, [activeTipCard])

  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current != null) {
        window.clearTimeout(dismissTimeoutRef.current)
      }
    }
  }, [])

  if (!activeTipCard) return null

  const dismiss = () => {
    setIsVisible(false)

    if (dismissTimeoutRef.current != null) {
      window.clearTimeout(dismissTimeoutRef.current)
    }

    dismissTimeoutRef.current = window.setTimeout(() => {
      dismissTipCard()
      dismissTimeoutRef.current = null
    }, 250)
  }

  return (
    <>
      <button
        type="button"
        aria-label="Dismiss tip"
        className="fixed inset-0 z-40 bg-transparent"
        onClick={dismiss}
      />
      <aside
        className={`fixed bottom-4 right-4 z-50 w-[min(320px,calc(100vw-2rem))] rounded-2xl border border-black/10 bg-white p-4 text-left shadow-xl transition-all duration-250 ease-out ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
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
    </>
  )
}
