/**
 * 日々のコンテンツ生成 API（ピボット対応 レイヤー2）
 * POST /api/content-generation — マイクロ入力からSNS投稿文等を生成
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createChatCompletion } from "@/lib/ai/client";
import { buildContentGenerationPrompt } from "@/lib/prompts/content-generation";
import type { ContentGenerationContext } from "@/lib/prompts/content-generation";
import { logApiUsage } from "@/lib/ai/usage-logger";
import { saveContentEmbedding } from "@/lib/ai/vector-search";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { shopId, contentType, inputSource, inputContent } = body;

    if (!shopId || !contentType || !inputContent) {
      return NextResponse.json(
        { error: "shopId, contentType, and inputContent are required" },
        { status: 400 },
      );
    }

    // 店舗情報取得
    const { data: shop } = await supabase
      .from("shops")
      .select("name, owner_name, category, area")
      .eq("id", shopId)
      .single();

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const shopData = shop as {
      name: string; owner_name: string; category: string; area: string;
    };

    // 動的コンテキストを構築
    const context: ContentGenerationContext = {
      situation: {
        contentType,
        inputSource: inputSource ?? "text_memo",
        inputContent,
        season: getCurrentSeason(),
      },
    };

    // 過去の反応が良かったコンテンツを取得
    const { data: topContents } = await supabase
      .from("generated_contents")
      .select("content_body, sns_engagement, checkin_lift_7d")
      .eq("shop_id", shopId)
      .in("approval_status", ["approved", "edited"])
      .order("checkin_lift_7d", { ascending: false })
      .limit(3);

    if (topContents && topContents.length > 0) {
      const contents = topContents as Array<{
        content_body: string;
        sns_engagement: Record<string, number>;
        checkin_lift_7d: number;
      }>;
      context.recentPerformance = {
        topPosts: contents.map((c) => ({
          content: c.content_body,
          engagement: Object.values(c.sns_engagement).reduce((a, b) => a + b, 0),
        })),
        checkinCorrelation: "（集計中）",
      };
    }

    // プロンプト構築
    const prompt = buildContentGenerationPrompt(
      shopData.name,
      shopData.owner_name,
      shopData.category,
      context,
    );

    // AI呼び出し
    const result = await createChatCompletion({
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: `以下の素材からコンテンツを生成してください:\n\n${inputContent}`,
        },
      ],
      purpose: "generation",
      temperature: 0.7,
    });

    logApiUsage({
      endpoint: "content-generation",
      model: result.model,
      promptTokens: result.usage.prompt_tokens,
      completionTokens: result.usage.completion_tokens,
      totalTokens: result.usage.total_tokens,
      shopId,
    });

    // レスポンスをパース
    let contentData;
    try {
      const jsonMatch = result.content.match(/```json\n?([\s\S]*?)\n?```/);
      contentData = JSON.parse(jsonMatch ? jsonMatch[1] : result.content);
    } catch {
      contentData = {
        content_type: contentType,
        content_body: result.content,
      };
    }

    // DB保存
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { data: savedContent, error: insertError } = await db
      .from("generated_contents")
      .insert({
        shop_id: shopId,
        content_type: contentType,
        content_body: contentData.content_body ?? result.content,
        situation_context: {
          source: inputSource,
          trigger: "manual",
          season: getCurrentSeason(),
        },
        approval_status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json({ error: "Failed to save content" }, { status: 500 });
    }

    // ベクトル埋め込みを非同期で保存（エラーは無視）
    const contentId = (savedContent as { id: string }).id;
    saveContentEmbedding(
      supabase,
      contentId,
      contentData.content_body ?? result.content,
    ).catch(() => {/* ベクトル保存失敗は無視 */});

    return NextResponse.json({
      contentId,
      data: contentData,
    });
  } catch (error) {
    console.error("Content generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return "春";
  if (month >= 6 && month <= 8) return "夏";
  if (month >= 9 && month <= 11) return "秋";
  return "冬";
}
