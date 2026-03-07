/**
 * 気分タグ設定API（v6.1 Phase 1）
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { data, error } = await supabase
      .from("consumer_mood_preferences")
      .select("mood_tags")
      .eq("consumer_id", user.id)
      .single();

    if (error) {
      // レコードが存在しない場合は空配列を返す
      return NextResponse.json({ mood_tags: [] });
    }

    return NextResponse.json({
      mood_tags: (data as { mood_tags: string[] }).mood_tags ?? [],
    });
  } catch (error) {
    console.error("Mood preferences GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { mood_tags } = body as { mood_tags: string[] };

    if (!Array.isArray(mood_tags)) {
      return NextResponse.json(
        { error: "mood_tags must be an array" },
        { status: 400 },
      );
    }

    // upsert: 存在すればupdate、なければinsert
    const { error } = await supabase
      .from("consumer_mood_preferences")
      .upsert(
        {
          consumer_id: user.id,
          mood_tags,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "consumer_id" },
      );

    if (error) {
      console.error("Mood preferences upsert error:", error);
      return NextResponse.json(
        { error: "Failed to update mood preferences" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, mood_tags });
  } catch (error) {
    console.error("Mood preferences PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
