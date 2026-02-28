import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ShopStructuredTag, ShopBasicInfo, Database } from "@/types/database";

type TagInsert = Database["public"]["Tables"]["shop_structured_tags"]["Insert"];

/** 店舗の構造化タグを取得 */
export async function getShopTags(shopId: string): Promise<ShopStructuredTag[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("shop_structured_tags")
    .select("*")
    .eq("shop_id", shopId)
    .order("confidence_score", { ascending: false });

  if (error) throw error;
  return (data as ShopStructuredTag[]) ?? [];
}

/** 店舗の基本検索情報を取得 */
export async function getShopBasicInfo(shopId: string): Promise<ShopBasicInfo | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("shop_basic_info")
    .select("*")
    .eq("shop_id", shopId)
    .single();

  if (error) return null;
  return data as ShopBasicInfo;
}

/** 構造化タグをDB保存（AIインタビュー完了時に呼び出す） */
export async function saveStructuredTags(
  shopId: string,
  tags: { kodawari: string[]; personality: string[]; scene: string[] },
  source: string = "ai_interview"
): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const rows: TagInsert[] = [
    ...tags.kodawari.map((v) => ({
      shop_id: shopId,
      tag_category: "kodawari",
      tag_value: v,
      source,
    })),
    ...tags.personality.map((v) => ({
      shop_id: shopId,
      tag_category: "personality",
      tag_value: v,
      source,
    })),
    ...tags.scene.map((v) => ({
      shop_id: shopId,
      tag_category: "scene",
      tag_value: v,
      source,
    })),
  ];

  if (rows.length === 0) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("shop_structured_tags") as any).insert(rows);
  if (error) throw error;
}
