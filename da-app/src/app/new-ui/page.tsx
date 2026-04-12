'use client'

import { GameProvider } from '@/context/GameContext'
import { Header } from '@/components/Header'
import { RightPanel } from '@/components/RightPanel'

export default function NewUIPage() {
  return (
    <GameProvider>
      <div className="flex flex-col h-screen" style={{ background: 'white' }}>
        <Header />
        <div className="flex flex-1 overflow-hidden">
          {/* Left pane */}
          <div className="flex-1 border-r" style={{ borderColor: '#d9d9d9' }} />
          {/* Center pane */}
          <div className="flex-1" />
          {/* Right pane */}
          <RightPanel />
        </div>
      </div>
    </GameProvider>
  )
}
