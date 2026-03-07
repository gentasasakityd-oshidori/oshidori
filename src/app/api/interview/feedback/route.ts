import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { interview_id, shop_id, process_satisfaction, self_discovery, motivation_boost, free_comment } =
      await request.json();

    if (!interview_id || !shop_id) {
      return NextResponse.json(
        { error: "interview_id and shop_id are required" },
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
      .from("interview_experience_feedback")
      .insert({
        interview_id,
        shop_id,
        process_satisfaction: process_satisfaction ?? null,
        self_discovery: self_discovery ?? null,
        motivation_boost: motivation_boost ?? null,
        free_comment: free_comment ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("Feedback save error:", error);
      return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
    }

    return NextResponse.json({ feedback: data });
  } catch (error) {
    console.error("Interview feedback error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
