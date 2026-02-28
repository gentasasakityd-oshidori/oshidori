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

    // 全ログ取得（直近30日分）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: logs } = await supabase
      .from("api_usage_logs")
      .select("*")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    type LogRow = {
      id: string;
      endpoint: string;
      model: string;
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
      estimated_cost_usd: number;
      shop_id: string | null;
      interview_id: string | null;
      created_at: string;
    };

    const allLogs = (logs as LogRow[] | null) ?? [];

    // --- 集計 ---

    // 総コスト
    const totalCostUsd = allLogs.reduce(
      (sum, l) => sum + Number(l.estimated_cost_usd),
      0
    );
    const totalTokens = allLogs.reduce((sum, l) => sum + l.total_tokens, 0);
    const totalCalls = allLogs.length;

    // 今日のコスト
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayLogs = allLogs.filter(
      (l) => l.created_at.slice(0, 10) === todayStr
    );
    const todayCostUsd = todayLogs.reduce(
      (sum, l) => sum + Number(l.estimated_cost_usd),
      0
    );

    // 日別コスト推移
    const dailyMap = new Map<string, { cost: number; tokens: number; calls: number }>();
    for (const l of allLogs) {
      const date = l.created_at.slice(0, 10);
      const existing = dailyMap.get(date) ?? { cost: 0, tokens: 0, calls: 0 };
      existing.cost += Number(l.estimated_cost_usd);
      existing.tokens += l.total_tokens;
      existing.calls += 1;
      dailyMap.set(date, existing);
    }
    const dailyCosts = [...dailyMap.entries()]
      .map(([date, v]) => ({
        date,
        cost_usd: Math.round(v.cost * 1000000) / 1000000,
        cost_jpy: Math.round(v.cost * 150),
        tokens: v.tokens,
        calls: v.calls,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // エンドポイント別コスト
    const endpointMap = new Map<string, { cost: number; tokens: number; calls: number }>();
    for (const l of allLogs) {
      const existing = endpointMap.get(l.endpoint) ?? { cost: 0, tokens: 0, calls: 0 };
      existing.cost += Number(l.estimated_cost_usd);
      existing.tokens += l.total_tokens;
      existing.calls += 1;
      endpointMap.set(l.endpoint, existing);
    }
    const endpointCosts = [...endpointMap.entries()]
      .map(([endpoint, v]) => ({
        endpoint,
        cost_usd: Math.round(v.cost * 1000000) / 1000000,
        cost_jpy: Math.round(v.cost * 150),
        tokens: v.tokens,
        calls: v.calls,
      }))
      .sort((a, b) => b.cost_usd - a.cost_usd);

    // インタビュー単位のコスト
    const interviewMap = new Map<string, { cost: number; tokens: number; calls: number }>();
    for (const l of allLogs) {
      if (!l.interview_id) continue;
      const existing = interviewMap.get(l.interview_id) ?? { cost: 0, tokens: 0, calls: 0 };
      existing.cost += Number(l.estimated_cost_usd);
      existing.tokens += l.total_tokens;
      existing.calls += 1;
      interviewMap.set(l.interview_id, existing);
    }
    const interviewCosts = [...interviewMap.entries()].map(([id, v]) => ({
      interview_id: id,
      cost_usd: Math.round(v.cost * 1000000) / 1000000,
      cost_jpy: Math.round(v.cost * 150),
      tokens: v.tokens,
      calls: v.calls,
    }));

    // 1インタビューあたり平均コスト
    const avgCostPerInterview =
      interviewCosts.length > 0
        ? interviewCosts.reduce((sum, i) => sum + i.cost_usd, 0) / interviewCosts.length
        : 0;

    // USD → JPY 概算（1USD=150JPY）
    const JPY_RATE = 150;

    return NextResponse.json({
      summary: {
        total_cost_usd: Math.round(totalCostUsd * 1000000) / 1000000,
        total_cost_jpy: Math.round(totalCostUsd * JPY_RATE),
        today_cost_usd: Math.round(todayCostUsd * 1000000) / 1000000,
        today_cost_jpy: Math.round(todayCostUsd * JPY_RATE),
        total_tokens: totalTokens,
        total_calls: totalCalls,
        avg_cost_per_interview_usd:
          Math.round(avgCostPerInterview * 1000000) / 1000000,
        avg_cost_per_interview_jpy: Math.round(avgCostPerInterview * JPY_RATE),
        interview_count: interviewCosts.length,
      },
      daily_costs: dailyCosts,
      endpoint_costs: endpointCosts,
      interview_costs: interviewCosts.sort((a, b) => b.cost_usd - a.cost_usd).slice(0, 20),
    });
  } catch (error) {
    console.error("AI costs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
