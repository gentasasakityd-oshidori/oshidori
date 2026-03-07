/**
 * 現在ログイン中のユーザーが所有する店舗を取得するヘルパー
 *
 * shops.owner_id === auth.uid() で店舗を検索する。
 * 全ダッシュボード API で共通利用する。
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * ログインユーザーの店舗IDを取得
 * @returns shop_id (string) or null
 */
export async function getMyShopId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", userId)
    .limit(1)
    .single();

  if (!data) return null;
  return (data as { id: string }).id;
}

/**
 * ログインユーザーが指定された shop_id を所有しているか検証
 */
export async function verifyShopOwnership(
  supabase: SupabaseClient,
  userId: string,
  shopId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("shops")
    .select("id")
    .eq("id", shopId)
    .eq("owner_id", userId)
    .single();

  return !!data;
}
