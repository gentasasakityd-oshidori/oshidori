import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { isAdmin } = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();

    // --- 供給サイド（店舗）指標 ---
    const [shopsRes, publishedRes, storiesRes, publishedStoriesRes, interviewsRes, completedInterviewsRes] =
      await Promise.all([
        supabase.from("shops").select("id", { count: "exact", head: true }),
        supabase.from("shops").select("id", { count: "exact", head: true }).eq("is_published", true),
        supabase.from("stories").select("id", { count: "exact", head: true }),
        supabase.from("stories").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("ai_interviews").select("id", { count: "exact", head: true }),
        supabase.from("ai_interviews").select("id", { count: "exact", head: true }).eq("status", "completed"),
      ]);

    const totalShops = shopsRes.count ?? 0;
    const publishedShops = publishedRes.count ?? 0;
    const totalStories = storiesRes.count ?? 0;
    const publishedStories = publishedStoriesRes.count ?? 0;
    const totalInterviews = interviewsRes.count ?? 0;
    const completedInterviews = completedInterviewsRes.count ?? 0;

    // ストーリー公開率
    const storyPublishRate = totalStories > 0 ? Math.round((publishedStories / totalStories) * 100) : 0;
    // インタビュー完了率
    const interviewCompletionRate = totalInterviews > 0 ? Math.round((completedInterviews / totalInterviews) * 100) : 0;

    // --- 需要サイド（消費者）指標 ---
    const [usersRes, oshiRes, empathyRes] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("oshi_shops").select("id", { count: "exact", head: true }),
      supabase.from("empathy_taps").select("id", { count: "exact", head: true }),
    ]);

    const totalUsers = usersRes.count ?? 0;
    const totalOshi = oshiRes.count ?? 0;
    const totalEmpathy = empathyRes.count ?? 0;

    // 推し店登録しているユーザー数
    const { data: oshiUserData } = await supabase
      .from("oshi_shops")
      .select("user_id");
    const oshiUserIds = new Set(((oshiUserData ?? []) as { user_id: string }[]).map(r => r.user_id));
    const oshiUserCount = oshiUserIds.size;
    // 推し登録率
    const oshiRegistrationRate = totalUsers > 0 ? Math.round((oshiUserCount / totalUsers) * 100) : 0;

    // 共感タップしているユーザー数
    const { data: empathyUserData } = await supabase
      .from("empathy_taps")
      .select("user_id");
    const empathyUserIds = new Set(((empathyUserData ?? []) as { user_id: string }[]).map(r => r.user_id));
    const empathyUserCount = empathyUserIds.size;

    // --- コミュニティ指標 ---
    // 店主メッセージ（shop_messages）
    const { count: messageCount } = await supabase
      .from("shop_messages")
      .select("id", { count: "exact", head: true });

    // メッセージ配信した店舗数
    const { data: msgShopData } = await supabase
      .from("shop_messages")
      .select("shop_id");
    const msgShopIds = new Set(((msgShopData ?? []) as { shop_id: string }[]).map(r => r.shop_id));
    const messageShopCount = msgShopIds.size;
    const messageDeliveryRate = totalShops > 0 ? Math.round((messageShopCount / totalShops) * 100) : 0;

    // 1店舗あたり平均推しファン数
    const avgOshiPerShop = publishedShops > 0 ? Math.round((totalOshi / publishedShops) * 10) / 10 : 0;

    // --- 店舗ランキング（推しファン数上位5） ---
    const { data: shopRankData } = await supabase
      .from("oshi_shops")
      .select("shop_id");

    const shopOshiCounts = new Map<string, number>();
    for (const row of ((shopRankData ?? []) as { shop_id: string }[])) {
      shopOshiCounts.set(row.shop_id, (shopOshiCounts.get(row.shop_id) ?? 0) + 1);
    }

    const topShopIds = [...shopOshiCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    let topShops: { id: string; name: string; slug: string; oshi_count: number }[] = [];
    if (topShopIds.length > 0) {
      const { data: topShopsData } = await supabase
        .from("shops")
        .select("id, name, slug")
        .in("id", topShopIds);

      topShops = ((topShopsData ?? []) as { id: string; name: string; slug: string }[]).map(s => ({
        ...s,
        oshi_count: shopOshiCounts.get(s.id) ?? 0,
      })).sort((a, b) => b.oshi_count - a.oshi_count);
    }

    return NextResponse.json({
      // 供給サイド
      supply: {
        shops: totalShops,
        published_shops: publishedShops,
        stories: totalStories,
        published_stories: publishedStories,
        story_publish_rate: storyPublishRate,
        interviews: totalInterviews,
        completed_interviews: completedInterviews,
        interview_completion_rate: interviewCompletionRate,
      },
      // 需要サイド
      demand: {
        users: totalUsers,
        oshi_total: totalOshi,
        oshi_user_count: oshiUserCount,
        oshi_registration_rate: oshiRegistrationRate,
        empathy_total: totalEmpathy,
        empathy_user_count: empathyUserCount,
      },
      // コミュニティ
      community: {
        message_count: messageCount ?? 0,
        message_shop_count: messageShopCount,
        message_delivery_rate: messageDeliveryRate,
        avg_oshi_per_shop: avgOshiPerShop,
      },
      // ランキング
      top_shops: topShops,

      // レガシー互換
      shops: totalShops,
      published_shops: publishedShops,
      users: totalUsers,
      stories: totalStories,
      oshi_total: totalOshi,
      empathy_total: totalEmpathy,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
