import posthog from "posthog-js";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let initialized = false;

export function initPostHog() {
  if (typeof window === "undefined" || initialized || !POSTHOG_KEY) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    persistence: "localStorage+cookie",
    // プライバシー配慮：IPアドレスを保存しない
    ip: false,
  });

  initialized = true;
}

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (!POSTHOG_KEY) return;
  posthog.identify(userId, properties);
}

export function resetUser() {
  if (!POSTHOG_KEY) return;
  posthog.reset();
}

// ── カスタムイベント ──

/** 共感タップ (D1: theme_id付き) */
export function trackEmpathyTap(params: {
  storyId: string;
  shopSlug: string;
  tagType: string;
  action: "tap" | "untap";
  comment?: string;
}) {
  if (!POSTHOG_KEY) return;
  posthog.capture("empathy_tap", params);
}

/** 推し登録/解除 (D2: push_reason付き) */
export function trackOshiToggle(params: {
  shopId: string;
  shopSlug: string;
  action: "register" | "unregister";
  pushReason?: string;
}) {
  if (!POSTHOG_KEY) return;
  posthog.capture("oshi_toggle", params);
}

/** ストーリー閲覧開始 (D5) */
export function trackStoryView(params: {
  storyId: string;
  shopSlug: string;
  shopName: string;
}) {
  if (!POSTHOG_KEY) return;
  posthog.capture("story_view_start", {
    ...params,
    viewStartedAt: new Date().toISOString(),
  });
}

/** ストーリー閲覧完了 (D5) */
export function trackStoryViewComplete(params: {
  storyId: string;
  shopSlug: string;
  readDurationSec: number;
}) {
  if (!POSTHOG_KEY) return;
  posthog.capture("story_view_complete", params);
}

/** 店舗ページ閲覧 */
export function trackShopView(params: {
  shopSlug: string;
  shopName: string;
  area: string;
  category: string;
}) {
  if (!POSTHOG_KEY) return;
  posthog.capture("shop_view", params);
}

/** 検索フィルター使用 */
export function trackFilterUse(params: {
  filterType: "area" | "station" | "category" | "budget" | "keyword" | "theme";
  filterValue: string;
}) {
  if (!POSTHOG_KEY) return;
  posthog.capture("filter_use", params);
}

/** メッセージ開封 */
export function trackMessageRead(params: {
  messageId: string;
  shopSlug: string;
}) {
  if (!POSTHOG_KEY) return;
  posthog.capture("message_read", params);
}

/** QRコードダウンロード */
export function trackQRDownload(params: { shopSlug: string }) {
  if (!POSTHOG_KEY) return;
  posthog.capture("qr_download", params);
}

/** インタビュー完了 */
export function trackInterviewComplete(params: {
  shopId: string;
  interviewType: string;
  durationMinutes: number;
}) {
  if (!POSTHOG_KEY) return;
  posthog.capture("interview_complete", params);
}

/** 予約打診 (D4) */
export function trackReservationInquiry(params: {
  shopSlug: string;
  partySize: number;
  reservationDate: string;
}) {
  if (!POSTHOG_KEY) return;
  posthog.capture("reservation_inquiry", params);
}

/** コレクションシェア */
export function trackCollectionShare(params: {
  platform: string;
  collectionCount: number;
}) {
  if (!POSTHOG_KEY) return;
  posthog.capture("collection_share", params);
}

export { posthog };
