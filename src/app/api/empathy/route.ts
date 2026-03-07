import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EMPATHY_TAGS } from "@/lib/constants";

const VALID_TAG_IDS = new Set<string>(EMPATHY_TAGS.map((t) => t.id));

export async function POST(request: Request) {
  try {
    const { story_id, tag_type, comment } = await request.json();
    if (!story_id || !tag_type) {
      return NextResponse.json(
        { error: "story_id and tag_type are required" },
        { status: 400 }
      );
    }

    // タグIDのバリデーション
    if (typeof tag_type !== "string" || !VALID_TAG_IDS.has(tag_type)) {
      return NextResponse.json(
        { error: "Invalid tag_type" },
        { status: 400 }
      );
    }

    // UUIDフォーマット検証
    if (typeof story_id !== "string" || story_id.length > 50) {
      return NextResponse.json(
        { error: "Invalid story_id" },
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

    // Check if already tapped
    const { data: existing } = await supabase
      .from("empathy_taps")
      .select("id")
      .eq("user_id", user.id)
      .eq("story_id", story_id)
      .eq("tag_type", tag_type)
      .maybeSingle();

    if (existing) {
      // Remove tap (toggle off)
      await supabase
        .from("empathy_taps")
        .delete()
        .eq("id", (existing as { id: string }).id);
    } else {
      // Add tap (toggle on)
      const insertData: Record<string, unknown> = {
        user_id: user.id,
        story_id,
        tag_type,
      };
      if (comment && typeof comment === "string" && comment.length <= 200) {
        insertData.comment = comment;
      }
      await supabase.from("empathy_taps").insert(insertData as never);
    }

    // Return updated counts for this story
    const { data: counts } = await supabase
      .from("empathy_taps")
      .select("tag_type")
      .eq("story_id", story_id);

    const tagCounts: Record<string, number> = {};
    for (const row of (counts as { tag_type: string }[]) ?? []) {
      tagCounts[row.tag_type] = (tagCounts[row.tag_type] ?? 0) + 1;
    }

    // Get user's tapped tags for this story
    const { data: userTaps } = await supabase
      .from("empathy_taps")
      .select("tag_type")
      .eq("story_id", story_id)
      .eq("user_id", user.id);

    const userTappedTags = (userTaps as { tag_type: string }[] | null)?.map(
      (t) => t.tag_type
    ) ?? [];

    return NextResponse.json({
      toggled: !existing,
      tag_counts: tagCounts,
      total: (counts as unknown[] | null)?.length ?? 0,
      user_tapped_tags: userTappedTags,
    });
  } catch (error) {
    console.error("Empathy tap error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
