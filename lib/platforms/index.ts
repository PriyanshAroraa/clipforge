import { tiktok } from './tiktok'
import { instagram } from './instagram'
import { youtube } from './youtube'
import type { PlatformPoster } from './types'

export const platforms: Record<string, PlatformPoster> = {
  tiktok,
  instagram,
  youtube,
}

export type PlatformName = 'tiktok' | 'instagram' | 'youtube'

export const PLATFORM_LABELS: Record<PlatformName, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube Shorts',
}

export const PLATFORM_COLORS: Record<PlatformName, string> = {
  tiktok: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  instagram: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  youtube: 'bg-red-500/20 text-red-300 border-red-500/30',
}
