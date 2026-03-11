import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** POST: AI日報会話を開始 */
export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // 店舗情報取得
    const { data: shop } = await db
      .from("shops")
      .select("id, name, category")
      .eq("owner_id", user.id)
      .single();

    if (!shop) {
      return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
    }

    const typedShop = shop as { id: string; name: string; category: string };

    // 初回メッセージ
    const greeting = `こんにちは！${typedShop.name}の日報をお手伝いします。

今日のお店の様子を教えてください。以下のような話題をお聞きしますね：

1. **今日の営業状況** — お客さんの入り具合、特別なこと
2. **おすすめ情報** — 今日の仕入れで良いものが入った、限定メニューなど
3. **お客さんへの一言** — ファンの方に伝えたいこと

まず、今日の営業はいかがでしたか？`;

    return NextResponse.json({
      shop_id: typedShop.id,
      shop_name: typedShop.name,
      messages: [{ role: "assistant", content: greeting }],
    });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
