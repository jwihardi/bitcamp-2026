'use client'

import { GameProvider } from '../context/GameContext'
import { HUD } from '../components/HUD'
import { AgentGrid } from '../components/AgentGrid'
import { TipCard } from '../components/TipCard'
import { GameOverScreen } from '../components/GameOverScreen'
import { IPOScreen } from '../components/IPOScreen'

export default function Home() {
  return (
    <GameProvider>
      <HUD />
      <main>
        <AgentGrid />
      </main>
      <TipCard />
      <GameOverScreen />
      <IPOScreen />
    </GameProvider>
  )
}
