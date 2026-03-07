import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function PATCH(request: Request) {
  try {
    const { isAdmin } = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { user_id, role } = body;

    if (!user_id || !["consumer", "shop_owner", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("users")
      .update({
        role,
        is_admin: role === "admin",
      })
      .eq("id", user_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin user role update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { isAdmin } = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();
    const adminClient = createAdminClient();

    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // auth.users からメール情報を取得
    const { data: authData } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });
    const authUsers = authData?.users ?? [];
    const emailMap = new Map<string, { email: string | undefined; last_sign_in_at: string | null; provider: string }>();
    for (const au of authUsers) {
      emailMap.set(au.id, {
        email: au.email,
        last_sign_in_at: au.last_sign_in_at ?? null,
        provider: au.app_metadata?.provider ?? "email",
      });
    }

    // 各ユーザーの推し登録数・共感数を取得
    const enriched = [];
    for (const user of (users as { id: string; nickname: string; avatar_url: string | null; is_admin: boolean; role: string; created_at: string }[]) ?? []) {
      const [oshiRes, empathyRes] = await Promise.all([
        supabase
          .from("oshi_shops")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("empathy_taps")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      const authInfo = emailMap.get(user.id);

      enriched.push({
        ...user,
        email: authInfo?.email ?? null,
        last_sign_in_at: authInfo?.last_sign_in_at ?? null,
        provider: authInfo?.provider ?? "unknown",
        oshi_count: oshiRes.count ?? 0,
        empathy_count: empathyRes.count ?? 0,
      });
    }

    return NextResponse.json({ users: enriched });
  } catch (error) {
    console.error("Admin users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
