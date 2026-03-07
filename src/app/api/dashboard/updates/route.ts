import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getMyShopId } from "@/lib/queries/my-shop";

// 店主の近況更新一覧を取得
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const shopId = await getMyShopId(supabase, user.id);
    if (!shopId) {
      return NextResponse.json({ updates: [] });
    }

    const db = supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (k: string, v: string) => {
            order: (k: string, o: { ascending: boolean }) => Promise<{ data: unknown[]; error: unknown }>;
          };
        };
      };
    };

    const { data, error } = await db
      .from("shop_updates")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Updates fetch error:", error);
      return NextResponse.json({ updates: [] });
    }

    return NextResponse.json({ updates: data ?? [] });
  } catch (error) {
    console.error("Updates error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 店主が近況更新を投稿
export async function POST(request: Request) {
  try {
    const { content } = await request.json();

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    if (content.length > 280) {
      return NextResponse.json(
        { error: "content must be 280 characters or less" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const shopId = await getMyShopId(supabase, user.id);
    if (!shopId) {
      return NextResponse.json(
        { error: "Shop not found" },
        { status: 404 }
      );
    }

    const db = supabase as unknown as {
      from: (t: string) => {
        insert: (r: unknown) => {
          select: () => { single: () => Promise<{ data: unknown; error: unknown }> };
        };
      };
    };

    const { data, error } = await db
      .from("shop_updates")
      .insert({
        shop_id: shopId,
        content: content.trim(),
        update_type: "text",
      })
      .select()
      .single();

    if (error) {
      console.error("Update insert error:", error);
      return NextResponse.json(
        { error: "Failed to create update" },
        { status: 500 }
      );
    }

    return NextResponse.json({ update: data });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 店主が近況更新を削除
export async function DELETE(request: Request) {
  try {
    const { update_id } = await request.json();

    if (!update_id) {
      return NextResponse.json(
        { error: "update_id is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const shopId = await getMyShopId(supabase, user.id);
    if (!shopId) {
      return NextResponse.json(
        { error: "Shop not found" },
        { status: 404 }
      );
    }

    const db = supabase as unknown as {
      from: (t: string) => {
        delete: () => {
          eq: (k: string, v: string) => {
            eq: (k2: string, v2: string) => Promise<{ error: unknown }>;
          };
        };
      };
    };

    const { error } = await db
      .from("shop_updates")
      .delete()
      .eq("id", update_id)
      .eq("shop_id", shopId);

    if (error) {
      console.error("Update delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete update" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
