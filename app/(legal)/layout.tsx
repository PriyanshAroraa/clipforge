import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: '#09090b' }}>
      <header className="flex items-center justify-between px-6 py-5 max-w-3xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
            <Zap size={14} className="text-white fill-white" />
          </div>
          <span className="text-sm font-bold text-white">ClipForge</span>
        </Link>
        <Link href="/auth" className="text-sm text-zinc-400 hover:text-white transition-colors">
          Sign in
        </Link>
      </header>
      <main className="max-w-3xl mx-auto px-6 pb-20">
        {children}
      </main>
    </div>
  )
}
