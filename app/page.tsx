import Link from 'next/link'
import { Zap, ArrowRight } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#09090b' }}>
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
            <Zap size={14} className="text-white fill-white" />
          </div>
          <span className="text-sm font-bold text-white">ClipForge</span>
        </div>
        <Link
          href="/auth"
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <div className="max-w-2xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 text-xs text-zinc-400">
            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
            AI-powered video marketing
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-[1.1] tracking-tight">
            Generate short-form video
            <br />
            <span className="text-zinc-500">for every platform</span>
          </h1>

          <p className="text-base text-zinc-500 max-w-md mx-auto leading-relaxed">
            Paste your website URL. ClipForge scrapes it, builds a brand brief,
            and generates TikToks, Reels, and Shorts automatically.
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/auth"
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-5 py-3 rounded-xl transition-all duration-200 shadow-xl shadow-orange-500/20 hover:shadow-orange-500/30"
            >
              Get started <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mt-20 w-full">
          {[
            { title: '4 video engines', desc: 'Wall of Text, Hook + Demo, Green Screen Meme, Reddit Video — all running in parallel.' },
            { title: 'Swipe to curate', desc: 'Tinder-style card UI. Swipe right to save, left to skip. New videos generate automatically.' },
            { title: 'Post everywhere', desc: 'Schedule or post instantly to TikTok, Instagram Reels, and YouTube Shorts.' },
          ].map((f, i) => (
            <div key={i} className="p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/30">
              <p className="text-sm font-medium text-white mb-1.5">{f.title}</p>
              <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-5 flex items-center justify-center gap-4">
        <p className="text-xs text-zinc-700">Local-first. Your API keys, your machine, your content.</p>
        <span className="text-zinc-800">·</span>
        <Link href="/terms" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Terms</Link>
        <Link href="/privacy" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Privacy</Link>
      </footer>
    </div>
  )
}
