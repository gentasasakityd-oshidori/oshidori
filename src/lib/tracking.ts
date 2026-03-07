/**
 * ストーリー閲覧行動トラッキング
 *
 * PostHogイベントを活用し、消費者の閲覧行動を収集する。
 * 自己学習ループの基盤データとして使用。
 */

import posthog from "posthog-js";

/** ストーリー閲覧開始 */
export function trackStoryViewStart(params: {
  shopId: string;
  storyId: string;
  from?: string; // qr, home, explore, direct
}) {
  try {
    posthog.capture("story_view_start", {
      shop_id: params.shopId,
      story_id: params.storyId,
      from: params.from ?? "direct",
      timestamp: new Date().toISOString(),
    });
  } catch {
    // PostHog未初期化時は無視
  }
}

/** ストーリースクロール深度 */
export function trackStoryScrollDepth(params: {
  shopId: string;
  storyId: string;
  depthPercent: number; // 25, 50, 75, 100
  timeSpentSec: number;
}) {
  try {
    posthog.capture("story_scroll_depth", {
      shop_id: params.shopId,
      story_id: params.storyId,
      depth_percent: params.depthPercent,
      time_spent_sec: params.timeSpentSec,
    });
  } catch {
    // PostHog未初期化時は無視
  }
}

/** ストーリー閲覧完了 */
export function trackStoryViewEnd(params: {
  shopId: string;
  storyId: string;
  totalTimeSec: number;
  reachedEnd: boolean;
}) {
  try {
    posthog.capture("story_view_complete", {
      shop_id: params.shopId,
      story_id: params.storyId,
      total_time_sec: params.totalTimeSec,
      reached_end: params.reachedEnd,
    });
  } catch {
    // PostHog未初期化時は無視
  }
}

/** エンゲージメント促進での感情タップ */
export function trackEngagementPromptResponse(params: {
  shopId: string;
  storyId: string;
  response: string; // emotion label
}) {
  try {
    posthog.capture("engagement_prompt_response", {
      shop_id: params.shopId,
      story_id: params.storyId,
      response: params.response,
    });
  } catch {
    // PostHog未初期化時は無視
  }
}

/** ユーザー最終アクション記録 */
export function trackUserLastAction(params: {
  actionType: "empathy_tap" | "oshi_toggle" | "reservation" | "story_view" | "collection_share";
  shopId?: string;
}) {
  try {
    posthog.capture("user_last_action", {
      action_type: params.actionType,
      shop_id: params.shopId ?? null,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // PostHog未初期化時は無視
  }
}

/** QRコード経由アクセス記録 */
export function trackQRAccess(params: {
  shopSlug: string;
}) {
  try {
    posthog.capture("qr_access", {
      shop_slug: params.shopSlug,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // PostHog未初期化時は無視
  }
}

/** コレクションシェア */
export function trackCollectionShare(params: {
  platform?: "line" | "twitter" | "clipboard";
  shopCount: number;
  nickname?: string;
}) {
  try {
    posthog.capture("collection_share", {
      platform: params.platform ?? "unknown",
      shop_count: params.shopCount,
      nickname: params.nickname ?? null,
    });
  } catch {
    // PostHog未初期化時は無視
  }
}
