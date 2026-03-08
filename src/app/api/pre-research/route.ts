/**
 * 事前調査エージェント API
 * POST /api/pre-research — 店舗の公開情報を調査してレポートを生成
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createChatCompletion } from "@/lib/ai/client";
import { buildPreResearchPrompt } from "@/lib/prompts/pre-research";
import { logApiUsage } from "@/lib/ai/usage-logger";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // 認証確認
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { shopId } = body;

    if (!shopId) {
      return NextResponse.json({ error: "shopId is required" }, { status: 400 });
    }

    // 店舗情報を取得
    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("name, category, area, tabelog_url, gmb_url, website_url")
      .eq("id", shopId)
      .single();

    if (shopError || !shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const shopData = shop as {
      name: string; category: string; area: string;
      tabelog_url: string | null; gmb_url: string | null; website_url: string | null;
    };

    // 事前調査レポートを作成（ステータス: in_progress）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { data: report, error: insertError } = await db
      .from("pre_research_reports")
      .insert({
        shop_id: shopId,
        research_status: "in_progress",
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
    }

    // プロンプト構築
    const prompt = buildPreResearchPrompt({
      shopName: shopData.name,
      category: shopData.category,
      area: shopData.area,
      existingData: {
        tabelogUrl: shopData.tabelog_url ?? undefined,
        gmbUrl: shopData.gmb_url ?? undefined,
        websiteUrl: shopData.website_url ?? undefined,
      },
    });

    // AI呼び出し
    const result = await createChatCompletion({
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: `${shopData.name}（${shopData.area}の${shopData.category}）の事前調査を実施してください。
公開情報から得られる範囲で、店主の人柄・こだわり・エピソードの仮説を生成してください。`,
        },
      ],
      purpose: "generation",
      temperature: 0.5,
    });

    logApiUsage({
      endpoint: "pre-research",
      model: result.model,
      promptTokens: result.usage.prompt_tokens,
      completionTokens: result.usage.completion_tokens,
      totalTokens: result.usage.total_tokens,
      shopId,
    });

    // レスポンスをパース
    let researchData;
    try {
      const jsonMatch = result.content.match(/```json\n?([\s\S]*?)\n?```/);
      researchData = JSON.parse(jsonMatch ? jsonMatch[1] : result.content);
    } catch {
      // JSONパースに失敗した場合はテキストとして保存
      researchData = { raw_response: result.content };
    }

    // レポートを更新
    await db
      .from("pre_research_reports")
      .update({
        personality_hypothesis: researchData.personality_hypothesis ?? [],
        kodawari_hypothesis: researchData.kodawari_hypothesis ?? [],
        episode_hypothesis: researchData.episode_hypothesis ?? [],
        research_status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", (report as { id: string }).id);

    return NextResponse.json({
      reportId: (report as { id: string }).id,
      data: researchData,
    });
  } catch (error) {
    console.error("Pre-research error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
