'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Zap, BookImage, CalendarDays, BarChart2, Link2, Plus, LogOut } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

const nav = [
  { href: '/blitz', label: 'Blitz', icon: Zap },
  { href: '/library', label: 'Library', icon: BookImage },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/connections', label: 'Connections', icon: Link2 },
]

export default function Sidebar() {
  const path = usePathname()
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <aside className="w-52 bg-[#09090b] border-r border-zinc-800/50 flex flex-col py-5 px-3 shrink-0">
      {/* Logo */}
      <div className="mb-8 px-3 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
          <Zap size={14} className="text-white fill-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white leading-tight">ClipForge</h1>
          <p className="text-[10px] text-zinc-500 leading-tight">AI Video Engine</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const isActive = path === href
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-orange-500/10 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-orange-500 rounded-r-full" />
              )}
              <Icon size={15} className={isActive ? 'text-orange-400' : ''} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="mt-auto pt-4 border-t border-zinc-800/60 space-y-1">
        <Link
          href="/onboarding"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-orange-400 border border-orange-500/30 hover:bg-orange-500/10 hover:border-orange-500/50 transition-all duration-200"
        >
          <Plus size={14} />
          New Brand
        </Link>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300 transition-all duration-200"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
