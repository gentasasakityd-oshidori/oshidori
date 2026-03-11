import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// レート制限用の簡易キャッシュ（IP + タイムスタンプ）
export const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1分
const RATE_LIMIT_MAX = 3; // 1分間に最大3件

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  // 期限切れのタイムスタンプを除去
  const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
  if (valid.length >= RATE_LIMIT_MAX) {
    return false; // レート制限に引っかかった
  }
  valid.push(now);
  rateLimitMap.set(ip, valid);
  return true;
}

export async function POST(request: Request) {
  try {
    // レート制限チェック
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "送信回数の上限に達しました。しばらくしてから再度お試しください。" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { name, email, inquiry_type, message, _hp_field, _form_time } = body;

    // ハニーポット: ボットが自動入力する隠しフィールド
    if (_hp_field) {
      // ボットと判定。成功レスポンスを返してボットを欺く
      return NextResponse.json({ success: true });
    }

    // フォーム送信時間チェック（3秒未満は疑わしい）
    if (_form_time && Date.now() - _form_time < 3000) {
      return NextResponse.json({ success: true }); // ボット対策
    }

    // バリデーション
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "お名前を入力してください" }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ error: "メールアドレスを入力してください" }, { status: 400 });
    }
    // 簡易メールフォーマットチェック
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "正しいメールアドレスを入力してください" }, { status: 400 });
    }
    if (!message || !message.trim()) {
      return NextResponse.json({ error: "お問い合わせ内容を入力してください" }, { status: 400 });
    }
    if (message.trim().length < 10) {
      return NextResponse.json({ error: "お問い合わせ内容は10文字以上で入力してください" }, { status: 400 });
    }

    // URL大量挿入の検出（スパムの特徴）
    const urlCount = (message.match(/https?:\/\//g) || []).length;
    if (urlCount > 3) {
      return NextResponse.json({ success: true }); // ボット対策
    }

    const supabase = await createServerSupabaseClient();

    // ログイン中のユーザーIDを取得（任意）
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // DBに保存
    const { error: dbError } = await db.from("contact_inquiries").insert({
      name: name.trim(),
      email: email.trim(),
      inquiry_type: inquiry_type || "general",
      message: message.trim(),
      user_id: user?.id || null,
    });

    if (dbError) {
      console.error("Contact inquiry insert error:", dbError);
      return NextResponse.json(
        { error: "送信に失敗しました" },
        { status: 500 }
      );
    }

    // メール通知（Resend が設定されている場合）
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
          from: "オシドリ <noreply@oshidori.vercel.app>",
          to: "genta.sasaki.tyd@gmail.com",
          subject: `【オシドリ】お問い合わせ: ${inquiry_type === "shop" ? "店舗側" : inquiry_type === "bug" ? "不具合報告" : "一般"}`,
          text: [
            `お名前: ${name}`,
            `メール: ${email}`,
            `種別: ${inquiry_type || "general"}`,
            `ユーザーID: ${user?.id || "未ログイン"}`,
            "",
            "--- お問い合わせ内容 ---",
            message,
            "",
            `送信日時: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
          ].join("\n"),
        });
      } catch (emailErr) {
        // メール送信失敗してもDB保存は成功しているので続行
        console.error("Email notification error:", emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
