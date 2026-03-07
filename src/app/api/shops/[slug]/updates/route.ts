import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// 店舗の近況更新を取得（消費者向け）
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = await createServerSupabaseClient();

    // slug から shop_id を取得
    const { data: shopData } = await supabase
      .from("shops")
      .select("id")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (!shopData) {
      return NextResponse.json({ updates: [] });
    }

    const shopId = (shopData as { id: string }).id;

    const db = supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (k: string, v: string) => {
            order: (k: string, o: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: unknown[]; error: unknown }>;
            };
          };
        };
      };
    };

    const { data, error } = await db
      .from("shop_updates")
      .select("id, content, update_type, created_at")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Shop updates fetch error:", error);
      return NextResponse.json({ updates: [] });
    }

    return NextResponse.json({ updates: data ?? [] });
  } catch (error) {
    console.error("Shop updates error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
