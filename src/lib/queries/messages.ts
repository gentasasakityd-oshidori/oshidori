import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ShopMessage, MessageRead } from "@/types/database";

/** 店舗の送信済みメッセージ一覧を取得 */
export async function getShopMessages(shopId: string): Promise<ShopMessage[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("shop_messages")
    .select("*")
    .eq("shop_id", shopId)
    .not("sent_at", "is", null)
    .order("sent_at", { ascending: false });

  if (error) throw error;
  return (data as ShopMessage[]) ?? [];
}

/** 推しファン向けメッセージを取得（消費者用） */
export async function getMessagesForFan(
  shopId: string,
  userId: string
): Promise<(ShopMessage & { is_read: boolean })[]> {
  const supabase = await createServerSupabaseClient();

  const { data: messages, error } = await supabase
    .from("shop_messages")
    .select("*")
    .eq("shop_id", shopId)
    .eq("target", "all_fans")
    .not("sent_at", "is", null)
    .order("sent_at", { ascending: false });

  if (error) throw error;
  const typedMessages = (messages as ShopMessage[] | null) ?? [];
  if (typedMessages.length === 0) return [];

  const messageIds = typedMessages.map((m) => m.id);
  const { data: reads } = await supabase
    .from("message_reads")
    .select("message_id")
    .eq("user_id", userId)
    .in("message_id", messageIds);

  const typedReads = (reads as Pick<MessageRead, "message_id">[] | null) ?? [];
  const readSet = new Set(typedReads.map((r) => r.message_id));

  return typedMessages.map((m) => ({
    ...m,
    is_read: readSet.has(m.id),
  }));
}
