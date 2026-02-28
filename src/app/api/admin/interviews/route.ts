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

    // インタビュー一覧（店舗情報付き）
    const { data: interviews } = await supabase
      .from("ai_interviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (!interviews) {
      return NextResponse.json({ interviews: [], stats: {} });
    }

    // 店舗名を取得
    const shopIds = [...new Set((interviews as { shop_id: string }[]).map(iv => iv.shop_id))];
    const { data: shopsData } = await supabase
      .from("shops")
      .select("id, name, slug")
      .in("id", shopIds);

    const shopMap = new Map(
      ((shopsData ?? []) as { id: string; name: string; slug: string }[]).map(s => [s.id, s])
    );

    // メッセージ数をインタビューごとに集計
    const interviewIds = (interviews as { id: string }[]).map(iv => iv.id);
    const { data: messagesData } = await supabase
      .from("interview_messages")
      .select("interview_id, role")
      .in("interview_id", interviewIds);

    const msgCounts = new Map<string, { user: number; assistant: number }>();
    for (const msg of ((messagesData ?? []) as { interview_id: string; role: string }[])) {
      const counts = msgCounts.get(msg.interview_id) ?? { user: 0, assistant: 0 };
      if (msg.role === "user") counts.user++;
      else counts.assistant++;
      msgCounts.set(msg.interview_id, counts);
    }

    // エンリッチされたインタビューデータ
    const enriched = (interviews as {
      id: string;
      shop_id: string;
      status: string;
      current_phase: number;
      created_at: string;
      updated_at: string;
    }[]).map(iv => {
      const shop = shopMap.get(iv.shop_id);
      const counts = msgCounts.get(iv.id) ?? { user: 0, assistant: 0 };
      return {
        ...iv,
        shop_name: shop?.name ?? "不明",
        shop_slug: shop?.slug ?? "",
        message_count: counts.user + counts.assistant,
        user_message_count: counts.user,
      };
    });

    // 統計
    const total = enriched.length;
    const completed = enriched.filter(iv => iv.status === "completed").length;
    const inProgress = enriched.filter(iv => iv.status === "in_progress").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const avgMessages = total > 0
      ? Math.round(enriched.reduce((sum, iv) => sum + iv.message_count, 0) / total)
      : 0;

    return NextResponse.json({
      interviews: enriched,
      stats: {
        total,
        completed,
        in_progress: inProgress,
        completion_rate: completionRate,
        avg_messages: avgMessages,
      },
    });
  } catch (error) {
    console.error("Admin interviews error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
