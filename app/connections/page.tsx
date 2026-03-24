'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Link2, Check, AlertCircle, ExternalLink, Trash2 } from 'lucide-react'

interface Connection {
  platform: string
  platform_username: string | null
  created_at: string
}

const PLATFORMS = [
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.68a8.21 8.21 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.11z"/>
      </svg>
    ),
    color: 'border-pink-500/30 hover:border-pink-500/60',
    connectedColor: 'border-pink-500/50 bg-pink-500/5',
    dotColor: 'bg-pink-400',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
    color: 'border-purple-500/30 hover:border-purple-500/60',
    connectedColor: 'border-purple-500/50 bg-purple-500/5',
    dotColor: 'bg-purple-400',
  },
  {
    id: 'youtube',
    name: 'YouTube Shorts',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    color: 'border-red-500/30 hover:border-red-500/60',
    connectedColor: 'border-red-500/50 bg-red-500/5',
    dotColor: 'bg-red-400',
  },
]

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const searchParams = useSearchParams()

  const connected = searchParams.get('connected')
  const error = searchParams.get('error')

  useEffect(() => {
    fetchConnections()
  }, [])

  async function fetchConnections() {
    const res = await fetch('/api/platforms')
    const data = await res.json()
    setConnections(data)
    setLoading(false)
  }

  async function disconnect(platform: string) {
    setDisconnecting(platform)
    await fetch('/api/platforms/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform }),
    })
    setConnections(prev => prev.filter(c => c.platform !== platform))
    setDisconnecting(null)
  }

  const connectedPlatforms = new Set(connections.map(c => c.platform))

  return (
    <div className="p-6 max-w-lg">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <Link2 size={15} className="text-orange-400" />
        </div>
        <h1 className="text-lg font-bold text-white">Connections</h1>
      </div>

      {/* Success/error banners */}
      {connected && (
        <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-xl mb-5">
          <Check size={14} />
          Successfully connected {connected}!
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl mb-5">
          <AlertCircle size={14} />
          {decodeURIComponent(error)}
        </div>
      )}

      <p className="text-zinc-500 text-sm mb-6">
        Connect your social accounts to post and schedule videos directly from ClipForge.
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {PLATFORMS.map(p => {
            const isConnected = connectedPlatforms.has(p.id)
            const conn = connections.find(c => c.platform === p.id)
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                  isConnected ? p.connectedColor : `bg-zinc-900/50 ${p.color}`
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-zinc-300">{p.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{p.name}</p>
                    {isConnected && conn?.platform_username && (
                      <p className="text-xs text-zinc-400">@{conn.platform_username}</p>
                    )}
                  </div>
                </div>

                {isConnected ? (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                      <span className={`w-1.5 h-1.5 ${p.dotColor} rounded-full`} />
                      Connected
                    </span>
                    <button
                      onClick={() => disconnect(p.id)}
                      disabled={disconnecting === p.id}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : (
                  <a
                    href={`/api/platforms/connect?platform=${p.id}`}
                    className="flex items-center gap-1.5 text-xs font-medium text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 px-3 py-1.5 rounded-lg transition-all"
                  >
                    Connect <ExternalLink size={11} />
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
