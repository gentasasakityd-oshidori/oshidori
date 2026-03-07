import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getMyShopId, verifyShopOwnership } from "@/lib/queries/my-shop";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/** GET: 店舗の撮影リクエスト一覧 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { data: shop } = await supabase
      .from("shops")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1)
      .single();

    if (!shop) {
      return NextResponse.json({ requests: [], shopId: null });
    }

    const shopId = (shop as { id: string }).id;

    // 最新の撮影リクエストを取得
    const { data: requests } = await supabase
      .from("photo_requests")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      requests: requests ?? [],
      shopId,
    });
  } catch (error) {
    console.error("Dashboard photos GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/** POST: 写真をアップロード */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // 認証チェック
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
    const shopId = formData.get("shop_id") as string | null;
    const shotSubject = formData.get("shot_subject") as string | null;

    if (!file || !shopId) {
      return NextResponse.json(
        { error: "file and shop_id are required" },
        { status: 400 }
      );
    }

    // オーナーシップ検証: shop_id がログインユーザーの所有か
    const isOwner = await verifyShopOwnership(supabase, user.id, shopId);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Forbidden: you do not own this shop" },
        { status: 403 }
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

    // ファイル名を生成
    const ext = file.name.split(".").pop() ?? "jpg";
    const fileName = `${shopId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // Supabase Storage にアップロード
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("shop-photos")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload: " + uploadError.message },
        { status: 500 }
      );
    }

    // 公開URLを取得
    const { data: publicUrl } = supabase.storage
      .from("shop-photos")
      .getPublicUrl(uploadData.path);

    return NextResponse.json({
      url: publicUrl.publicUrl,
      path: uploadData.path,
      subject: shotSubject,
    });
  } catch (error) {
    console.error("Dashboard photos POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
