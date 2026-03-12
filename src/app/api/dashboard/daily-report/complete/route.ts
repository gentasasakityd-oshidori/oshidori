import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** POST: 日報会話から投稿コンテンツを生成・保存 */
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
    const { messages, shop_id, shop_name } = body;

    if (!messages || !shop_id) {
      return NextResponse.json({ error: "パラメータが不足しています" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // 会話内容からコンテンツを生成
    const systemPrompt = `飲食店「${shop_name}」のオーナーとの日報会話から、以下のJSON形式でコンテンツを生成してください。

必ずJSON形式で返してください（マークダウンのコードブロックは不要）:

{
  "update": {
    "content": "近況更新テキスト（280文字以内、温かみのある文体で。お店の雰囲気や想いが伝わるように）",
    "should_post": true
  },
  "supply_flash": {
    "item_name": "食材名や限定メニュー名（60文字以内）",
    "description": "詳細説明（280文字以内、食欲をそそる表現で）",
    "supply_type": "limited|seasonal|special|restock",
    "should_post": true/false（該当する話題がなければfalse）
  },
  "sns": {
    "instagram": "Instagram向け投稿文（ハッシュタグ5個以内含む、280文字以内。ビジュアル重視の表現で）",
    "x": "X(Twitter)向け投稿文（140文字以内。簡潔で目を引く表現）",
    "facebook": "Facebook向け投稿文（400文字以内。丁寧な文体で、お店の想いやこだわりを伝える長めの文章）"
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      max_tokens: 1000,
      temperature: 0.5,
      response_format: { type: "json_object" },
    });

    const rawContent = response.choices[0]?.message?.content || "{}";
    let generated;
    try {
      generated = JSON.parse(rawContent);
    } catch {
      return NextResponse.json({ error: "AIレスポンスの解析に失敗しました" }, { status: 500 });
    }

    const results = {
      update_posted: false,
      flash_posted: false,
      update_content: generated.update?.content || null,
      flash_item: generated.supply_flash?.item_name || null,
      sns_instagram: generated.sns?.instagram || null,
      sns_x: generated.sns?.x || null,
      sns_facebook: generated.sns?.facebook || null,
    };

    // 近況更新を保存
    if (generated.update?.should_post && generated.update.content) {
      const { error } = await db.from("shop_updates").insert({
        shop_id,
        content: generated.update.content,
        update_type: "text",
      });
      if (!error) results.update_posted = true;
    }

    // 在庫速報を保存
    if (generated.supply_flash?.should_post && generated.supply_flash.item_name) {
      const expires = new Date();
      expires.setHours(expires.getHours() + 24);

      const { error } = await db.from("supply_flash_posts").insert({
        shop_id,
        title: generated.supply_flash.item_name,
        description: generated.supply_flash.description || null,
        supply_type: generated.supply_flash.supply_type || "special",
        expires_at: expires.toISOString(),
        is_active: true,
      });
      if (!error) results.flash_posted = true;
    }

    return NextResponse.json({
      success: true,
      generated,
      results,
    });
  } catch (error) {
    console.error("Daily report complete error:", error);
    return NextResponse.json({ error: "コンテンツ生成に失敗しました" }, { status: 500 });
  }
}
