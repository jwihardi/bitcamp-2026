'use client'

import { HUD } from '../components/HUD'
import { AgentGrid } from '../components/AgentGrid'
import { TipCard } from '../components/TipCard'
import { GameOverScreen } from '../components/GameOverScreen'
import { IPOScreen } from '../components/IPOScreen'
import { useGame } from '../context/GameContext'

function HomeContent() {
  const { state } = useGame()

  return (
    <div
      className={`min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,245,244,0.95),_rgba(231,229,228,0.75)_40%,_rgba(214,211,209,0.65))] ${
        state.phase === 'burn_mode' ? 'animate-[pulse_2s_ease-in-out_infinite]' : ''
      }`}
    >
      <HUD />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <AgentGrid />
      </main>
      <TipCard />
      <GameOverScreen />
      <IPOScreen />
    </div>
  )
}

export default function Home() {
  return <HomeContent />
}
