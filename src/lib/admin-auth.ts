import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * サーバーサイドで管理者権限を確認する
 * @returns { user, isAdmin } or throws redirect
 */
export async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, isAdmin: false };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  const isAdmin = (profile as { is_admin: boolean } | null)?.is_admin ?? false;

  return { user, isAdmin };
}
