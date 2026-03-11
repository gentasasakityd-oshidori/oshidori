import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 認証必須のパス
const PROTECTED_PATHS = ["/dashboard", "/mypage", "/onboarding", "/admin"];

// 権限が必要なパス
const ROLE_REQUIRED_PATHS: { prefix: string; roles: string[] }[] = [
  { prefix: "/dashboard", roles: ["shop_owner", "admin"] },
  { prefix: "/admin", roles: ["admin"] },
];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Skip Supabase session if env vars are not configured (demo mode)
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // 認証必須パスに未ログインでアクセスした場合 → ログインへ
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // 権限チェック（ログイン済みユーザーのみ）
  if (user) {
    const roleCheck = ROLE_REQUIRED_PATHS.find((r) =>
      pathname.startsWith(r.prefix)
    );

    if (roleCheck) {
      // usersテーブルからroleを取得
      const { data: profile } = await supabase
        .from("users")
        .select("role, is_admin")
        .eq("id", user.id)
        .single();

      const userRole =
        (profile as { role: string; is_admin: boolean } | null)?.role ||
        "consumer";
      const isAdmin =
        (profile as { role: string; is_admin: boolean } | null)?.is_admin ||
        false;

      // admin権限チェック: roleがadminまたはis_adminがtrueの場合はadmin扱い
      const effectiveRole = isAdmin ? "admin" : userRole;

      if (!roleCheck.roles.includes(effectiveRole)) {
        const url = request.nextUrl.clone();
        url.pathname = "/unauthorized";
        return NextResponse.redirect(url);
      }
    }
  }

  // ログイン済みで /login にアクセスした場合 → トップへ
  if (pathname === "/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // セキュリティヘッダーの追加
  supabaseResponse.headers.set("X-Frame-Options", "DENY");
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
  supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  supabaseResponse.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(self), geolocation=(self)"
  );

  return supabaseResponse;
}
