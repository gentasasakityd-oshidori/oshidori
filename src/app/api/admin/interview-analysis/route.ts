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

    // 完了したインタビューのメッセージを取得
    const { data: interviews } = await supabase
      .from("ai_interviews")
      .select("id, shop_id, status, created_at, completed_at")
      .eq("status", "completed");

    const completedInterviews = (interviews ?? []) as {
      id: string;
      shop_id: string;
      status: string;
      created_at: string;
      completed_at: string;
    }[];

    const interviewIds = completedInterviews.map((i) => i.id);

    if (interviewIds.length === 0) {
      return NextResponse.json({
        total_completed: 0,
        phase_stats: [],
        avg_total_messages: 0,
        avg_duration_minutes: 0,
        interviews: [],
      });
    }

    // 全メッセージを取得
    const { data: messagesData } = await supabase
      .from("interview_messages")
      .select("interview_id, role, phase, created_at, content")
      .in("interview_id", interviewIds)
      .order("created_at", { ascending: true });

    const messages = (messagesData ?? []) as {
      interview_id: string;
      role: string;
      phase: number;
      created_at: string;
      content: string;
    }[];

    // フェーズ別の集計
    const phaseNames = [
      "ウォームアップ",
      "原点の物語",
      "こだわりの深層",
      "食べてほしい一品",
      "常連さんとの関係",
      "未来への想い",
    ];

    // interview_id ごとに整理
    const interviewMessages = new Map<string, typeof messages>();
    for (const msg of messages) {
      const arr = interviewMessages.get(msg.interview_id) ?? [];
      arr.push(msg);
      interviewMessages.set(msg.interview_id, arr);
    }

    // フェーズ別統計
    const phaseStats = phaseNames.map((name, idx) => {
      const phaseNum = idx + 1;
      let totalMessages = 0;
      let totalUserChars = 0;
      let totalAssistantChars = 0;
      let interviewCount = 0;
      let totalDurationMs = 0;

      for (const [, msgs] of interviewMessages) {
        const phaseMsgs = msgs.filter((m) => m.phase === phaseNum);
        if (phaseMsgs.length === 0) continue;

        interviewCount++;
        totalMessages += phaseMsgs.length;

        for (const m of phaseMsgs) {
          if (m.role === "user") {
            totalUserChars += m.content.length;
          } else {
            totalAssistantChars += m.content.length;
          }
        }

        // フェーズの所要時間（最初と最後のメッセージの差）
        if (phaseMsgs.length >= 2) {
          const start = new Date(phaseMsgs[0].created_at).getTime();
          const end = new Date(phaseMsgs[phaseMsgs.length - 1].created_at).getTime();
          totalDurationMs += end - start;
        }
      }

      return {
        phase: phaseNum,
        name,
        avg_messages: interviewCount > 0 ? Math.round((totalMessages / interviewCount) * 10) / 10 : 0,
        avg_user_chars: interviewCount > 0 ? Math.round(totalUserChars / interviewCount) : 0,
        avg_assistant_chars: interviewCount > 0 ? Math.round(totalAssistantChars / interviewCount) : 0,
        avg_duration_minutes: interviewCount > 0 ? Math.round(totalDurationMs / interviewCount / 60000 * 10) / 10 : 0,
        sample_size: interviewCount,
      };
    });

    // 全体統計
    let totalMsgsSum = 0;
    let totalDurationSum = 0;
    for (const [, msgs] of interviewMessages) {
      totalMsgsSum += msgs.length;
      if (msgs.length >= 2) {
        const start = new Date(msgs[0].created_at).getTime();
        const end = new Date(msgs[msgs.length - 1].created_at).getTime();
        totalDurationSum += end - start;
      }
    }

    const n = interviewMessages.size;

    // インタビューごとの概要
    const { data: shopsData } = await supabase
      .from("shops")
      .select("id, name")
      .in("id", completedInterviews.map((i) => i.shop_id));
    const shopNameMap = new Map(
      ((shopsData ?? []) as { id: string; name: string }[]).map((s) => [s.id, s.name])
    );

    const interviewSummaries = completedInterviews.map((iv) => {
      const msgs = interviewMessages.get(iv.id) ?? [];
      const userMsgs = msgs.filter((m) => m.role === "user");
      return {
        id: iv.id,
        shop_name: shopNameMap.get(iv.shop_id) ?? "不明",
        total_messages: msgs.length,
        user_messages: userMsgs.length,
        total_user_chars: userMsgs.reduce((s, m) => s + m.content.length, 0),
        created_at: iv.created_at,
        completed_at: iv.completed_at,
      };
    });

    return NextResponse.json({
      total_completed: n,
      phase_stats: phaseStats,
      avg_total_messages: n > 0 ? Math.round((totalMsgsSum / n) * 10) / 10 : 0,
      avg_duration_minutes: n > 0 ? Math.round(totalDurationSum / n / 60000 * 10) / 10 : 0,
      interviews: interviewSummaries,
    });
  } catch (error) {
    console.error("Interview analysis error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
