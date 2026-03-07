import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { OnboardingTutorial } from "@/components/onboarding-tutorial";
import { HashScrollHandler } from "@/components/layout/hash-scroll-handler";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ConsumerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // サーバーサイドでセッション情報を取得（SSRハイドレーションフリッカー防止）
  let initialUser: { id: string; email?: string } | null = null;
  let initialNickname: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      initialUser = { id: user.id, email: user.email };
      const { data } = await supabase
        .from("users")
        .select("nickname")
        .eq("id", user.id)
        .single();
      const d = data as { nickname: string } | null;
      initialNickname = d?.nickname ?? null;
    }
  } catch {
    // 認証情報の取得に失敗しても、ページ表示は続行
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header initialUser={initialUser} initialNickname={initialNickname} />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer />
      <BottomNav />
      <OnboardingTutorial />
      <HashScrollHandler />
    </div>
  );
}
