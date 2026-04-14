'use client'

import { usePathname } from 'next/navigation'
import { NavBar } from '@/components/ui/tubelight-navbar'
import { useAuth } from '@/lib/auth'
import { StaticTaskSidebar } from '@/components/StaticTaskSidebar'

const SIDEBAR_PATHS = new Set(['/', '/timeline', '/analytics'])

export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const showSidebar = Boolean(user) && SIDEBAR_PATHS.has(pathname)

  return (
    <div className="relative z-10 min-h-screen">
      <NavBar className="sticky top-6 flex justify-center z-50" />
      {showSidebar ? (
        <div className="mx-auto w-full max-w-[1360px] px-4 pb-8 sm:px-6">
          <div className="flex items-start justify-center gap-6">
            <div className="min-w-0 flex-1 max-w-[980px]">{children}</div>
            <StaticTaskSidebar />
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  )
}
