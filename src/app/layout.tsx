import type { Metadata } from 'next'
import './globals.css'

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
        <NavBar className="sticky top-6 flex justify-center z-50" />
        {children}
      </body>
    </html>
  )
}
