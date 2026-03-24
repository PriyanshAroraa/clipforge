export interface PlatformConnection {
  id: string
  user_id: string
  platform: 'tiktok' | 'instagram' | 'youtube'
  access_token: string
  refresh_token: string | null
  token_expires_at: string | null
  platform_user_id: string | null
  platform_username: string | null
  created_at: string
}

export interface PostResult {
  success: boolean
  platform_post_id?: string
  error?: string
}

export interface PlatformPoster {
  post(connection: PlatformConnection, videoPath: string, caption: string): Promise<PostResult>
  refreshToken?(connection: PlatformConnection): Promise<{ access_token: string; refresh_token?: string; expires_at?: string }>
}
