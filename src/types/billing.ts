/**
 * 課金アーキテクチャ型定義
 *
 * 将来のStripe統合に備えた型定義。
 * 現時点では実装しない。2026年12月の無料期間終了後に
 * Stripe連携を実装する際のスキーマとして使用する。
 */

/** 料金プランID */
export type PlanId = "free" | "standard" | "premium";

/** プラン詳細 */
export interface PlanDetail {
  id: PlanId;
  name: string;
  price: number; // 月額（円）
  features: string[];
}

/** 店舗サブスクリプション（将来実装） */
export interface ShopSubscription {
  shop_id: string;
  plan_id: PlanId;
  status: "active" | "trial" | "canceled" | "past_due";
  trial_ends_at: string | null; // 2026-12-31T23:59:59Z
  current_period_start: string;
  current_period_end: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

/** 推しチップ取引（将来実装） */
export interface OshiTipTransaction {
  id: string;
  from_user_id: string;
  to_shop_id: string;
  amount: number; // 100-1000円
  message: string | null;
  stripe_payment_intent_id: string | null;
  status: "pending" | "completed" | "refunded";
  created_at: string;
}

/** @deprecated TipTransaction → OshiTipTransaction に移行 */
export type TipTransaction = OshiTipTransaction;

/** ファンクラブメンバーシップ（将来実装） */
export interface OshiMembership {
  id: string;
  user_id: string;
  shop_id: string;
  tier: "basic" | "premium";
  monthly_amount: number; // 300-1500円
  status: "active" | "canceled" | "past_due";
  stripe_subscription_id: string | null;
  started_at: string;
  canceled_at: string | null;
}

/** @deprecated SupportMembership → OshiMembership に移行 */
export type SupportMembership = OshiMembership;

/** プラン定数 */
export const PLANS: PlanDetail[] = [
  {
    id: "free",
    name: "フリー",
    price: 0,
    features: [
      "AIインタビュー 1回",
      "ストーリー掲載 1本",
      "基本店舗ページ",
      "共感タップ・推し登録",
      "QRコード生成",
    ],
  },
  {
    id: "standard",
    name: "スタンダード",
    price: 8000,
    features: [
      "AIインタビュー 無制限",
      "ストーリー掲載 無制限",
      "PV・ファン分析",
      "ファンへのメッセージ配信",
      "SNSシェア機能",
    ],
  },
  {
    id: "premium",
    name: "プレミアム",
    price: 15000,
    features: [
      "スタンダードの全機能",
      "予約打診管理",
      "CRM機能（ファン行動分析）",
      "ファンクラブ運営",
      "データ分析レポート",
    ],
  },
];

/** 無料期間の終了日 */
export const FREE_TRIAL_END_DATE = "2026-12-31";

/** 無料期間中かどうかを判定 */
export function isFreePeriod(): boolean {
  return new Date() < new Date(FREE_TRIAL_END_DATE + "T23:59:59+09:00");
}
