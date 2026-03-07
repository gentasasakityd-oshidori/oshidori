import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/** POST: 来店記録用の写真をアップロード */
export async function POST(request: NextRequest) {
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "file is required" },
        { status: 400 }
      );
    }

    // ファイルバリデーション
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 5MB" },
        { status: 400 }
      );
    }

    // ファイル名を生成（ユーザーID/タイムスタンプ_ランダム.拡張子）
    const ext = file.name.split(".").pop() ?? "jpg";
    const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // Supabase Storage にアップロード
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("visit-photos")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Visit photo upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload: " + uploadError.message },
        { status: 500 }
      );
    }

    // 公開URLを取得
    const { data: publicUrl } = supabase.storage
      .from("visit-photos")
      .getPublicUrl(uploadData.path);

    return NextResponse.json({
      url: publicUrl.publicUrl,
      path: uploadData.path,
    });
  } catch (error) {
    console.error("Visit photo upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
