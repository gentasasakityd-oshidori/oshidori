import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** GET: 推し店の統合フィード（近況・在庫速報・メッセージ） */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // 推し店のIDを取得
    const { data: oshiShops } = await db
      .from("oshi_shops")
      .select("shop_id")
      .eq("user_id", user.id);

    const shopIds = (oshiShops || []).map((o: { shop_id: string }) => o.shop_id);

    if (shopIds.length === 0) {
      return NextResponse.json({ feed: [], streak: null, recommendation: null });
    }

    // 並行で各データを取得
    const [updatesRes, flashRes, messagesRes, streakRes, recoRes] = await Promise.all([
      // 近況更新
      db
        .from("shop_updates")
        .select("id, shop_id, content, image_url, created_at, shops!inner(name, slug, owner_image_url)")
        .in("shop_id", shopIds)
        .order("created_at", { ascending: false })
        .limit(20),
      // 在庫速報
      db
        .from("supply_flash_posts")
        .select("id, shop_id, item_name, description, image_url, available_until, created_at, shops!inner(name, slug, owner_image_url)")
        .in("shop_id", shopIds)
        .order("created_at", { ascending: false })
        .limit(10),
      // メッセージ
      db
        .from("messages")
        .select("id, shop_id, title, content, created_at, shops!inner(name, slug, owner_image_url)")
        .in("shop_id", shopIds)
        .order("created_at", { ascending: false })
        .limit(10),
      // ストリーク
      db
        .from("user_engagement_streaks")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      // 日替わりレコメンド
      db
        .from("daily_recommendations")
        .select("*, shops!inner(name, slug, image_url, area, category)")
        .eq("user_id", user.id)
        .eq("date", new Date().toISOString().split("T")[0])
        .limit(3),
    ]);

    // フィードアイテムを統合してタイムライン化
    type FeedItem = {
      id: string;
      type: "update" | "flash" | "message";
      shop_name: string;
      shop_slug: string;
      shop_image: string | null;
      content: string;
      image_url: string | null;
      created_at: string;
      extra?: Record<string, unknown>;
    };

    const feed: FeedItem[] = [];

    // 近況更新をフィードに変換
    for (const u of updatesRes.data || []) {
      const shop = u.shops as { name: string; slug: string; owner_image_url: string | null };
      feed.push({
        id: u.id,
        type: "update",
        shop_name: shop.name,
        shop_slug: shop.slug,
        shop_image: shop.owner_image_url,
        content: u.content,
        image_url: u.image_url,
        created_at: u.created_at,
      });
    }

    // 在庫速報をフィードに変換
    for (const f of flashRes.data || []) {
      const shop = f.shops as { name: string; slug: string; owner_image_url: string | null };
      feed.push({
        id: f.id,
        type: "flash",
        shop_name: shop.name,
        shop_slug: shop.slug,
        shop_image: shop.owner_image_url,
        content: f.item_name + (f.description ? `: ${f.description}` : ""),
        image_url: f.image_url,
        created_at: f.created_at,
        extra: { available_until: f.available_until },
      });
    }

    // メッセージをフィードに変換
    for (const m of messagesRes.data || []) {
      const shop = m.shops as { name: string; slug: string; owner_image_url: string | null };
      feed.push({
        id: m.id,
        type: "message",
        shop_name: shop.name,
        shop_slug: shop.slug,
        shop_image: shop.owner_image_url,
        content: m.title + (m.content ? `\n${m.content}` : ""),
        image_url: null,
        created_at: m.created_at,
      });
    }

    // 時系列でソート
    feed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // ストリーク更新（今日の活動としてカウント）
    const today = new Date().toISOString().split("T")[0];
    const streak = streakRes.data as {
      current_streak: number;
      longest_streak: number;
      last_activity_date: string;
    } | null;

    if (!streak) {
      // 初回: ストリーク作成
      await db.from("user_engagement_streaks").insert({
        user_id: user.id,
        current_streak: 1,
        longest_streak: 1,
        last_activity_date: today,
      });
    } else if (streak.last_activity_date !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      const newStreak = streak.last_activity_date === yesterdayStr
        ? streak.current_streak + 1
        : 1;

      await db
        .from("user_engagement_streaks")
        .update({
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, streak.longest_streak),
          last_activity_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    }

    return NextResponse.json({
      feed: feed.slice(0, 30),
      streak: streak
        ? {
            current: streak.current_streak,
            longest: streak.longest_streak,
          }
        : { current: 1, longest: 1 },
      recommendations: (recoRes.data || []).map((r: { id: string; reason: string; shops: { name: string; slug: string; image_url: string; area: string; category: string } }) => ({
        id: r.id,
        reason: r.reason,
        shop: r.shops,
      })),
    });
  } catch (error) {
    console.error("Feed error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
