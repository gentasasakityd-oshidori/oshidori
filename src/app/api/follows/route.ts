import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// user_followsテーブルは014マイグレーションで作成。
// Supabase型定義に未登録のため、rpcまたはany型で操作する。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

/** GET: 自分のフォロー一覧 / 特定ユーザーのフォロー状態確認 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient() as AnySupabase;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const targetUserId = req.nextUrl.searchParams.get("user_id");

    if (targetUserId) {
      const { data } = await supabase
        .from("user_follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .limit(1);
      return NextResponse.json({ isFollowing: (data?.length ?? 0) > 0 });
    }

    const { data: following } = await supabase
      .from("user_follows")
      .select("following_id, created_at")
      .eq("follower_id", user.id)
      .order("created_at", { ascending: false });

    const { data: followers } = await supabase
      .from("user_follows")
      .select("follower_id, created_at")
      .eq("following_id", user.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      following: following ?? [],
      followers: followers ?? [],
      followingCount: following?.length ?? 0,
      followersCount: followers?.length ?? 0,
    });
  } catch (error) {
    console.error("Follows GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST: フォロー/アンフォロー */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient() as AnySupabase;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { user_id, action } = body as { user_id?: string; action?: "follow" | "unfollow" };

    if (!user_id || !action) {
      return NextResponse.json({ error: "user_id and action are required" }, { status: 400 });
    }

    if (user_id === user.id) {
      return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
    }

    if (action === "follow") {
      const { error } = await supabase
        .from("user_follows")
        .upsert({ follower_id: user.id, following_id: user_id }, { onConflict: "follower_id,following_id" });
      if (error) throw error;
      return NextResponse.json({ success: true, action: "followed" });
    } else {
      const { error } = await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", user_id);
      if (error) throw error;
      return NextResponse.json({ success: true, action: "unfollowed" });
    }
  } catch (error) {
    console.error("Follows POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
