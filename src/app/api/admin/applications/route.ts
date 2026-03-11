import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { triggerPostApprovalPipeline } from "@/lib/onboarding-pipeline";
import { notifyApplicationResult } from "@/lib/email";

// Vercelサーバーレス関数の最大実行時間（秒）
export const maxDuration = 300;

// パイプライン用: サービスロールクライアント（fire-and-forget / after()対応）
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("role, is_admin")
    .eq("id", user.id)
    .single();

  const p = profile as { role: string; is_admin: boolean } | null;
  if (!p || (p.role !== "admin" && !p.is_admin)) return null;

  return user;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const admin = await verifyAdmin(supabase);

    if (!admin) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const status = request.nextUrl.searchParams.get("status") || "pending";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { data, error } = await db
      .from("shop_role_applications")
      .select("*, users!shop_role_applications_user_id_fkey(nickname, avatar_url)")
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Applications fetch error:", error);
      return NextResponse.json(
        { error: "データの取得に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ applications: data || [] });
  } catch {
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const admin = await verifyAdmin(supabase);

    if (!admin) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const body = await request.json();
    const { application_id, action, review_note } = body;

    if (!application_id || !["approved", "rejected"].includes(action)) {
      return NextResponse.json(
        { error: "不正なリクエストです" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // 申請を取得
    const { data: application } = await db
      .from("shop_role_applications")
      .select("*")
      .eq("id", application_id)
      .single();

    if (!application) {
      return NextResponse.json(
        { error: "申請が見つかりません" },
        { status: 404 }
      );
    }

    const app = application as {
      id: string;
      user_id: string;
      shop_name: string;
      shop_genre: string | null;
      shop_area: string | null;
      applicant_name: string;
      status: string;
      address_prefecture: string | null;
      address_city: string | null;
      address_street: string | null;
      address_building: string | null;
      phone: string | null;
      website_url: string | null;
      instagram_url: string | null;
      tabelog_url: string | null;
      gmb_url: string | null;
    };

    // 申請ステータスを更新
    const { error: updateError } = await db
      .from("shop_role_applications")
      .update({
        status: action,
        reviewed_by: admin.id,
        review_note: review_note || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", application_id);

    if (updateError) {
      console.error("Application update error:", updateError);
      return NextResponse.json(
        { error: "更新に失敗しました" },
        { status: 500 }
      );
    }

    // 承認の場合: ユーザーのroleをshop_ownerに更新 + shopsテーブルに初期レコード
    let pipelineShopId: string | null = null;
    if (action === "approved") {
      // ユーザーrole更新
      await db
        .from("users")
        .update({ role: "shop_owner" })
        .eq("id", app.user_id);

      // shopsテーブルに初期レコード作成（slug生成 + owner_id紐付け）
      const slug = app.shop_name
        .toLowerCase()
        .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        || `shop-${Date.now()}`;

      // 同じslugが既に存在する場合、タイムスタンプを付与
      const { data: existingSlug } = await db
        .from("shops")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

      const { data: newShop } = await db.from("shops").insert({
        slug: finalSlug,
        name: app.shop_name,
        owner_name: app.applicant_name,
        owner_id: app.user_id,
        area: app.shop_area || app.address_prefecture || "未設定",
        category: app.shop_genre || "japanese",
        address_prefecture: app.address_prefecture || null,
        address_city: app.address_city || null,
        address_street: app.address_street || null,
        address_building: app.address_building || null,
        phone: app.phone || null,
        website_url: app.website_url || null,
        instagram_url: app.instagram_url || null,
        tabelog_url: app.tabelog_url || null,
        gmb_url: app.gmb_url || null,
        is_published: false,
        onboarding_phase: "pre_research_running",
      }).select("id").single();

      if (newShop) {
        pipelineShopId = (newShop as { id: string }).id;
      }
    }

    // 承認後パイプラインを after() で実行（レスポンス送信後もサーバーレス関数を維持）
    if (pipelineShopId) {
      const shopId = pipelineShopId;
      after(async () => {
        try {
          const adminDb = createAdminClient();
          await triggerPostApprovalPipeline(adminDb, shopId);
        } catch (err) {
          console.error("[Pipeline] Background pipeline error:", err);
        }
      });
    }

    // 審査結果メール通知（承認・却下共通）
    const { data: applicantUser } = await db
      .from("users")
      .select("email")
      .eq("id", app.user_id)
      .single();
    const applicantEmail = (applicantUser as { email?: string } | null)?.email;

    if (applicantEmail) {
      notifyApplicationResult(applicantEmail, {
        applicantName: app.applicant_name,
        shopName: app.shop_name,
        approved: action === "approved",
        rejectReason: action === "rejected" ? (review_note || undefined) : undefined,
      }).catch((e) => console.error("審査結果通知エラー:", e));
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
