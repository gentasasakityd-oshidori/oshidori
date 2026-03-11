import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** POST: 日報会話の続き */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const body = await request.json();
    const { messages, shop_name } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "メッセージが必要です" }, { status: 400 });
    }

    const systemPrompt = `あなたは飲食店「${shop_name}」のオーナーから日報を聞き取るAIアシスタントです。

目的: 短い会話（5-10分）で今日の店舗の状況を聞き出し、以下の投稿コンテンツを自動生成するための情報を集めること。

生成するコンテンツ:
1. **近況更新**: お店の今日の様子、雰囲気、特別なエピソード（280文字以内）
2. **在庫速報**: 仕入れた特別な食材や限定メニュー（該当する場合のみ）
3. **SNS投稿テキスト**: Instagram/X向けの簡潔な投稿文

聞き取りのコツ:
- 自然な会話で聞き出す（尋問にならないように）
- 具体的なエピソードや感情を引き出す
- 3-5回のやり取りで完了を目指す
- 十分な情報が集まったら「それでは日報をまとめますね！」と伝えて会話を締める

トーン: フレンドリーで温かく、飲食店オーナーに寄り添う態度で。`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const reply = response.choices[0]?.message?.content || "すみません、もう一度お願いします。";

    // 会話が終了フェーズかチェック
    const isReadyToComplete = reply.includes("まとめます") || reply.includes("日報を作成") || reply.includes("生成します");

    return NextResponse.json({
      reply,
      is_ready_to_complete: isReadyToComplete,
    });
  } catch (error) {
    console.error("Daily report message error:", error);
    return NextResponse.json({ error: "AIとの通信に失敗しました" }, { status: 500 });
  }
}
