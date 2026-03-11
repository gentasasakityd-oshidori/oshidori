import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/home";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server Component context
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // パスワードリセットフローの場合はリセットページへ直接遷移
      if (type === "recovery" || next === "/reset-password") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }

      // ニックネーム未設定チェック
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("nickname")
          .eq("id", user.id)
          .single();

        // handle_new_user trigger で作成されたデフォルトニックネームの場合
        if (!profile || profile.nickname === "ユーザー") {
          return NextResponse.redirect(`${origin}/onboarding/nickname`);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // エラー時はログインページへ
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
