'use client'

import { useEffect, useRef } from 'react'

const CLICK_SOUND = '/click.mp3'
const CLICK_VOLUME = 0.6
const INTERACTIVE_SELECTOR = [
  'button',
  'a[href]',
  'select',
  'summary',
  'label[for]',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  '[role="button"]',
].join(', ')

export function GlobalClickAudio() {
  const baseAudioRef = useRef<HTMLAudioElement | null>(null)
  const activeSoundsRef = useRef<Set<HTMLAudioElement>>(new Set())

  useEffect(() => {
    const audio = new Audio(CLICK_SOUND)
    audio.preload = 'auto'
    audio.volume = CLICK_VOLUME
    baseAudioRef.current = audio

    const playClickSound = () => {
      const sound = baseAudioRef.current?.cloneNode() as HTMLAudioElement | undefined
      if (!sound) return
      sound.volume = CLICK_VOLUME
      activeSoundsRef.current.add(sound)
      void sound.play().catch(() => {
        activeSoundsRef.current.delete(sound)
      })
      sound.addEventListener(
        'ended',
        () => {
          activeSoundsRef.current.delete(sound)
        },
        { once: true },
      )
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('[data-skip-ui-click-sound="true"]')) return

      const interactive = target.closest(INTERACTIVE_SELECTOR)
      if (!interactive) return

      if (
        interactive instanceof HTMLButtonElement ||
        interactive instanceof HTMLInputElement ||
        interactive instanceof HTMLSelectElement
      ) {
        if (interactive.disabled) return
      }

      playClickSound()
    }

    document.addEventListener('pointerdown', handlePointerDown, true)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      activeSoundsRef.current.forEach((sound) => {
        sound.pause()
        sound.src = ''
      })
      activeSoundsRef.current.clear()
      audio.pause()
      audio.src = ''
      baseAudioRef.current = null
    }
  }, [])

  return null
}
