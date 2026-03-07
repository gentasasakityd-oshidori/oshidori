import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET: 品質シグナルダッシュボード（全店舗のエンゲージメント指標）
export async function GET() {
  try {
    const { isAdmin } = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();

    // 全公開店舗を取得
    const { data: shopsData } = await supabase
      .from("shops")
      .select("id, name, slug, is_published, updated_at, created_at")
      .eq("is_published", true)
      .order("name");

    const shops = (shopsData ?? []) as {
      id: string;
      name: string;
      slug: string;
      is_published: boolean;
      updated_at: string;
      created_at: string;
    }[];

    if (shops.length === 0) {
      return NextResponse.json({ shops: [], summary: { total: 0, needs_attention: 0 } });
    }

    const shopIds = shops.map((s) => s.id);

    // 並列で各指標を集計
    const [oshiData, empathyData, visitData, letterData, storyData] =
      await Promise.all([
        supabase.from("oshi_shops").select("shop_id").in("shop_id", shopIds),
        supabase.from("empathy_taps").select("story_id"),
        supabase.from("visit_records").select("shop_id").in("shop_id", shopIds),
        supabase.from("fan_letters").select("shop_id").in("shop_id", shopIds),
        supabase
          .from("stories")
          .select("id, shop_id, status, updated_at")
          .in("shop_id", shopIds),
      ]);

    // oshi_shops 集計
    const oshiCounts = new Map<string, number>();
    for (const row of (oshiData.data ?? []) as { shop_id: string }[]) {
      oshiCounts.set(row.shop_id, (oshiCounts.get(row.shop_id) ?? 0) + 1);
    }

    // empathy_taps → story_id → shop_id マッピング
    const storyToShop = new Map<string, string>();
    for (const s of (storyData.data ?? []) as { id: string; shop_id: string; status: string; updated_at: string }[]) {
      storyToShop.set(s.id, s.shop_id);
    }
    const empathyCounts = new Map<string, number>();
    for (const row of (empathyData.data ?? []) as { story_id: string }[]) {
      const sid = storyToShop.get(row.story_id);
      if (sid) {
        empathyCounts.set(sid, (empathyCounts.get(sid) ?? 0) + 1);
      }
    }

    // visit_records 集計
    const visitCounts = new Map<string, number>();
    for (const row of (visitData.data ?? []) as { shop_id: string }[]) {
      visitCounts.set(row.shop_id, (visitCounts.get(row.shop_id) ?? 0) + 1);
    }

    // fan_letters 集計
    const letterCounts = new Map<string, number>();
    for (const row of (letterData.data ?? []) as { shop_id: string }[]) {
      letterCounts.set(row.shop_id, (letterCounts.get(row.shop_id) ?? 0) + 1);
    }

    // ストーリー状態
    const storyStatusMap = new Map<string, { published: boolean; lastUpdate: string }>();
    for (const s of (storyData.data ?? []) as { id: string; shop_id: string; status: string; updated_at: string }[]) {
      const existing = storyStatusMap.get(s.shop_id);
      if (!existing || s.status === "published") {
        storyStatusMap.set(s.shop_id, {
          published: s.status === "published",
          lastUpdate: s.updated_at,
        });
      }
    }

    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    // 各店舗のスコアと品質情報を組み立て
    const shopQuality = shops.map((shop) => {
      const oshi = oshiCounts.get(shop.id) ?? 0;
      const empathy = empathyCounts.get(shop.id) ?? 0;
      const visits = visitCounts.get(shop.id) ?? 0;
      const letters = letterCounts.get(shop.id) ?? 0;
      const storyInfo = storyStatusMap.get(shop.id);

      // 品質スコア（重み付き合計）
      const score = oshi * 3 + empathy * 1 + visits * 2 + letters * 5;

      // フラグ判定
      const flags: string[] = [];
      const lastUpdate = storyInfo?.lastUpdate ?? shop.updated_at;
      if (now - new Date(lastUpdate).getTime() > THIRTY_DAYS) {
        flags.push("long_inactive");
      }
      if (letters === 0 && visits === 0) {
        flags.push("no_engagement");
      }
      if (!storyInfo?.published) {
        flags.push("no_published_story");
      }

      return {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        oshi_count: oshi,
        empathy_count: empathy,
        visit_count: visits,
        letter_count: letters,
        score,
        flags,
        last_updated: lastUpdate,
      };
    });

    // スコア順でソート
    shopQuality.sort((a, b) => b.score - a.score);

    const needsAttention = shopQuality.filter((s) => s.flags.length > 0).length;

    return NextResponse.json({
      shops: shopQuality,
      summary: {
        total: shopQuality.length,
        needs_attention: needsAttention,
        avg_score: shopQuality.length > 0
          ? Math.round(shopQuality.reduce((s, q) => s + q.score, 0) / shopQuality.length)
          : 0,
      },
    });
  } catch (error) {
    console.error("Admin quality error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
