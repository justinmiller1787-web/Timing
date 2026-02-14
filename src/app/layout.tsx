import type { Metadata } from 'next'
import './globals.css'
import 'react-datepicker/dist/react-datepicker.css'

import { NavBar } from '@/components/ui/tubelight-navbar'

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
      <body>
        <div className="fixed inset-0 -z-10 overflow-hidden bg-black">
          <div
            className="absolute w-[800px] h-[800px] left-1/2 top-1/2 animate-blur-circle-1"
            style={{
              background: 'radial-gradient(circle, #f0f0f0 0%, transparent 70%)',
              filter: 'blur(150px)',
            }}
          />
          <div
            className="absolute w-[800px] h-[800px] left-1/2 top-1/2 animate-blur-circle-2"
            style={{
              background: 'radial-gradient(circle, #2a2a2a 0%, transparent 70%)',
              filter: 'blur(150px)',
            }}
          />
          <div
            className="absolute w-[800px] h-[800px] left-1/2 top-1/2 animate-blur-circle-3"
            style={{
              background: 'radial-gradient(circle, #0a0a0a 0%, transparent 70%)',
              filter: 'blur(150px)',
            }}
          />
        </div>
        <NavBar className="sticky top-6 flex justify-center z-50" />
        {children}
      </body>
    </html>
  )
}
