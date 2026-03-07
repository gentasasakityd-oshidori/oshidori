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

    // 応援ポイント（push_reason）の集計
    const { data: oshiData } = await supabase
      .from("oshi_shops")
      .select("push_reason, created_at");

    const oshiRows = (oshiData ?? []) as { push_reason: string | null; created_at: string }[];
    const totalOshi = oshiRows.length;
    const withReason = oshiRows.filter((r) => r.push_reason && r.push_reason.trim());
    const pushReasonRate = totalOshi > 0 ? Math.round((withReason.length / totalOshi) * 100) : 0;

    // 応援ポイントのキーワード頻出集計
    const wordCounts = new Map<string, number>();
    for (const row of withReason) {
      const text = row.push_reason!.trim();
      // 簡易的にスペースや句読点で分割して2文字以上の語を集計
      const words = text.split(/[\s、。！？!?,.・/／]+/).filter((w) => w.length >= 2);
      for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
      }
    }

    const topKeywords = [...wordCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([word, count]) => ({ word, count }));

    // 応援ポイントの全文リスト（最新20件）
    const recentReasons = withReason
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20)
      .map((r) => ({
        text: r.push_reason!,
        date: r.created_at,
      }));

    // 共感タップ コメントの集計
    const { data: empathyData } = await supabase
      .from("empathy_taps")
      .select("tag_type, comment, created_at");

    const empathyRows = (empathyData ?? []) as { tag_type: string; comment: string | null; created_at: string }[];
    const totalEmpathy = empathyRows.length;
    const withComment = empathyRows.filter((r) => r.comment && r.comment.trim());
    const commentRate = totalEmpathy > 0 ? Math.round((withComment.length / totalEmpathy) * 100) : 0;

    // コメントのキーワード集計
    const commentWordCounts = new Map<string, number>();
    for (const row of withComment) {
      const text = row.comment!.trim();
      const words = text.split(/[\s、。！？!?,.・/／]+/).filter((w) => w.length >= 2);
      for (const word of words) {
        commentWordCounts.set(word, (commentWordCounts.get(word) ?? 0) + 1);
      }
    }

    const topCommentKeywords = [...commentWordCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));

    // 最新コメント20件
    const recentComments = withComment
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20)
      .map((r) => ({
        tag_type: r.tag_type,
        text: r.comment!,
        date: r.created_at,
      }));

    // 月別推移（応援ポイント入力率）
    const monthlyOshi = new Map<string, { total: number; withReason: number }>();
    for (const row of oshiRows) {
      const month = row.created_at.slice(0, 7); // YYYY-MM
      const entry = monthlyOshi.get(month) ?? { total: 0, withReason: 0 };
      entry.total++;
      if (row.push_reason && row.push_reason.trim()) {
        entry.withReason++;
      }
      monthlyOshi.set(month, entry);
    }

    const monthlyTrend = [...monthlyOshi.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        total: data.total,
        with_reason: data.withReason,
        rate: data.total > 0 ? Math.round((data.withReason / data.total) * 100) : 0,
      }));

    return NextResponse.json({
      push_reason: {
        total_oshi: totalOshi,
        with_reason: withReason.length,
        rate: pushReasonRate,
        top_keywords: topKeywords,
        recent_reasons: recentReasons,
      },
      empathy_comments: {
        total_empathy: totalEmpathy,
        with_comment: withComment.length,
        rate: commentRate,
        top_keywords: topCommentKeywords,
        recent_comments: recentComments,
      },
      monthly_trend: monthlyTrend,
    });
  } catch (error) {
    console.error("Motivation analysis error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
