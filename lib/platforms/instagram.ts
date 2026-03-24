import axios from 'axios'
import type { PlatformConnection, PlatformPoster, PostResult } from './types'

const GRAPH_API = 'https://graph.facebook.com/v21.0'

export const instagram: PlatformPoster = {
  async post(connection: PlatformConnection, videoPath: string, caption: string): Promise<PostResult> {
    try {
      const igUserId = connection.platform_user_id

      // Step 1: Create media container with video URL
      // Instagram requires a publicly accessible URL — serve from public/videos
      const videoUrl = `${process.env.NEXT_PUBLIC_APP_URL}/videos/${require('path').basename(videoPath)}`

      const containerRes = await axios.post(
        `${GRAPH_API}/${igUserId}/media`,
        {
          video_url: videoUrl,
          caption: caption.slice(0, 2200),
          media_type: 'REELS',
          share_to_feed: true,
        },
        { params: { access_token: connection.access_token } }
      )

      const containerId = containerRes.data.id

      // Step 2: Poll until container is ready
      let status = 'IN_PROGRESS'
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 5000))
        const check = await axios.get(`${GRAPH_API}/${containerId}`, {
          params: { fields: 'status_code', access_token: connection.access_token },
        })
        status = check.data.status_code
        if (status === 'FINISHED') break
        if (status === 'ERROR') throw new Error('Instagram media processing failed')
      }

      if (status !== 'FINISHED') throw new Error('Instagram media processing timed out')

      // Step 3: Publish
      const publishRes = await axios.post(
        `${GRAPH_API}/${igUserId}/media_publish`,
        { creation_id: containerId },
        { params: { access_token: connection.access_token } }
      )

      return { success: true, platform_post_id: publishRes.data.id }
    } catch (e: any) {
      return { success: false, error: e.response?.data?.error?.message || e.message }
    }
  },

  async refreshToken(connection: PlatformConnection) {
    const res = await axios.get(`${GRAPH_API}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.INSTAGRAM_APP_ID,
        client_secret: process.env.INSTAGRAM_APP_SECRET,
        fb_exchange_token: connection.access_token,
      },
    })
    return {
      access_token: res.data.access_token,
      expires_at: new Date(Date.now() + (res.data.expires_in || 5184000) * 1000).toISOString(),
    }
  },
}

export function getInstagramAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: redirectUri,
    scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement',
    response_type: 'code',
    state: 'instagram',
  })
  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`
}

export async function exchangeInstagramCode(code: string, redirectUri: string) {
  // Exchange code for short-lived token
  const tokenRes = await axios.get(`${GRAPH_API}/oauth/access_token`, {
    params: {
      client_id: process.env.INSTAGRAM_APP_ID,
      client_secret: process.env.INSTAGRAM_APP_SECRET,
      redirect_uri: redirectUri,
      code,
    },
  })

  const shortToken = tokenRes.data.access_token

  // Exchange for long-lived token
  const longRes = await axios.get(`${GRAPH_API}/oauth/access_token`, {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: process.env.INSTAGRAM_APP_ID,
      client_secret: process.env.INSTAGRAM_APP_SECRET,
      fb_exchange_token: shortToken,
    },
  })

  // Get Instagram Business Account ID
  const pagesRes = await axios.get(`${GRAPH_API}/me/accounts`, {
    params: { access_token: longRes.data.access_token },
  })

  const page = pagesRes.data.data[0]
  if (!page) throw new Error('No Facebook Page found. You need a Facebook Page linked to an Instagram Business account.')

  const igRes = await axios.get(`${GRAPH_API}/${page.id}`, {
    params: { fields: 'instagram_business_account', access_token: page.access_token },
  })

  const igAccountId = igRes.data.instagram_business_account?.id
  if (!igAccountId) throw new Error('No Instagram Business account linked to your Facebook Page.')

  // Get username
  const igInfo = await axios.get(`${GRAPH_API}/${igAccountId}`, {
    params: { fields: 'username', access_token: longRes.data.access_token },
  })

  return {
    access_token: longRes.data.access_token,
    expires_in: longRes.data.expires_in || 5184000,
    platform_user_id: igAccountId,
    platform_username: igInfo.data.username,
  }
}
