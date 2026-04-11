import type { Metadata } from 'next'
import { GameProvider } from '@/context/GameContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vibe Combinator',
  description: 'Bitcamp 2026 startup sim',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <GameProvider>{children}</GameProvider>
      </body>
    </html>
  )
}
