'use client'
import { useEffect, useState } from 'react'
import { BarChart2, Video, Heart, SkipForward, Zap, Clock } from 'lucide-react'

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetch('/api/analytics').then(r => r.json()).then(setData)
  }, [])

  if (!data) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const saveRate = data.total > 0 ? Math.round((data.saved / data.total) * 100) : 0

  const ENGINE_LABELS: Record<string, string> = {
    wall_of_text: 'Wall of Text',
    hook_demo: 'Hook + Demo',
    meme_video: 'Green Screen Meme',
    reddit_video: 'Reddit',
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <BarChart2 size={15} className="text-orange-400" />
        </div>
        <h1 className="text-lg font-bold text-white">Analytics</h1>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Generated', value: data.total, icon: Video, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Saved', value: data.saved, icon: Heart, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Skipped', value: data.skipped, icon: SkipForward, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'Save Rate', value: `${saveRate}%`, icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="bg-[#18181b] border border-zinc-800/60 rounded-xl p-4 space-y-3 hover:border-zinc-700 transition-colors duration-200"
          >
            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${bg}`}>
              <Icon size={14} className={color} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Engine breakdown */}
      <div className="bg-[#18181b] border border-zinc-800/60 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Engine Breakdown</h2>
        <div className="space-y-3.5">
          {data.byEngine.map((row: any) => {
            const pct = Math.min((row.count / Math.max(data.total, 1)) * 100, 100)
            return (
              <div key={row.engine} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-medium">
                    {ENGINE_LABELS[row.engine] || row.engine.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-zinc-500 tabular-nums">{row.count} videos</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
          {data.byEngine.length === 0 && (
            <p className="text-zinc-600 text-sm text-center py-4">No engine data yet</p>
          )}
        </div>
      </div>

      {/* Recent jobs */}
      <div className="bg-[#18181b] border border-zinc-800/60 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={13} className="text-zinc-500" />
          <h2 className="text-sm font-semibold text-white">Recent Jobs</h2>
        </div>
        <div className="space-y-0">
          {data.recentJobs.map((job: any, i: number) => (
            <div
              key={job.id}
              className={`flex items-center justify-between py-2.5 text-sm ${
                i < data.recentJobs.length - 1 ? 'border-b border-zinc-800/60' : ''
              }`}
            >
              <span className="text-zinc-300 capitalize font-medium">
                {ENGINE_LABELS[job.engine] || job.engine.replace(/_/g, ' ')}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                job.status === 'done'    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                job.status === 'error'   ? 'bg-red-500/15 text-red-400 border border-red-500/20' :
                job.status === 'running' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20' :
                                           'bg-zinc-700/50 text-zinc-400 border border-zinc-700'
              }`}>
                {job.status}
              </span>
            </div>
          ))}
          {data.recentJobs.length === 0 && (
            <p className="text-zinc-600 text-sm text-center py-4">No jobs yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
