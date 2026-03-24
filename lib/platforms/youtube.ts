import axios from 'axios'
import fs from 'fs'
import type { PlatformConnection, PlatformPoster, PostResult } from './types'

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3'
const YOUTUBE_UPLOAD = 'https://www.googleapis.com/upload/youtube/v3/videos'

export const youtube: PlatformPoster = {
  async post(connection: PlatformConnection, videoPath: string, caption: string): Promise<PostResult> {
    try {
      const videoBuffer = fs.readFileSync(videoPath)
      const title = caption.slice(0, 100) || 'ClipForge Video'
      const description = caption

      // Upload video with metadata in one request
      const metadata = {
        snippet: {
          title,
          description,
          categoryId: '22', // People & Blogs
        },
        status: {
          privacyStatus: 'private', // Start as private — user can change
          selfDeclaredMadeForKids: false,
        },
      }

      const boundary = 'clipforge_boundary'
      const metadataPart = JSON.stringify(metadata)
      const body = Buffer.concat([
        Buffer.from(
          `--${boundary}\r\n` +
          `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
          `${metadataPart}\r\n` +
          `--${boundary}\r\n` +
          `Content-Type: video/mp4\r\n\r\n`
        ),
        videoBuffer,
        Buffer.from(`\r\n--${boundary}--`),
      ])

      const res = await axios.post(
        `${YOUTUBE_UPLOAD}?uploadType=multipart&part=snippet,status`,
        body,
        {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        }
      )

      return { success: true, platform_post_id: res.data.id }
    } catch (e: any) {
      return { success: false, error: e.response?.data?.error?.message || e.message }
    }
  },

  async refreshToken(connection: PlatformConnection) {
    const res = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.YOUTUBE_CLIENT_ID,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET,
      refresh_token: connection.refresh_token,
      grant_type: 'refresh_token',
    })
    return {
      access_token: res.data.access_token,
      expires_at: new Date(Date.now() + res.data.expires_in * 1000).toISOString(),
    }
  },
}

export function getYouTubeAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state: 'youtube',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function exchangeYouTubeCode(code: string, redirectUri: string) {
  const res = await axios.post('https://oauth2.googleapis.com/token', {
    code,
    client_id: process.env.YOUTUBE_CLIENT_ID,
    client_secret: process.env.YOUTUBE_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })

  // Get channel info
  const channelRes = await axios.get(`${YOUTUBE_API}/channels`, {
    params: { part: 'snippet', mine: true },
    headers: { Authorization: `Bearer ${res.data.access_token}` },
  })

  const channel = channelRes.data.items?.[0]

  return {
    access_token: res.data.access_token,
    refresh_token: res.data.refresh_token,
    expires_in: res.data.expires_in,
    platform_user_id: channel?.id || null,
    platform_username: channel?.snippet?.title || null,
  }
}
