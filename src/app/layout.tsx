import type { Metadata } from 'next'
import './globals.css'

import { Providers } from './providers'
import { MainShell } from '@/components/MainShell'
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
      <body className="relative min-h-screen overflow-x-hidden bg-[hsl(215,100%,10%)] text-slate-100 antialiased">
        <WarpBackground />
        <Providers>
          <MainShell>{children}</MainShell>
        </Providers>
      </body>
    </html>
  )
}
