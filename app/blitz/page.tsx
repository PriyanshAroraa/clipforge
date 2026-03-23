'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { Heart, X, RefreshCw, Zap } from 'lucide-react'
import Link from 'next/link'

interface Video {
  id: number
  engine: string
  public_url: string
  thumbnail: string
  caption: string
  duration_s: number
  file_size_mb: number
  swipe_action: string | null
}

const ENGINE_LABELS: Record<string, string> = {
  wall_of_text: 'Wall of Text',
  hook_demo: 'Hook + Demo',
  meme_video: 'Green Screen Meme',
  reddit_video: 'Reddit',
}

const ENGINE_COLORS: Record<string, string> = {
  wall_of_text: 'bg-blue-500/20 text-blue-300 border border-blue-500/20',
  hook_demo: 'bg-purple-500/20 text-purple-300 border border-purple-500/20',
  meme_video: 'bg-green-500/20 text-green-300 border border-green-500/20',
  reddit_video: 'bg-orange-500/20 text-orange-300 border border-orange-500/20',
}

export default function BlitzPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [dragX, setDragX] = useState(0)
  const startX = useRef(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const generatingRef = useRef(false)

  // Auto-generate more when running low
  const triggerGenerate = useCallback(async () => {
    if (generatingRef.current) return
    const brandId = typeof window !== 'undefined' ? localStorage.getItem('clipforge_brand_id') : null
    if (!brandId) return
    generatingRef.current = true
    setGenerating(true)
    try {
      await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: Number(brandId) })
      })
      // Poll until new videos appear then append them
      const poll = async () => {
        const res = await fetch('/api/videos?unswiped=true')
        const data = await res.json()
        if (data.length > 0) {
          setVideos(prev => {
            const existingIds = new Set(prev.map(v => v.id))
            const newOnes = data.filter((v: Video) => !existingIds.has(v.id))
            return newOnes.length > 0 ? [...prev, ...newOnes] : prev
          })
          generatingRef.current = false
          setGenerating(false)
          // Immediately queue another batch so there's always content ahead
          setTimeout(() => triggerGenerate(), 1000)
        } else {
          setTimeout(poll, 4000)
        }
      }
      setTimeout(poll, 5000)
    } catch {
      generatingRef.current = false
      setGenerating(false)
    }
  }, [])

  useEffect(() => {
    fetchVideos().then((count) => {
      if (count === 0) triggerGenerate()
    })
  }, [triggerGenerate])

  async function fetchVideos(): Promise<number> {
    setLoading(true)
    const res = await fetch('/api/videos?unswiped=true')
    const data = await res.json()
    setVideos(data)
    setIndex(0)
    setLoading(false)
    return data.length
  }

  async function swipe(action: 'saved' | 'skipped') {
    const video = videos[index]
    if (!video) return
    await fetch(`/api/videos/${video.id}/swipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    })
    setDragX(0)
    const nextIndex = index + 1
    setIndex(nextIndex)
    // Auto-generate when 4 cards left — keeps a rolling buffer
    const remaining = videos.length - nextIndex
    if (remaining <= 4) {
      triggerGenerate()
    }
  }

  // Pointer events for drag
  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX
    setDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return
    setDragX(e.clientX - startX.current)
  }
  function onPointerUp() {
    setDragging(false)
    if (dragX > 120) swipe('saved')
    else if (dragX < -120) swipe('skipped')
    else setDragX(0)
  }

  const current = videos[index]
  const next = videos[index + 1]
  const hasMore = index < videos.length

  // Loading state
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      {/* Skeleton card */}
      <div className="w-full max-w-[340px]" style={{ height: 600 }}>
        <div className="w-full h-full rounded-2xl bg-zinc-900 border border-zinc-800/60 overflow-hidden animate-pulse">
          <div className="w-full h-full bg-gradient-to-b from-zinc-800/60 to-zinc-900" />
        </div>
      </div>
    </div>
  )

  // Empty / generating state
  if (!hasMore || !current) return (
    <div className="flex flex-col items-center justify-center h-full gap-5 px-4">
      {generating ? (
        <>
          {/* Pulsing skeleton card */}
          <div className="relative w-full max-w-[340px] rounded-2xl overflow-hidden border border-zinc-800/60 bg-zinc-900"
            style={{ height: 600 }}>
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-800/40 to-zinc-900/80 animate-pulse" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-full border-[3px] border-orange-500 border-t-transparent animate-spin" />
              <div className="text-center space-y-1.5">
                <p className="text-white font-semibold text-sm">Generating content</p>
                <p className="text-zinc-500 text-xs">Running all 4 engines in parallel</p>
              </div>
              <div className="flex gap-1.5 mt-2">
                {[0,1,2].map(i => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs text-zinc-600 text-center">New videos will appear automatically</p>
        </>
      ) : (
        <>
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Zap size={28} className="text-zinc-600" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">0</span>
            </div>
          </div>
          <div className="text-center space-y-1.5">
            <h2 className="text-lg font-semibold text-white">You're all caught up!</h2>
            <p className="text-zinc-500 text-sm">Generating your next batch now...</p>
          </div>
          <div className="flex gap-3 mt-1">
            <button
              onClick={fetchVideos}
              className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-sm font-medium transition-all duration-200"
            >
              <RefreshCw size={13} /> Refresh
            </button>
            <Link
              href="/onboarding"
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-400 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-orange-500/25"
            >
              <Zap size={13} /> New Brand
            </Link>
          </div>
        </>
      )}
    </div>
  )

  const rotation = dragX * 0.06
  const saveOpacity = Math.min(dragX / 100, 1)
  const skipOpacity = Math.min(-dragX / 100, 1)

  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 py-6 px-4">

      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-[340px]">
        <h1 className="text-base font-bold text-white flex items-center gap-2">
          <Zap size={16} className="text-orange-400" />
          Blitz
        </h1>
        <div className="flex items-center gap-2">
          {generating && (
            <span className="flex items-center gap-1.5 text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
              generating
            </span>
          )}
          <span className="text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full">
            {videos.length - index} left
          </span>
        </div>
      </div>

      {/* Card stack */}
      <div className="relative w-full max-w-[340px]" style={{ height: 600 }}>

        {/* Card behind */}
        {next && (
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/60"
            style={{ transform: 'scale(0.95) translateY(14px)', zIndex: 10 }}
          >
            {next.thumbnail && (
              <img
                src={next.thumbnail}
                alt="Next video thumbnail"
                className="w-full h-full object-cover opacity-40"
              />
            )}
          </div>
        )}

        {/* Current card */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-700/50 cursor-grab active:cursor-grabbing select-none"
          style={{
            transform: `translateX(${dragX}px) rotate(${rotation}deg)`,
            transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            zIndex: 20,
            touchAction: 'none',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {/* Video */}
          <video
            ref={videoRef}
            src={current.public_url}
            poster={current.thumbnail || undefined}
            className="w-full h-full object-cover"
            autoPlay muted loop playsInline
          />

          {/* Top gradient overlay */}
          <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

          {/* Bottom heavy gradient overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

          {/* SAVE indicator */}
          {saveOpacity > 0.1 && (
            <div
              className="absolute top-10 left-5 rounded-xl px-4 py-2 rotate-[-15deg] border-[3px] border-emerald-400"
              style={{ opacity: saveOpacity }}
            >
              <span className="text-emerald-400 font-black text-2xl tracking-widest" style={{ textShadow: '0 0 20px rgba(52,211,153,0.5)' }}>
                SAVE
              </span>
            </div>
          )}

          {/* SKIP indicator */}
          {skipOpacity > 0.1 && (
            <div
              className="absolute top-10 right-5 rounded-xl px-4 py-2 rotate-[15deg] border-[3px] border-red-400"
              style={{ opacity: skipOpacity }}
            >
              <span className="text-red-400 font-black text-2xl tracking-widest" style={{ textShadow: '0 0 20px rgba(248,113,113,0.5)' }}>
                SKIP
              </span>
            </div>
          )}

          {/* Engine badge - frosted glass */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <span
              className={`text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-md ${ENGINE_COLORS[current.engine] || 'bg-white/10 text-white/80 border border-white/10'}`}
            >
              {ENGINE_LABELS[current.engine] || current.engine}
            </span>
          </div>

          {/* Caption */}
          <div className="absolute bottom-0 left-0 right-0 p-5 pt-12 z-10 pointer-events-none">
            {current.caption && (
              <p className="text-white text-sm font-medium leading-relaxed line-clamp-3">
                {current.caption}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => swipe('skipped')}
          className="w-14 h-14 rounded-full bg-[#18181b] border border-zinc-700 flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/40 transition-all duration-200 group"
        >
          <X size={20} className="text-zinc-400 group-hover:text-red-400 transition-colors" />
        </button>

        <button
          onClick={() => swipe('saved')}
          className="w-16 h-16 rounded-full bg-orange-500 hover:bg-orange-400 flex items-center justify-center transition-all duration-200 shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 active:scale-95"
        >
          <Heart size={22} className="text-white fill-white" />
        </button>
      </div>

      <p className="text-[11px] text-zinc-700 tracking-wide">
        Drag or tap buttons &nbsp;&bull;&nbsp; &larr; skip &nbsp;&bull;&nbsp; &rarr; save
      </p>
    </div>
  )
}
