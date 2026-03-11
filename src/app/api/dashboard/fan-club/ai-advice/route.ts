import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** POST: AIによるファンクラブ運営アドバイス生成 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const body = await request.json();
    const { shop_id } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // 店舗情報
    const { data: shop } = await db
      .from("shops")
      .select("id, name, category, description")
      .eq("id", shop_id)
      .eq("owner_id", user.id)
      .single();

    if (!shop) {
      return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
    }

    const typedShop = shop as { id: string; name: string; category: string; description: string | null };

    // ファンクラブプラン
    const { data: plans } = await db
      .from("fan_club_plans")
      .select("plan_name, price, benefits, description, is_active")
      .eq("shop_id", shop_id);

    // ファン数
    const { count: fanCount } = await db
      .from("oshi_shops")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shop_id);

    // 最近のファンレター数
    const { count: letterCount } = await db
      .from("fan_letters")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shop_id);

    // 最近のメッセージ数
    const { count: messageCount } = await db
      .from("shop_messages")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shop_id);

    const context = {
      shop_name: typedShop.name,
      category: typedShop.category,
      description: typedShop.description,
      fan_count: fanCount ?? 0,
      letter_count: letterCount ?? 0,
      message_count: messageCount ?? 0,
      plans: plans ?? [],
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `あなたは飲食店のファンクラブ運営コンサルタントです。
店舗のデータを分析して、ファンクラブの改善アドバイスを3〜5個提案してください。

JSON形式で以下の構造を返してください:
{
  "summary": "全体的なコメント（1-2文）",
  "advice": [
    {
      "category": "engagement" | "benefit" | "growth",
      "title": "アドバイスの要約",
      "description": "具体的な提案内容（2-3文）",
      "priority": "high" | "medium" | "low"
    }
  ]
}

カテゴリ:
- engagement: ファンとの交流・エンゲージメント向上
- benefit: 特典内容の改善
- growth: 会員数の増加施策

アドバイスは実際のデータに基づいた具体的なものにしてください。`,
        },
        {
          role: "user",
          content: `以下の店舗のファンクラブ運営データを分析してアドバイスをください。

${JSON.stringify(context, null, 2)}`,
        },
      ],
    });

    const result = JSON.parse(completion.choices[0].message.content ?? "{}");

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
