import { NextRequest, NextResponse } from 'next/server';
import db from '@/db/index';
import axios from 'axios';
import puppeteer from 'puppeteer';

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

  // Scrape
  let rawText = '';
  try {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.CHROME_PATH,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    rawText = await page.evaluate(() => {
      ['script','style','nav','footer'].forEach(t => document.querySelectorAll(t).forEach(el => el.remove()));
      return document.body.innerText.replace(/\s+/g,' ').trim().slice(0,3000);
    });
    await browser.close();
  } catch(e) {
    rawText = `Website: ${url}`;
  }

  // Gemini brief
  let brief: Record<string, unknown> = { name: 'Brand', description: rawText.slice(0,200), audience: 'gamers', tone: 'casual' };
  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_KEY}`,
      { contents: [{ parts: [{ text: `Extract brand info from this website text and return JSON only with keys: name, description (2 sentences), audience, tone, keyFeatures (array of 3 strings), tagline.\n\n${rawText}` }] }] },
      { headers: { 'Content-Type': 'application/json' } }
    );
    const text = res.data.candidates[0].content.parts[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) brief = JSON.parse(jsonMatch[0]);
  } catch(e) {}

  const result = db.prepare('INSERT INTO brands (url, name, brief, raw_scrape) VALUES (?, ?, ?, ?)').run(
    url, (brief as any).name || 'Brand', JSON.stringify(brief), rawText
  );

  return NextResponse.json({ brandId: result.lastInsertRowid, brief });
}

export async function GET() {
  const brands = db.prepare('SELECT * FROM brands ORDER BY created_at DESC LIMIT 1').all();
  return NextResponse.json(brands[0] || null);
}
