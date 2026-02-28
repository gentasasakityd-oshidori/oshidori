import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/ai/client";
import { buildInterviewSystemPrompt } from "@/lib/prompts";
import type { Shop } from "@/types/database";

export async function POST(request: Request) {
  try {
    const { shop_id } = await request.json();
    if (!shop_id) {
      return NextResponse.json({ error: "shop_id is required" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // 店舗情報を取得
    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("*")
      .eq("id", shop_id)
      .single();

    if (shopError || !shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const typedShop = shop as Shop;

    // ai_interviews に新規レコード作成
    const { data: interview, error: interviewError } = await supabase
      .from("ai_interviews")
      .insert({
        shop_id,
        status: "in_progress",
        current_phase: 1,
        transcript: [],
        engagement_context: {
          owner_name: typedShop.owner_name,
          shop_name: typedShop.name,
          category: typedShop.category,
          key_quotes: [],
          emotion_tags: [],
          covered_topics: [],
        },
      } as never)
      .select()
      .single();

    if (interviewError || !interview) {
      return NextResponse.json(
        { error: "Failed to create interview" },
        { status: 500 }
      );
    }

    const interviewData = interview as { id: string };

    // システムプロンプトを構築
    const systemPrompt = buildInterviewSystemPrompt({
      ownerName: typedShop.owner_name,
      shopName: typedShop.name,
      category: typedShop.category,
    });

    // OpenAI で最初の挨拶メッセージを生成
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.8,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: "インタビューを開始してください。最初の挨拶と、ウォームアップの質問をお願いします。",
        },
      ],
    });

    const aiContent = completion.choices[0]?.message?.content ?? "";

    // JSONパース（メタデータ抽出）
    let displayMessage = aiContent;
    try {
      const parsed = JSON.parse(aiContent);
      if (parsed.message) {
        displayMessage = parsed.message;
      }
    } catch {
      // JSONパースに失敗した場合はそのままテキストとして使用
    }

    // interview_messages に保存
    await supabase.from("interview_messages").insert({
      interview_id: interviewData.id,
      role: "assistant",
      content: displayMessage,
      phase: 1,
      metadata: { phase: "warmup" },
    } as never);

    return NextResponse.json({
      interview_id: interviewData.id,
      message: {
        role: "assistant",
        content: displayMessage,
      },
    });
  } catch (error) {
    console.error("Interview start error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
