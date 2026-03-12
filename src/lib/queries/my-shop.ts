/**
 * 現在ログイン中のユーザーが所有する店舗を取得するヘルパー
 *
 * shops.owner_id === userId で店舗を検索する。
 * RLSの影響を回避するため、サービスロールクライアントを使用。
 * 全ダッシュボード API で共通利用する。
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";

/** RLSバイパス用サービスロールクライアント */
function getServiceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * ログインユーザーの店舗IDを取得
 * サービスロールでRLSをバイパスし、owner_idで確実に検索する
 * @returns shop_id (string) or null
 */
export async function getMyShopId(
  _supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const admin = getServiceClient();
  const { data, error } = await admin
    .from("shops")
    .select("id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getMyShopId error:", error);
    return null;
  }
  if (!data) return null;
  return (data as { id: string }).id;
}

/**
 * ログインユーザーが指定された shop_id を所有しているか検証
 * サービスロールでRLSをバイパスし、確実に検証する
 */
export async function verifyShopOwnership(
  _supabase: SupabaseClient,
  userId: string,
  shopId: string
): Promise<boolean> {
  const admin = getServiceClient();
  const { data } = await admin
    .from("shops")
    .select("id")
    .eq("id", shopId)
    .eq("owner_id", userId)
    .maybeSingle();

  return !!data;
}
