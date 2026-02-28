import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Menu } from "@/types/database";

export async function getMenusByShopId(shopId: string): Promise<Menu[]> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("menus")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}
