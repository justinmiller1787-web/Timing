import type { Metadata } from 'next'
import './globals.css'

import { Providers } from './providers'
import { NavBar } from '@/components/ui/tubelight-navbar'
import WarpBackground from '@/components/ui/wrap-shader'

export const metadata: Metadata = {
  title: 'Timing - Reverse Calendar',
  description: 'Log what you did',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="relative min-h-screen overflow-x-hidden">
        <WarpBackground />
        <Providers>
          <NavBar className="sticky top-6 flex justify-center z-50" />
          {children}
        </Providers>
      </body>
    </html>
  )
}
