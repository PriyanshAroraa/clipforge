'use client'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

const FULL_SCREEN_ROUTES = ['/', '/auth', '/onboarding', '/terms', '/privacy']

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isFullScreen = FULL_SCREEN_ROUTES.includes(pathname)

  if (isFullScreen) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
