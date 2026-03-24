'use client'
import { useEffect, useState } from 'react'
import { CalendarDays, Trash2, Check, Clock, AlertCircle, Send } from 'lucide-react'
import Link from 'next/link'

interface ScheduledPost {
  id: string
  platform: string
  scheduled_at: string
  caption: string
  status: string
  posted_at: string | null
  error_msg: string | null
  videos: {
    public_url: string
    thumbnail: string
    engine: string
    caption: string
  } | null
}

const PLATFORM_LABELS: Record<string, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
}

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: 'bg-pink-500/20 text-pink-300 border-pink-500/20',
  instagram: 'bg-purple-500/20 text-purple-300 border-purple-500/20',
  youtube: 'bg-red-500/20 text-red-300 border-red-500/20',
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  scheduled: <Clock size={12} className="text-orange-400" />,
  posting: <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />,
  posted: <Check size={12} className="text-emerald-400" />,
  error: <AlertCircle size={12} className="text-red-400" />,
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  posting: 'Posting...',
  posted: 'Posted',
  error: 'Failed',
}

export default function CalendarPage() {
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    const res = await fetch('/api/schedule')
    const data = await res.json()
    setPosts(data)
    setLoading(false)
  }

  async function cancelPost(id: string) {
    await fetch(`/api/schedule?id=${id}`, { method: 'DELETE' })
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  const upcoming = posts.filter(p => p.status === 'scheduled')
  const past = posts.filter(p => p.status !== 'scheduled')

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <CalendarDays size={15} className="text-orange-400" />
        </div>
        <h1 className="text-lg font-bold text-white">Calendar</h1>
        <span className="ml-1 text-xs font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full">
          {upcoming.length} upcoming
        </span>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-5 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <CalendarDays size={28} className="text-zinc-600" />
          </div>
          <div className="text-center space-y-1.5">
            <h2 className="text-white font-semibold">No scheduled posts</h2>
            <p className="text-zinc-500 text-sm max-w-xs">
              Go to your Library and schedule videos to TikTok, Instagram, or YouTube.
            </p>
          </div>
          <Link href="/library"
            className="mt-2 px-4 py-2.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 rounded-xl text-sm font-medium transition-all duration-150">
            Go to Library
          </Link>
        </div>
      ) : (
        <>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-400">Upcoming</h2>
              {upcoming.map(post => (
                <PostCard key={post.id} post={post} onCancel={cancelPost} />
              ))}
            </div>
          )}

          {/* Past / completed */}
          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-400">History</h2>
              {past.map(post => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PostCard({ post, onCancel }: { post: ScheduledPost; onCancel?: (id: string) => void }) {
  const dt = new Date(post.scheduled_at)
  const dateStr = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const timeStr = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60 hover:border-zinc-700/60 transition-all">
      {/* Thumbnail */}
      <div className="w-12 h-20 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
        {post.videos?.thumbnail && (
          <img src={post.videos.thumbnail} alt="" className="w-full h-full object-cover" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${PLATFORM_COLORS[post.platform]}`}>
            {PLATFORM_LABELS[post.platform]}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-zinc-500">
            {STATUS_ICONS[post.status]}
            {STATUS_LABELS[post.status]}
          </span>
        </div>
        <p className="text-xs text-zinc-300 truncate">{post.caption || 'No caption'}</p>
        <p className="text-[10px] text-zinc-500 mt-0.5">{dateStr} at {timeStr}</p>
        {post.error_msg && (
          <p className="text-[10px] text-red-400 mt-0.5 truncate">{post.error_msg}</p>
        )}
      </div>

      {/* Cancel button */}
      {post.status === 'scheduled' && onCancel && (
        <button
          onClick={() => onCancel(post.id)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}
