import axios from 'axios'
import fs from 'fs'
import type { PlatformConnection, PlatformPoster, PostResult } from './types'

const TIKTOK_API = 'https://open.tiktokapis.com/v2'

export const tiktok: PlatformPoster = {
  async post(connection: PlatformConnection, videoPath: string, caption: string): Promise<PostResult> {
    try {
      const stat = fs.statSync(videoPath)
      const fileSize = stat.size

      // Step 1: Initialize upload
      const initRes = await axios.post(
        `${TIKTOK_API}/post/publish/video/init/`,
        {
          post_info: {
            title: caption.slice(0, 150),
            privacy_level: 'SELF_ONLY', // Start as private, user can change
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: fileSize,
            chunk_size: fileSize,
            total_chunk_count: 1,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json; charset=UTF-8',
          },
        }
      )

      const { upload_url, publish_id } = initRes.data.data

      // Step 2: Upload video
      const videoBuffer = fs.readFileSync(videoPath)
      await axios.put(upload_url, videoBuffer, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Range': `bytes 0-${fileSize - 1}/${fileSize}`,
        },
      })

      return { success: true, platform_post_id: publish_id }
    } catch (e: any) {
      return { success: false, error: e.response?.data?.error?.message || e.message }
    }
  },

  async refreshToken(connection: PlatformConnection) {
    const res = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', {
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: connection.refresh_token,
    })
    return {
      access_token: res.data.access_token,
      refresh_token: res.data.refresh_token,
      expires_at: new Date(Date.now() + res.data.expires_in * 1000).toISOString(),
    }
  },
}

export function getTikTokAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    response_type: 'code',
    scope: 'user.info.basic,video.publish,video.upload',
    redirect_uri: redirectUri,
    state: 'tiktok',
  })
  return `https://www.tiktok.com/v2/auth/authorize/?${params}`
}

export async function exchangeTikTokCode(code: string, redirectUri: string) {
  const res = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', {
    client_key: process.env.TIKTOK_CLIENT_KEY,
    client_secret: process.env.TIKTOK_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  })
  return {
    access_token: res.data.access_token,
    refresh_token: res.data.refresh_token,
    expires_in: res.data.expires_in,
    open_id: res.data.open_id,
  }
}
