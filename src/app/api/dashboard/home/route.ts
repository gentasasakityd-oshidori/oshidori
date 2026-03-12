import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** RLSバイパス用サービスロールクライアント */
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** GET: ダッシュボードホームのKPI・最近の共感・タグ分布・セットアップ状態 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // owner_id でユーザーの店舗を検索（RLSバイパスで確実に取得）
    const adminDb = createAdminClient();
    const { data: shop } = await adminDb
      .from("shops")
      .select("id, name, owner_name, onboarding_phase")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle();

    const shopId = shop ? (shop as { id: string }).id : null;

    if (!shop || !shopId) {
      return NextResponse.json({
        shop: null,
        kpi: { oshi_count: 0, empathy_count: 0 },
        recentEmpathy: [],
        tagDistribution: [],
        setupTasks: {
          profile: false,
          interview: false,
          story_review: false,
          photo: false,
        },
      });
    }

    // 今週・先週の境界
    const now = new Date();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    // 並列でデータ取得
    const [
      oshiRes,
      storiesRes,
      interviewRes,
      photoReqRes,
      visitCountRes,
      letterCountRes,
      oshiThisWeekRes,
      oshiLastWeekRes,
      visitThisWeekRes,
      visitLastWeekRes,
      letterThisWeekRes,
      letterLastWeekRes,
    ] = await Promise.all([
      // 推し登録数
      supabase
        .from("oshi_shops")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shopId),
      // ストーリー（公開・下書き両方）
      supabase
        .from("stories")
        .select("id, status")
        .eq("shop_id", shopId),
      // インタビュー完了チェック
      supabase
        .from("ai_interviews")
        .select("id, status")
        .eq("shop_id", shopId)
        .eq("status", "completed")
        .limit(1),
      // 写真リクエスト
      supabase
        .from("photo_requests")
        .select("id")
        .eq("shop_id", shopId)
        .limit(1),
      // 来店記録数
      supabase
        .from("visit_records")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shopId),
      // ファンレター数
      supabase
        .from("fan_letters")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shopId),
      // 今週の推し追加
      supabase
        .from("oshi_shops")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shopId)
        .gte("created_at", startOfThisWeek.toISOString()),
      // 先週の推し追加
      supabase
        .from("oshi_shops")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shopId)
        .gte("created_at", startOfLastWeek.toISOString())
        .lt("created_at", startOfThisWeek.toISOString()),
      // 今週の来店
      supabase
        .from("visit_records")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shopId)
        .gte("created_at", startOfThisWeek.toISOString()),
      // 先週の来店
      supabase
        .from("visit_records")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shopId)
        .gte("created_at", startOfLastWeek.toISOString())
        .lt("created_at", startOfThisWeek.toISOString()),
      // 今週のファンレター
      supabase
        .from("fan_letters")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shopId)
        .gte("created_at", startOfThisWeek.toISOString()),
      // 先週のファンレター
      supabase
        .from("fan_letters")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shopId)
        .gte("created_at", startOfLastWeek.toISOString())
        .lt("created_at", startOfThisWeek.toISOString()),
    ]);

    const oshiCount = oshiRes.count ?? 0;
    const visitCount = visitCountRes.count ?? 0;
    const letterCount = letterCountRes.count ?? 0;
    const stories = (storiesRes.data as { id: string; status: string }[]) ?? [];
    const storyIds = stories.map((s) => s.id);
    const publishedStories = stories.filter((s) => s.status === "published");
    const hasCompletedInterview = ((interviewRes.data as { id: string }[]) ?? []).length > 0;
    const hasPhotos = ((photoReqRes.data as { id: string }[]) ?? []).length > 0;

    // 共感タップ関連（ストーリーがある場合のみ）
    let empathyCount = 0;
    let recentEmpathy: {
      id: string;
      nickname: string;
      tagId: string;
      storyTitle: string;
      time: string;
    }[] = [];
    let tagDistribution: { tagId: string; count: number }[] = [];

    if (storyIds.length > 0) {
      // 共感タップ総数
      const empathyCountRes = await supabase
        .from("empathy_taps")
        .select("id", { count: "exact", head: true })
        .in("story_id", storyIds);
      empathyCount = empathyCountRes.count ?? 0;

      // 最近の共感タップ（最新5件）
      const recentRes = await supabase
        .from("empathy_taps")
        .select("id, user_id, story_id, tag_type, created_at")
        .in("story_id", storyIds)
        .order("created_at", { ascending: false })
        .limit(5);

      const recentTaps = (recentRes.data as {
        id: string;
        user_id: string;
        story_id: string;
        tag_type: string;
        created_at: string;
      }[]) ?? [];

      if (recentTaps.length > 0) {
        // ユーザーニックネーム取得
        const userIds = [...new Set(recentTaps.map((t) => t.user_id))];
        const usersRes = await supabase
          .from("users")
          .select("id, nickname")
          .in("id", userIds);
        const usersMap = new Map<string, string>();
        for (const u of (usersRes.data as { id: string; nickname: string }[]) ?? []) {
          usersMap.set(u.id, u.nickname);
        }

        // ストーリータイトル取得
        const tapStoryIds = [...new Set(recentTaps.map((t) => t.story_id))];
        const tapStoriesRes = await supabase
          .from("stories")
          .select("id, title")
          .in("id", tapStoryIds);
        const storiesMap = new Map<string, string>();
        for (const s of (tapStoriesRes.data as { id: string; title: string }[]) ?? []) {
          storiesMap.set(s.id, s.title);
        }

        recentEmpathy = recentTaps.map((tap) => ({
          id: tap.id,
          nickname: usersMap.get(tap.user_id) ?? "ゲスト",
          tagId: tap.tag_type,
          storyTitle: storiesMap.get(tap.story_id) ?? "",
          time: formatRelativeTime(tap.created_at),
        }));
      }

      // タグ分布（全タップのtag_typeを集計）
      const allTapsRes = await supabase
        .from("empathy_taps")
        .select("tag_type")
        .in("story_id", storyIds);
      const allTaps = (allTapsRes.data as { tag_type: string }[]) ?? [];
      const tagCounts = new Map<string, number>();
      for (const tap of allTaps) {
        tagCounts.set(tap.tag_type, (tagCounts.get(tap.tag_type) ?? 0) + 1);
      }
      tagDistribution = Array.from(tagCounts.entries())
        .map(([tagId, count]) => ({ tagId, count }))
        .sort((a, b) => b.count - a.count);
    }

    // 共感タップの週次データ
    let empathyThisWeek = 0;
    let empathyLastWeek = 0;
    if (storyIds.length > 0) {
      const [empThisRes, empLastRes] = await Promise.all([
        supabase
          .from("empathy_taps")
          .select("id", { count: "exact", head: true })
          .in("story_id", storyIds)
          .gte("created_at", startOfThisWeek.toISOString()),
        supabase
          .from("empathy_taps")
          .select("id", { count: "exact", head: true })
          .in("story_id", storyIds)
          .gte("created_at", startOfLastWeek.toISOString())
          .lt("created_at", startOfThisWeek.toISOString()),
      ]);
      empathyThisWeek = empThisRes.count ?? 0;
      empathyLastWeek = empLastRes.count ?? 0;
    }

    // 未読ファンレター数
    const unreadLetterRes = await supabase
      .from("fan_letters")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shopId)
      .is("read_at", null);
    const unreadLetterCount = unreadLetterRes.count ?? 0;

    // セットアップタスク完了状態
    const setupTasks = {
      profile: true, // 店舗が存在 = プロフィール入力済み
      interview: hasCompletedInterview,
      story_review: publishedStories.length > 0,
      photo: hasPhotos,
    };

    const typedShop = shop as { id: string; name: string; owner_name: string; onboarding_phase: string };
    return NextResponse.json({
      shop: {
        id: typedShop.id,
        name: typedShop.name,
        owner_name: typedShop.owner_name,
        onboarding_phase: typedShop.onboarding_phase,
      },
      kpi: {
        oshi_count: oshiCount,
        empathy_count: empathyCount,
        visit_count: visitCount,
        letter_count: letterCount,
        unread_letter_count: unreadLetterCount,
      },
      weeklyTrends: {
        oshi: { thisWeek: oshiThisWeekRes.count ?? 0, lastWeek: oshiLastWeekRes.count ?? 0 },
        empathy: { thisWeek: empathyThisWeek, lastWeek: empathyLastWeek },
        visits: { thisWeek: visitThisWeekRes.count ?? 0, lastWeek: visitLastWeekRes.count ?? 0 },
        letters: { thisWeek: letterThisWeekRes.count ?? 0, lastWeek: letterLastWeekRes.count ?? 0 },
      },
      recentEmpathy,
      tagDistribution,
      setupTasks,
    });
  } catch (error) {
    console.error("Dashboard home GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/** 相対時間表示ユーティリティ */
function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}日前`;
  return new Date(dateStr).toLocaleDateString("ja-JP");
}
