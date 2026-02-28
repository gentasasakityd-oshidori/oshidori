import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { storyId } = await params;
    const supabase = await createServerSupabaseClient();

    // Get all empathy taps for this story
    const { data: counts } = await supabase
      .from("empathy_taps")
      .select("tag_type")
      .eq("story_id", storyId);

    const tagCounts: Record<string, number> = {};
    for (const row of (counts as { tag_type: string }[]) ?? []) {
      tagCounts[row.tag_type] = (tagCounts[row.tag_type] ?? 0) + 1;
    }

    // Check if user is authenticated and get their taps
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let userTappedTags: string[] = [];
    if (user) {
      const { data: userTaps } = await supabase
        .from("empathy_taps")
        .select("tag_type")
        .eq("story_id", storyId)
        .eq("user_id", user.id);

      userTappedTags = (userTaps as { tag_type: string }[] | null)?.map(
        (t) => t.tag_type
      ) ?? [];
    }

    return NextResponse.json({
      tag_counts: tagCounts,
      total: (counts as unknown[] | null)?.length ?? 0,
      user_tapped_tags: userTappedTags,
    });
  } catch (error) {
    console.error("Empathy get error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
