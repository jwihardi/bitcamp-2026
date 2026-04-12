'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface GoldButtonProps {
  onClick?: () => void
  size?: number
  className?: string
}

interface Particle {
  id: number
  angle: number
}

const PARTICLE_COUNT = 8
const PLAYLIST = ['/mozart1.mp3', '/mozart2.mp3', '/mozart3.mp3'] as const
const PLAYLIST_VOLUME = 0.245
const COIN_SOUND = '/coin.mp3'
const COIN_VOLUME = 0.75

// Figma design constants (256px outer diameter)
// Stroke ring: 24px total → 12px inset per side
// Hard shadow: dy=12px, color #F6C343 (no blur)
const DESIGN_SIZE = 256
const RING_INSET = 12   // per side
const SHADOW_DY = 12
const INNER_SIZE = DESIGN_SIZE - RING_INSET * 2  // 232px

function SparkleParticle({ angle, id }: { angle: number; id: number }) {
  const tx = Math.cos(angle) * 90
  const ty = Math.sin(angle) * 90
  return (
    <motion.div
      key={id}
      className="pointer-events-none absolute"
      style={{ left: '50%', top: '50%' }}
      initial={{ x: '-50%', y: '-50%', opacity: 1, scale: 1 }}
      animate={{
        x: `calc(-50% + ${tx}px)`,
        y: `calc(-50% + ${ty}px)`,
        opacity: 0,
        scale: 0.3,
      }}
      transition={{ duration: 0.65, ease: 'easeOut' }}
    >
      {/* Particle uses the same sparkle star path, scaled to 14px */}
      <svg width="14" height="14" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M57.7103 5.22367C57.9845 3.75589 58.7633 2.4302 59.912 1.47621C61.0607 0.522217 62.5068 0 64 0C65.4932 0 66.9393 0.522217 68.088 1.47621C69.2367 2.4302 70.0155 3.75589 70.2897 5.22367L77.0145 40.7864C77.4921 43.3147 78.7208 45.6404 80.5402 47.4598C82.3597 49.2792 84.6853 50.5079 87.2137 50.9855L122.776 57.7103C124.244 57.9845 125.57 58.7633 126.524 59.912C127.478 61.0607 128 62.5068 128 64C128 65.4932 127.478 66.9393 126.524 68.088C125.57 69.2367 124.244 70.0155 122.776 70.2897L87.2137 77.0145C84.6853 77.4921 82.3597 78.7208 80.5402 80.5402C78.7208 82.3597 77.4921 84.6853 77.0145 87.2137L70.2897 122.776C70.0155 124.244 69.2367 125.57 68.088 126.524C66.9393 127.478 65.4932 128 64 128C62.5068 128 61.0607 127.478 59.912 126.524C58.7633 125.57 57.9845 124.244 57.7103 122.776L50.9855 87.2137C50.5079 84.6853 49.2792 82.3597 47.4598 80.5402C45.6404 78.7208 43.3147 77.4921 40.7864 77.0145L5.22367 70.2897C3.75589 70.0155 2.4302 69.2367 1.47621 68.088C0.522217 66.9393 0 65.4932 0 64C0 62.5068 0.522217 61.0607 1.47621 59.912C2.4302 58.7633 3.75589 57.9845 5.22367 57.7103L40.7864 50.9855C43.3147 50.5079 45.6404 49.2792 47.4598 47.4598C49.2792 45.6404 50.5079 43.3147 50.9855 40.7864L57.7103 5.22367Z"
          fill="#FFD700"
        />
      </svg>
    </motion.div>
  )
}

export function GoldButton({ onClick, size = 160, className }: GoldButtonProps) {
  const [particles, setParticles] = useState<Particle[]>([])
  const [nextId, setNextId] = useState(0)
  const playlistAudioRef = useRef<HTMLAudioElement | null>(null)
  const playlistIndexRef = useRef(0)
  const hasStartedPlaylistRef = useRef(false)
  const baseCoinAudioRef = useRef<HTMLAudioElement | null>(null)
  const activeCoinSoundsRef = useRef<Set<HTMLAudioElement>>(new Set())

  useEffect(() => {
    const audio = new Audio(PLAYLIST[0])
    audio.preload = 'auto'
    audio.volume = PLAYLIST_VOLUME
    baseCoinAudioRef.current = new Audio(COIN_SOUND)
    baseCoinAudioRef.current.preload = 'auto'
    baseCoinAudioRef.current.volume = COIN_VOLUME

    const handleEnded = () => {
      playlistIndexRef.current = (playlistIndexRef.current + 1) % PLAYLIST.length
      audio.src = PLAYLIST[playlistIndexRef.current]
      audio.load()
      void audio.play().catch(() => {})
    }

    const startPlaylist = () => {
      if (hasStartedPlaylistRef.current) return
      hasStartedPlaylistRef.current = true
      audio.volume = PLAYLIST_VOLUME
      void audio.play().catch(() => {
        hasStartedPlaylistRef.current = false
      })
    }

    audio.addEventListener('ended', handleEnded)
    playlistAudioRef.current = audio
    void audio.play().then(() => {
      hasStartedPlaylistRef.current = true
    }).catch(() => {})
    window.addEventListener('pointerdown', startPlaylist, { once: true })
    window.addEventListener('keydown', startPlaylist, { once: true })

    return () => {
      audio.pause()
      audio.removeEventListener('ended', handleEnded)
      audio.src = ''
      playlistAudioRef.current = null
      window.removeEventListener('pointerdown', startPlaylist)
      window.removeEventListener('keydown', startPlaylist)
      activeCoinSoundsRef.current.forEach((sound) => {
        sound.pause()
        sound.src = ''
      })
      activeCoinSoundsRef.current.clear()
      if (baseCoinAudioRef.current) {
        baseCoinAudioRef.current.pause()
        baseCoinAudioRef.current.src = ''
        baseCoinAudioRef.current = null
      }
    }
  }, [])

  const handleClick = useCallback(() => {
    const newParticles: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: nextId + i,
      angle: (i / PARTICLE_COUNT) * Math.PI * 2 - Math.PI / 2,
    }))

    if (!hasStartedPlaylistRef.current && playlistAudioRef.current) {
      hasStartedPlaylistRef.current = true
      playlistAudioRef.current.volume = PLAYLIST_VOLUME
      void playlistAudioRef.current.play().catch(() => {
        hasStartedPlaylistRef.current = false
      })
    }

    const coinSound = baseCoinAudioRef.current?.cloneNode() as HTMLAudioElement | undefined
    if (coinSound) {
      coinSound.volume = COIN_VOLUME
      activeCoinSoundsRef.current.add(coinSound)
      coinSound.currentTime = 0
      void coinSound.play().catch(() => {
        activeCoinSoundsRef.current.delete(coinSound)
      })
      coinSound.addEventListener(
        'ended',
        () => {
          activeCoinSoundsRef.current.delete(coinSound)
        },
        { once: true },
      )
    }

    setParticles(prev => [...prev, ...newParticles])
    setNextId(prev => prev + PARTICLE_COUNT)
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.some(np => np.id === p.id)))
    }, 1000)
    onClick?.()
  }, [nextId, onClick])

  const scale = size / DESIGN_SIZE
  const ringInset = Math.round(RING_INSET * scale)
  const shadowDy = Math.round(SHADOW_DY * scale)
  const innerSize = size - ringInset * 2

  // SVG viewBox for the inner coin area in design space:
  // inner coin spans from RING_INSET to DESIGN_SIZE-RING_INSET in design coords
  const innerVB = `${RING_INSET} ${RING_INSET} ${INNER_SIZE} ${INNER_SIZE}`

  // Gloss rectangle: 278×128 in design space, relative to inner coin (232px)
  const glossW = `${(278 / INNER_SIZE) * 100}%`
  const glossH = `${(128 / INNER_SIZE) * 100}%`

  return (
    <motion.button
      type="button"
      data-skip-ui-click-sound="true"
      onClick={handleClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      className={`relative cursor-pointer ${className ?? ''}`}
      style={{ width: size, height: size, flexShrink: 0 }}
    >
      {/* Hard drop shadow — #F6C343, dy=12 (no blur), sits behind everything */}
      <div
        className="absolute rounded-full"
        style={{
          top: shadowDy,
          left: 0,
          width: size,
          height: size,
          background: '#F6C343',
        }}
      />

      {/* Outer bright-yellow ring (#FAE45A) */}
      <div
        className="absolute rounded-full"
        style={{
          top: 0,
          left: 0,
          width: size,
          height: size,
          background: '#FAE45A',
        }}
      />

      {/* Inner coin body — overflow-hidden clips the glossy bar to the circle */}
      <div
        className="absolute rounded-full overflow-hidden"
        style={{
          top: ringInset,
          left: ringInset,
          width: innerSize,
          height: innerSize,
          background: '#F5C944',
        }}
      >
        {/*
          Star + dot + plus — exact Figma paths from node 26-399 full coin SVG.
          viewBox maps the inner coin region (12,12 → 244,244) of the 256px design.
          Rendered below the gloss so the semi-transparent bar overlays them.
        */}
        <svg
          viewBox={innerVB}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          {/* 4-pointed sparkle star */}
          <path
            d="M118.71 67.2237C118.984 65.7559 119.763 64.4302 120.912 63.4762C122.061 62.5222 123.507 62 125 62C126.493 62 127.939 62.5222 129.088 63.4762C130.237 64.4302 131.016 65.7559 131.29 67.2237L138.014 102.786C138.492 105.315 139.721 107.64 141.54 109.46C143.36 111.279 145.685 112.508 148.214 112.986L183.776 119.71C185.244 119.984 186.57 120.763 187.524 121.912C188.478 123.061 189 124.507 189 126C189 127.493 188.478 128.939 187.524 130.088C186.57 131.237 185.244 132.016 183.776 132.29L148.214 139.014C145.685 139.492 143.36 140.721 141.54 142.54C139.721 144.36 138.492 146.685 138.014 149.214L131.29 184.776C131.016 186.244 130.237 187.57 129.088 188.524C127.939 189.478 126.493 190 125 190C123.507 190 122.061 189.478 120.912 188.524C119.763 187.57 118.984 186.244 118.71 184.776L111.986 149.214C111.508 146.685 110.279 144.36 108.46 142.54C106.64 140.721 104.315 139.492 101.786 139.014L66.2237 132.29C64.7559 132.016 63.4302 131.237 62.4762 130.088C61.5222 128.939 61 127.493 61 126C61 124.507 61.5222 123.061 62.4762 121.912C63.4302 120.763 64.7559 119.984 66.2237 119.71L101.786 112.986C104.315 112.508 106.64 111.279 108.46 109.46C110.279 107.64 111.508 105.315 111.986 102.786L118.71 67.2237Z"
            fill="#EB9C37"
          />
          {/* Small dot — lower-left */}
          <circle cx="73.8123" cy="177.188" r="12.7985" fill="#EB9C37" />
          {/* Plus — upper-right, stroke-based (exact Figma paths) */}
          <path
            d="M176.188 62.0153V87.6092M188.985 74.8123H163.391"
            stroke="#EB9C37"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Glossy white bar — on top of icons, clipped to circle by overflow-hidden */}
        <div
          style={{
            position: 'absolute',
            width: glossW,
            height: glossH,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-45deg)',
            background: 'rgba(255, 255, 255, 0.20)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Click particle burst */}
      <AnimatePresence>
        {particles.map(p => (
          <SparkleParticle key={p.id} id={p.id} angle={p.angle} />
        ))}
      </AnimatePresence>
    </motion.button>
  )
}
