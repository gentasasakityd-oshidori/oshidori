/**
 * Google Business Profile (GBP) API 連携クライアント
 *
 * 環境変数:
 *   GOOGLE_CLIENT_ID — Google Cloud OAuth Client ID
 *   GOOGLE_CLIENT_SECRET — Google Cloud OAuth Client Secret
 *   NEXT_PUBLIC_GOOGLE_CLIENT_ID — クライアント側で使用
 *
 * 店舗ごとに google_access_token / google_refresh_token を shops テーブルに保存する想定
 */

const BASE_URL = "https://mybusinessbusinessinformation.googleapis.com/v1";
const REVIEWS_URL = "https://mybusiness.googleapis.com/v4";

export interface GBPLocation {
  name: string; // accounts/{accountId}/locations/{locationId}
  title: string;
  storeCode?: string;
  websiteUri?: string;
  phoneNumbers?: { primaryPhone: string };
  categories?: { primaryCategory: { displayName: string } };
  regularHours?: {
    periods: Array<{
      openDay: string;
      openTime: { hours: number; minutes: number };
      closeDay: string;
      closeTime: { hours: number; minutes: number };
    }>;
  };
}

export interface GBPReview {
  reviewId: string;
  reviewer: { displayName: string; profilePhotoUrl?: string };
  starRating: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: { comment: string; updateTime: string };
}

export interface GBPInsights {
  locationName: string;
  timeRange: { startTime: string; endTime: string };
  metricValues: Array<{
    metric: string;
    totalValue?: { value: string };
    dimensionalValues?: Array<{ value: string; timeDimension?: { timeRange: { startTime: string; endTime: string } } }>;
  }>;
}

/** Google OAuth トークンをリフレッシュ */
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google Client ID and Secret are required");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Google token refresh failed: ${JSON.stringify(err)}`);
  }
  return res.json();
}

/** GBPロケーション一覧取得 */
export async function getLocations(accessToken: string, accountId: string): Promise<GBPLocation[]> {
  const url = `${BASE_URL}/accounts/${accountId}/locations?readMask=title,storeCode,websiteUri,phoneNumbers,categories,regularHours`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`GBP locations fetch failed: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return data.locations ?? [];
}

/** レビュー取得 */
export async function getReviews(
  accessToken: string,
  locationName: string,
  pageSize = 20
): Promise<GBPReview[]> {
  const url = `${REVIEWS_URL}/${locationName}/reviews?pageSize=${pageSize}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`GBP reviews fetch failed: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return data.reviews ?? [];
}

/** トークンの有効性を確認 */
export async function validateToken(accessToken: string): Promise<boolean> {
  try {
    const url = `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`;
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

/** OAuth URL を生成 */
export function getOAuthUrl(redirectUri: string): string {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) return "";
  const scopes = [
    "https://www.googleapis.com/auth/business.manage",
  ].join(" ");
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent`;
}
