'use client'
import { CalendarDays } from 'lucide-react'
import Link from 'next/link'

export default function CalendarPage() {
  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <CalendarDays size={15} className="text-orange-400" />
        </div>
        <h1 className="text-lg font-bold text-white">Calendar</h1>
      </div>

      <div className="flex flex-col items-center justify-center py-20 gap-5 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <CalendarDays size={28} className="text-zinc-600" />
        </div>
        <div className="text-center space-y-1.5">
          <h2 className="text-white font-semibold">Scheduling coming soon</h2>
          <p className="text-zinc-500 text-sm max-w-xs">
            Schedule saved videos directly to TikTok, Instagram and YouTube from here.
          </p>
        </div>
        <Link href="/library"
          className="mt-2 px-4 py-2.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 rounded-xl text-sm font-medium transition-all duration-150">
          Go to Library →
        </Link>
      </div>
    </div>
  )
}
