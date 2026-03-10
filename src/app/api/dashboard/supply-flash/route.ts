import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getMyShopId } from "@/lib/queries/my-shop";

/** GET: 自店舗の在庫速報一覧（期限切れ含む） */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const shopId = await getMyShopId(supabase, user.id);
    if (!shopId) {
      return NextResponse.json({ posts: [] });
    }

    const { data, error } = await (supabase
      .from("supply_flash_posts")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false }) as unknown as Promise<{
      data: unknown[];
      error: unknown;
    }>);

    if (error) {
      console.error("Supply Flash GET エラー:", error);
      return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ posts: data ?? [] });
  } catch (error) {
    console.error("Supply Flash GET エラー:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST: 在庫速報を投稿 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const shopId = await getMyShopId(supabase, user.id);
    if (!shopId) {
      return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, image_url, supply_type, remaining_count, expires_at } = body;

    if (!title || title.length > 60) {
      return NextResponse.json(
        { error: "タイトルは1〜60文字で入力してください" },
        { status: 400 }
      );
    }
    if (description && description.length > 280) {
      return NextResponse.json(
        { error: "説明は280文字以内で入力してください" },
        { status: 400 }
      );
    }

    // デフォルト期限: 24時間後
    const expiresAtValue = expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await ((supabase
      .from("supply_flash_posts") as ReturnType<typeof supabase.from>)
      .insert({
        shop_id: shopId,
        title,
        description: description || null,
        image_url: image_url || null,
        supply_type: supply_type || "limited",
        remaining_count: remaining_count != null ? Number(remaining_count) : null,
        expires_at: expiresAtValue,
        is_active: true,
      } as never)
      .select()
      .single() as unknown as Promise<{ data: unknown; error: unknown }>);

    if (error) {
      console.error("Supply Flash POST エラー:", error);
      return NextResponse.json({ error: "投稿に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ post: data }, { status: 201 });
  } catch (error) {
    console.error("Supply Flash POST エラー:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** DELETE: 在庫速報を削除 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const shopId = await getMyShopId(supabase, user.id);
    if (!shopId) {
      return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "IDが必要です" }, { status: 400 });
    }

    const { error } = await (supabase
      .from("supply_flash_posts")
      .delete()
      .eq("id", id)
      .eq("shop_id", shopId) as unknown as Promise<{ error: unknown }>);

    if (error) {
      console.error("Supply Flash DELETE エラー:", error);
      return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Supply Flash DELETE エラー:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
