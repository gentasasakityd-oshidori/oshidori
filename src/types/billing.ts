/**
 * 課金アーキテクチャ型定義
 *
 * 将来のStripe統合に備えた型定義。
 * 現時点では実装しない。2026年12月の無料期間終了後に
 * Stripe連携を実装する際のスキーマとして使用する。
 *
 * v6.1変更: BillingCycle・年間プラン追加、収益構造をSaaS月額に一本化
 */

/** 料金プランID */
export type PlanId = "free" | "standard" | "premium";

/** 課金サイクル（v6.1追加） */
export type BillingCycle = "monthly" | "annual";

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
  billing_cycle: BillingCycle;
  status: "active" | "trial" | "canceled" | "past_due";
  trial_ends_at: string | null; // 2026-12-31T23:59:59Z
  current_period_start: string;
  current_period_end: string;
  annual_price: number | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

/** サブスクリプションプラン（月額/年間、v6.1追加） */
export interface SubscriptionPlan {
  plan_id: PlanId;
  billing_cycle: BillingCycle;
  monthly_price: number;
  annual_price?: number;
  stripe_price_id: string;
}

/**
 * 推しチップ取引
 * @deprecated v6.1で課金機能を完全削除。収益構造はSaaS月額に一本化。
 * この型はv5.0以降で削除予定。
 */
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

/**
 * ファンクラブメンバーシップ
 * @deprecated v6.1で課金機能を完全削除。収益構造はSaaS月額に一本化。
 * この型はv5.0以降で削除予定。
 */
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

/**
 * サブスクリプションプラン一覧（月額/年間、v6.1追加）
 * 月額プランがメイン。年間プランは選択肢として提供するが積極的には推さない。
 */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  { plan_id: "standard", billing_cycle: "monthly", monthly_price: 8000, stripe_price_id: "price_std_monthly" },
  { plan_id: "standard", billing_cycle: "annual", monthly_price: 6700, annual_price: 80000, stripe_price_id: "price_std_annual" },
  { plan_id: "premium", billing_cycle: "monthly", monthly_price: 15000, stripe_price_id: "price_com_monthly" },
  { plan_id: "premium", billing_cycle: "annual", monthly_price: 12500, annual_price: 150000, stripe_price_id: "price_com_annual" },
];

/** 無料期間の終了日 */
export const FREE_TRIAL_END_DATE = "2026-12-31";

/** 無料期間中かどうかを判定 */
export function isFreePeriod(): boolean {
  return new Date() < new Date(FREE_TRIAL_END_DATE + "T23:59:59+09:00");
}
