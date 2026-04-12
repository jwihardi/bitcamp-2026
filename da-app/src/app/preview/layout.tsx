import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-inter',
})

export default function PreviewLayout({ children }: { children: ReactNode }) {
  return <div className={`${inter.variable} ${inter.className}`}>{children}</div>
}
