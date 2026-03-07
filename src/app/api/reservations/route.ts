import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// 消費者が予約打診を送信
export async function POST(request: Request) {
  try {
    const { shop_id, preferred_date, preferred_time, party_size, message } =
      await request.json();

    if (!shop_id || !preferred_date || !preferred_time || !party_size) {
      return NextResponse.json(
        { error: "shop_id, preferred_date, preferred_time, party_size are required" },
        { status: 400 }
      );
    }

    if (party_size < 1 || party_size > 20) {
      return NextResponse.json(
        { error: "party_size must be between 1 and 20" },
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

    const db = supabase as unknown as {
      from: (t: string) => {
        insert: (r: unknown) => { select: () => { single: () => Promise<{ data: unknown; error: unknown }> } };
      };
    };

    const { data, error } = await db
      .from("reservation_inquiries")
      .insert({
        shop_id,
        user_id: user.id,
        preferred_date,
        preferred_time,
        party_size: Number(party_size),
        message: message && typeof message === "string" ? message.slice(0, 500) : null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Reservation insert error:", error);
      return NextResponse.json(
        { error: "Failed to create reservation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ reservation: data });
  } catch (error) {
    console.error("Reservation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 消費者が自分の予約打診一覧を取得
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
      .from("reservation_inquiries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Reservations fetch error:", error);
      return NextResponse.json({ reservations: [] });
    }

    return NextResponse.json({ reservations: data ?? [] });
  } catch (error) {
    console.error("Reservations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
