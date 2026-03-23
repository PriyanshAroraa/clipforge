'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Zap, CheckCircle2 } from 'lucide-react'

type Step = 'input' | 'scraping' | 'brief' | 'generating'

const ENGINES = ['Wall of Text', 'Hook + Demo', 'Green Screen Meme', 'Reddit Video']

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('input')
  const [url, setUrl] = useState('http://ownersclub.invinciblegg.com/')
  const [brief, setBrief] = useState<any>(null)
  const [brandId, setBrandId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleScrape() {
    setStep('scraping')
    setError('')
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBrief(data.brief)
      setBrandId(data.brandId)
      localStorage.setItem('clipforge_brand_id', String(data.brandId))
      setStep('brief')
    } catch(e: any) {
      setError(e.message)
      setStep('input')
    }
  }

  async function handleGenerate() {
    setStep('generating')
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId })
    })
    const data = await res.json()
    pollJobs(data.jobIds)
  }

  async function pollJobs(_ids: number[]) {
    const poll = async () => {
      const res = await fetch(`/api/jobs?brandId=${brandId}`)
      const jobs = await res.json()
      const done = jobs.every((j: any) => j.status === 'done' || j.status === 'error')
      if (done) router.push('/blitz')
      else setTimeout(poll, 3000)
    }
    setTimeout(poll, 3000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#09090b' }}>
      <div className="w-full max-w-md">

        {/* Logo mark */}
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Zap size={16} className="text-white fill-white" />
          </div>
          <span className="text-base font-bold text-white">ClipForge</span>
        </div>

        {/* STEP: input */}
        {step === 'input' && (
          <div className="space-y-7">
            <div>
              <h1 className="text-3xl font-bold text-white leading-tight">Enter your brand URL</h1>
              <p className="text-zinc-500 mt-2 text-sm leading-relaxed">
                We'll scrape your website, build a brand brief with AI, and start generating content automatically.
              </p>
            </div>
            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}
            <div className="space-y-3">
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScrape()}
                placeholder="https://yourwebsite.com"
                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/60 focus:bg-zinc-900 transition-all duration-200 text-sm"
              />
              <button
                onClick={handleScrape}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.01] active:scale-[0.99] text-sm"
              >
                Analyse Website <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* STEP: scraping */}
        {step === 'scraping' && (
          <div className="text-center space-y-5">
            <div className="relative mx-auto w-16 h-16">
              <div className="w-16 h-16 rounded-full border-[3px] border-orange-500/20" />
              <div className="absolute inset-0 w-16 h-16 rounded-full border-[3px] border-orange-500 border-t-transparent animate-spin" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Analysing your brand</h2>
              <p className="text-zinc-500 text-sm mt-1.5">Scraping website and generating brief with Gemini...</p>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              {[0,1,2].map(i => (
                <span key={i} className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        )}

        {/* STEP: brief */}
        {step === 'brief' && brief && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-3">
                <CheckCircle2 size={15} />
                Brand brief generated
              </div>
              <h2 className="text-2xl font-bold text-white">Looks good?</h2>
              <p className="text-zinc-500 text-sm mt-1">Review your brand brief before we generate content</p>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-2xl p-5 space-y-4">
              <div className="pb-3 border-b border-zinc-800/60">
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold mb-1">Brand Name</p>
                <p className="text-white font-bold text-lg leading-tight">{brief.name}</p>
              </div>
              <div className="pb-3 border-b border-zinc-800/60">
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold mb-1.5">Description</p>
                <p className="text-zinc-300 text-sm leading-relaxed">{brief.description}</p>
              </div>
              {brief.keyFeatures && brief.keyFeatures.length > 0 && (
                <div className="pb-3 border-b border-zinc-800/60">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold mb-2">Key Features</p>
                  <ul className="space-y-1.5">
                    {brief.keyFeatures.map((f: string, i: number) => (
                      <li key={i} className="text-zinc-300 text-sm flex items-start gap-2">
                        <span className="text-orange-400 mt-0.5 shrink-0">•</span>{f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {brief.tagline && (
                <div>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold mb-1">Tagline</p>
                  <p className="text-orange-400 font-medium italic text-sm">"{brief.tagline}"</p>
                </div>
              )}
            </div>

            <button
              onClick={handleGenerate}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-xl shadow-orange-500/25 hover:scale-[1.01] active:scale-[0.99] text-sm"
            >
              <Zap size={15} className="fill-white" /> Generate Videos
            </button>
          </div>
        )}

        {/* STEP: generating */}
        {step === 'generating' && (
          <div className="space-y-7">
            <div className="text-center space-y-2">
              <div className="relative mx-auto w-14 h-14">
                <div className="w-14 h-14 rounded-full border-[3px] border-orange-500/20" />
                <div className="absolute inset-0 w-14 h-14 rounded-full border-[3px] border-orange-500 border-t-transparent animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-white mt-4">Generating your videos</h2>
              <p className="text-zinc-500 text-sm">All 4 engines running in parallel. Takes 1–2 min.</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {ENGINES.map((e, i) => (
                <div key={e} className="bg-zinc-900/80 border border-zinc-800/60 rounded-xl p-3.5 flex items-center gap-2.5">
                  <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse shrink-0"
                    style={{ animationDelay: `${i * 200}ms` }} />
                  <span className="text-zinc-300 text-xs font-medium">{e}</span>
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-zinc-600">
              You'll be redirected to Blitz when the first batch is ready
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
