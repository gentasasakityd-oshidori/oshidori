/**
 * Instagram Graph API 連携クライアント
 *
 * 環境変数:
 *   INSTAGRAM_APP_ID — Facebook App ID
 *   INSTAGRAM_APP_SECRET — Facebook App Secret
 *   NEXT_PUBLIC_INSTAGRAM_APP_ID — クライアント側で使用
 *
 * 店舗ごとに instagram_access_token を shops テーブルに保存する想定
 */

const GRAPH_API_VERSION = "v19.0";
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface InstagramMedia {
  id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url: string;
  thumbnail_url?: string;
  caption?: string;
  timestamp: string;
  permalink: string;
  like_count?: number;
  comments_count?: number;
}

export interface InstagramProfile {
  id: string;
  username: string;
  name: string;
  biography: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  profile_picture_url: string;
}

/** 短期トークンを長期トークンに交換 */
export async function exchangeLongLivedToken(shortLivedToken: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("Instagram App ID and Secret are required");
  }

  const url = `${BASE_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Instagram token exchange failed: ${JSON.stringify(err)}`);
  }
  return res.json();
}

/** Instagramプロフィール取得 */
export async function getProfile(accessToken: string): Promise<InstagramProfile> {
  const fields = "id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url";
  const url = `${BASE_URL}/me?fields=${fields}&access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Instagram profile fetch failed: ${JSON.stringify(err)}`);
  }
  return res.json();
}

/** 最新メディア取得 */
export async function getRecentMedia(accessToken: string, limit = 12): Promise<InstagramMedia[]> {
  const fields = "id,media_type,media_url,thumbnail_url,caption,timestamp,permalink,like_count,comments_count";
  const url = `${BASE_URL}/me/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Instagram media fetch failed: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return data.data ?? [];
}

/** トークンの有効性を確認 */
export async function validateToken(accessToken: string): Promise<boolean> {
  try {
    const url = `${BASE_URL}/me?fields=id&access_token=${accessToken}`;
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

/** OAuth URL を生成（フロントエンドで使用） */
export function getOAuthUrl(redirectUri: string): string {
  const appId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;
  if (!appId) return "";
  return `https://api.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user_profile,user_media&response_type=code`;
}
