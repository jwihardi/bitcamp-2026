import type { Metadata } from 'next'
import './globals.css'
import { GlobalClickAudio } from '@/components/GlobalClickAudio'

export const metadata: Metadata = {
  title: 'AI Agent Empire',
  description: 'Bitcamp 2026 idle game',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <GlobalClickAudio />
        {children}
      </body>
    </html>
  )
}
