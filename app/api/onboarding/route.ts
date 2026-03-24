import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import axios from 'axios'
import puppeteer from 'puppeteer'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  // Scrape
  let rawText = ''
  try {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.CHROME_PATH,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise(r => setTimeout(r, 3000))
    rawText = await page.evaluate(() => {
      ;['script', 'style', 'nav', 'footer'].forEach(t =>
        document.querySelectorAll(t).forEach(el => el.remove())
      )
      return document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 3000)
    })
    await browser.close()
  } catch {
    rawText = `Website: ${url}`
  }

  // Gemini brand brief
  let brief: Record<string, unknown> = {
    name: 'Brand',
    description: rawText.slice(0, 200),
    audience: 'general',
    tone: 'casual',
  }
  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_KEY}`,
      {
        contents: [{
          parts: [{
            text: `Extract brand info from this website text and return JSON only with keys: name, description (2 sentences), audience, tone, keyFeatures (array of 3 strings), tagline.\n\n${rawText}`,
          }],
        }],
      },
      { headers: { 'Content-Type': 'application/json' } }
    )
    const text = res.data.candidates[0].content.parts[0].text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) brief = JSON.parse(jsonMatch[0])
  } catch {}

  const { data: brand, error } = await supabase
    .from('brands')
    .insert({
      user_id: user.id,
      url,
      name: (brief.name as string) || 'Brand',
      brief,
      raw_scrape: rawText,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ brandId: brand.id, brief })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json(brand || null)
}
