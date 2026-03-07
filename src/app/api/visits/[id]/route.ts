import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// PATCH: 来店記録を更新
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // 所有確認
    const { data: existing } = await supabase
      .from("visit_records")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (!existing || (existing as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};
    if (body.mood_tag !== undefined) updateData.mood_tag = body.mood_tag;
    if (body.memo !== undefined) updateData.memo = typeof body.memo === "string" ? body.memo.slice(0, 500) : null;
    if (body.photo_url !== undefined) updateData.photo_url = body.photo_url;
    if (typeof body.is_public === "boolean") updateData.is_public = body.is_public;

    const { data, error } = await supabase
      .from("visit_records")
      .update(updateData as never)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Visit record update error:", error);
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json({ visit: data });
  } catch (error) {
    console.error("Visit record update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: 来店記録を削除
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // 所有確認
    const { data: existing } = await supabase
      .from("visit_records")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (!existing || (existing as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    const { error } = await supabase
      .from("visit_records")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Visit record delete error:", error);
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Visit record delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
