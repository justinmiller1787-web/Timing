import type { Metadata } from 'next'
import './globals.css'

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
        <nav className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex gap-6">
            <a href="/" className="text-gray-700 hover:text-blue-600 font-medium">
              Log
            </a>
            <a href="/timeline" className="text-gray-700 hover:text-blue-600 font-medium">
              Timeline
            </a>
            <a href="/analytics" className="text-gray-700 hover:text-blue-600 font-medium">
              Analytics
            </a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
