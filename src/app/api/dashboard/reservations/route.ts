import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getMyShopId } from "@/lib/queries/my-shop";

// 店主が予約打診一覧を取得
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    const shopId = await getMyShopId(supabase, user.id);
    if (!shopId) {
      return NextResponse.json({ reservations: [], total: 0 });
    }

    const db = supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (k: string, v: string) => {
            eq: (k2: string, v2: string) => {
              order: (k: string, o: { ascending: boolean }) => Promise<{ data: unknown[]; error: unknown }>;
            };
            order: (k: string, o: { ascending: boolean }) => Promise<{ data: unknown[]; error: unknown }>;
          };
        };
      };
    };

    let query;
    if (statusFilter) {
      query = db
        .from("reservation_inquiries")
        .select("*")
        .eq("shop_id", shopId)
        .eq("status", statusFilter)
        .order("created_at", { ascending: false });
    } else {
      query = db
        .from("reservation_inquiries")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error("Dashboard reservations fetch error:", error);
      return NextResponse.json({ reservations: [], total: 0 });
    }

    const reservations = (data ?? []) as { user_id: string }[];

    // ユーザー情報を取得
    const userIds = [...new Set(reservations.map((r) => r.user_id))];
    const enriched = await Promise.all(
      reservations.map(async (r) => {
        const { data: userData } = await supabase
          .from("users")
          .select("nickname")
          .eq("id", r.user_id)
          .single();
        return {
          ...r,
          user_nickname: (userData as { nickname: string } | null)?.nickname ?? "ゲスト",
        };
      })
    );

    return NextResponse.json({
      reservations: enriched,
      total: enriched.length,
      userIds,
    });
  } catch (error) {
    console.error("Dashboard reservations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 店主が予約打診に返答
export async function PATCH(request: Request) {
  try {
    const { reservation_id, status, shop_response, alternative_date, alternative_time } =
      await request.json();

    if (!reservation_id || !status) {
      return NextResponse.json(
        { error: "reservation_id and status are required" },
        { status: 400 }
      );
    }

    if (!["accepted", "declined", "alternative_proposed"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
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

    const updateData: Record<string, unknown> = {
      status,
      responded_at: new Date().toISOString(),
    };

    if (shop_response && typeof shop_response === "string") {
      updateData.shop_response = shop_response.slice(0, 500);
    }
    if (status === "alternative_proposed") {
      if (alternative_date) updateData.alternative_date = alternative_date;
      if (alternative_time) updateData.alternative_time = alternative_time;
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
        update: (d: unknown) => {
          eq: (k: string, v: string) => {
            eq: (k2: string, v2: string) => {
              select: () => { single: () => Promise<{ data: unknown; error: unknown }> };
            };
          };
        };
      };
    };

    const { data, error } = await db
      .from("reservation_inquiries")
      .update(updateData)
      .eq("id", reservation_id)
      .eq("shop_id", shopId)
      .select()
      .single();

    if (error) {
      console.error("Reservation update error:", error);
      return NextResponse.json(
        { error: "Failed to update reservation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ reservation: data });
  } catch (error) {
    console.error("Reservation update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
