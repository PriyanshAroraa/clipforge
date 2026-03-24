'use client'
import { useEffect, useState } from 'react'
import { BookImage, Download, Calendar, Play, X, Send, Check, AlertCircle } from 'lucide-react'

interface Video {
  id: string; engine: string; public_url: string; thumbnail: string
  caption: string; file_size_mb: number; brands?: { name: string }; swiped_at: string
}

interface PlatformConnection {
  platform: string
  platform_username: string | null
}

const ENGINE_LABELS: Record<string, string> = {
  wall_of_text: 'Wall of Text', hook_demo: 'Hook + Demo',
  meme_video: 'Green Screen Meme', reddit_video: 'Reddit',
}

const ENGINE_PILL_COLORS: Record<string, string> = {
  wall_of_text: 'bg-blue-500/20 text-blue-300',
  hook_demo: 'bg-purple-500/20 text-purple-300',
  meme_video: 'bg-green-500/20 text-green-300',
  reddit_video: 'bg-orange-500/20 text-orange-300',
}

const FILTER_TABS = ['All', 'Wall of Text', 'Hook + Demo', 'Meme', 'Reddit']
const TAB_ENGINE_MAP: Record<string, string> = {
  'Wall of Text': 'wall_of_text',
  'Hook + Demo': 'hook_demo',
  'Meme': 'meme_video',
  'Reddit': 'reddit_video',
}

export default function LibraryPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Video | null>(null)
  const [activeTab, setActiveTab] = useState('All')
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [showPostModal, setShowPostModal] = useState(false)
  const [postPlatform, setPostPlatform] = useState<string | null>(null)
  const [postCaption, setPostCaption] = useState('')
  const [postLoading, setPostLoading] = useState(false)
  const [postResult, setPostResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')

  useEffect(() => {
    fetch('/api/library').then(r => r.json()).then(d => { setVideos(d); setLoading(false) })
    fetch('/api/platforms').then(r => r.json()).then(d => setConnections(d || []))
  }, [])

  function openPostModal(video: Video) {
    setSelected(video)
    setShowPostModal(true)
    setPostCaption(video.caption || '')
    setPostPlatform(null)
    setPostResult(null)
    setShowSchedule(false)
  }

  async function postNow() {
    if (!selected || !postPlatform) return
    setPostLoading(true)
    setPostResult(null)
    const res = await fetch('/api/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: selected.id, platform: postPlatform, caption: postCaption }),
    })
    const data = await res.json()
    setPostLoading(false)
    if (res.ok) {
      setPostResult({ type: 'success', msg: `Posted to ${postPlatform}!` })
    } else {
      setPostResult({ type: 'error', msg: data.error || 'Post failed' })
    }
  }

  async function schedulePost() {
    if (!selected || !postPlatform || !scheduleDate || !scheduleTime) return
    setPostLoading(true)
    setPostResult(null)
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: selected.id, platform: postPlatform, scheduledAt, caption: postCaption }),
    })
    const data = await res.json()
    setPostLoading(false)
    if (res.ok) {
      setPostResult({ type: 'success', msg: `Scheduled for ${scheduleDate} at ${scheduleTime}!` })
    } else {
      setPostResult({ type: 'error', msg: data.error || 'Schedule failed' })
    }
  }

  const connectedPlatforms = new Set(connections.map(c => c.platform))

  const filtered = activeTab === 'All'
    ? videos
    : videos.filter(v => v.engine === TAB_ENGINE_MAP[activeTab])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <BookImage size={15} className="text-orange-400" />
        </div>
        <h1 className="text-lg font-bold text-white">Library</h1>
        <span className="ml-1 text-xs font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full">
          {videos.length} saved
        </span>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTER_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              activeTab === tab
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Grid or empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-56 gap-3 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <BookImage size={20} className="text-zinc-700" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-zinc-400 text-sm font-medium">No videos here yet</p>
            <p className="text-zinc-600 text-xs">Save videos in Blitz to see them here</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map(v => (
            <div
              key={v.id}
              className="group relative bg-[#18181b] rounded-xl overflow-hidden border border-zinc-800/60 hover:border-zinc-700 transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-xl hover:shadow-black/40"
              onClick={() => setSelected(v)}
            >
              <div className="aspect-[9/16] relative bg-zinc-800">
                {v.thumbnail ? (
                  <img
                    src={v.thumbnail}
                    alt={ENGINE_LABELS[v.engine] || v.engine}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">
                    No preview
                  </div>
                )}

                {/* Hover play overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 scale-75 group-hover:scale-100">
                    <Play size={14} className="text-white fill-white ml-0.5" />
                  </div>
                </div>

                {/* Bottom gradient + engine pill */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-8">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ENGINE_PILL_COLORS[v.engine] || 'bg-zinc-700 text-zinc-300'}`}>
                    {ENGINE_LABELS[v.engine] || v.engine}
                  </span>
                  {v.caption && (
                    <p className="text-[10px] text-zinc-300 mt-1 line-clamp-2 leading-snug">{v.caption}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video modal */}
      {selected && !showPostModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-[#18181b] rounded-2xl overflow-hidden border border-zinc-800/60 max-w-sm w-full shadow-2xl shadow-black/60"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative">
              <video
                src={selected.public_url}
                className="w-full aspect-[9/16] object-cover"
                controls
                autoPlay
              />
              <button
                onClick={() => setSelected(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <X size={14} className="text-white" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ENGINE_PILL_COLORS[selected.engine] || 'bg-zinc-800 text-zinc-300'}`}>
                {ENGINE_LABELS[selected.engine]}
              </span>
              {selected.caption && (
                <p className="text-sm text-zinc-300 leading-relaxed">{selected.caption}</p>
              )}
              <div className="flex gap-2 pt-1">
                <a
                  href={selected.public_url}
                  download
                  className="flex items-center gap-2 px-3 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-white rounded-xl text-xs font-medium transition-all duration-200 flex-1 justify-center"
                >
                  <Download size={12} /> Download
                </a>
                <button
                  onClick={() => openPostModal(selected)}
                  className="flex items-center gap-2 px-3 py-2.5 bg-orange-500 hover:bg-orange-400 text-white rounded-xl text-xs font-medium transition-all duration-200 flex-1 justify-center shadow-lg shadow-orange-500/25"
                >
                  <Send size={12} /> Post / Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post / Schedule modal */}
      {showPostModal && selected && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => { setShowPostModal(false); setSelected(null) }}
        >
          <div
            className="bg-[#18181b] rounded-2xl border border-zinc-800/60 max-w-md w-full shadow-2xl shadow-black/60 p-5 space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Post Video</h2>
              <button
                onClick={() => { setShowPostModal(false); setSelected(null) }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
              >
                <X size={14} />
              </button>
            </div>

            {/* Result banner */}
            {postResult && (
              <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl ${
                postResult.type === 'success'
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                  : 'text-red-400 bg-red-500/10 border border-red-500/20'
              }`}>
                {postResult.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                {postResult.msg}
              </div>
            )}

            {/* Platform selection */}
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 font-medium">Select platform</p>
              <div className="flex gap-2">
                {(['tiktok', 'instagram', 'youtube'] as const).map(p => {
                  const isConnected = connectedPlatforms.has(p)
                  const labels: Record<string, string> = { tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube' }
                  const colors: Record<string, string> = {
                    tiktok: postPlatform === p ? 'border-pink-500 bg-pink-500/10 text-pink-300' : 'border-zinc-700 text-zinc-400',
                    instagram: postPlatform === p ? 'border-purple-500 bg-purple-500/10 text-purple-300' : 'border-zinc-700 text-zinc-400',
                    youtube: postPlatform === p ? 'border-red-500 bg-red-500/10 text-red-300' : 'border-zinc-700 text-zinc-400',
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => isConnected && setPostPlatform(p)}
                      disabled={!isConnected}
                      className={`flex-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                        isConnected ? colors[p] + ' hover:opacity-90 cursor-pointer' : 'border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
                      }`}
                    >
                      {labels[p]}
                      {!isConnected && <span className="block text-[10px] mt-0.5 opacity-60">Not connected</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Caption */}
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 font-medium">Caption</p>
              <textarea
                value={postCaption}
                onChange={e => setPostCaption(e.target.value)}
                rows={3}
                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/60 resize-none"
                placeholder="Write a caption..."
              />
            </div>

            {/* Schedule toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSchedule(false)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${!showSchedule ? 'bg-orange-500 text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'}`}
              >
                <Send size={11} className="inline mr-1.5" />Post Now
              </button>
              <button
                onClick={() => setShowSchedule(true)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${showSchedule ? 'bg-orange-500 text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'}`}
              >
                <Calendar size={11} className="inline mr-1.5" />Schedule
              </button>
            </div>

            {/* Schedule date/time */}
            {showSchedule && (
              <div className="flex gap-2">
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={e => setScheduleDate(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/60"
                />
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={e => setScheduleTime(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/60"
                />
              </div>
            )}

            {/* Action button */}
            <button
              onClick={showSchedule ? schedulePost : postNow}
              disabled={!postPlatform || postLoading || (showSchedule && (!scheduleDate || !scheduleTime))}
              className="w-full py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:hover:bg-orange-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
            >
              {postLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : showSchedule ? (
                <><Calendar size={13} /> Schedule Post</>
              ) : (
                <><Send size={13} /> Post Now</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
