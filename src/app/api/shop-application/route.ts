import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notifyShopApplicationReceived, notifyApplicantReceived } from "@/lib/email";

/**
 * GET: 既存のドラフト or 審査中申請を確認
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // ドラフト申請を取得
    const { data: draft } = await db
      .from("shop_role_applications")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "draft")
      .maybeSingle();

    // 審査中申請を確認
    const { data: pending } = await db
      .from("shop_role_applications")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    return NextResponse.json({
      draft: draft || null,
      hasPending: !!pending,
    });
  } catch {
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

/**
 * POST: ステップごとの保存 or 最終送信
 *
 * - step=1: 基本情報を保存（ドラフト作成/更新）
 * - step=2: 所在地・SNS情報を保存（ドラフト更新）
 * - step=3 or stepなし: 最終送信（pending に変更）
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const {
      step,
      shop_name,
      shop_genre,
      shop_area,
      applicant_name,
      applicant_name_sei,
      applicant_name_mei,
      applicant_role,
      message,
      postal_code,
      address_prefecture,
      address_city,
      address_street,
      address_building,
      phone,
      website_url,
      instagram_url,
      tabelog_url,
      gmb_url,
    } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // ======= ステップ1: 基本情報保存 =======
    if (step === 1) {
      // 姓名分割対応: applicant_nameは姓名結合でも送られる（後方互換）
      const nameToSave = applicant_name || (applicant_name_sei && applicant_name_mei
        ? `${applicant_name_sei} ${applicant_name_mei}` : null);

      if (!shop_name || !nameToSave) {
        return NextResponse.json(
          { error: "店名と申請者名は必須です" },
          { status: 400 }
        );
      }

      // 審査中の申請がないか確認
      const { data: pending } = await db
        .from("shop_role_applications")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      if (pending) {
        return NextResponse.json(
          { error: "審査中の申請があります。審査結果をお待ちください。" },
          { status: 409 }
        );
      }

      // 既存ドラフトを確認
      const { data: existing } = await db
        .from("shop_role_applications")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "draft")
        .maybeSingle();

      const step1Data = {
        shop_name,
        shop_genre: shop_genre || null,
        applicant_name: nameToSave,
        applicant_name_sei: applicant_name_sei || null,
        applicant_name_mei: applicant_name_mei || null,
        applicant_role: applicant_role || null,
        message: message || null,
        application_step: 1,
      };

      if (existing) {
        const { error: updateError } = await db
          .from("shop_role_applications")
          .update(step1Data)
          .eq("id", existing.id);

        if (updateError) {
          return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
        }
        return NextResponse.json({ success: true, draft_id: existing.id });
      }

      // 新規ドラフト作成
      const { data: newDraft, error: insertError } = await db
        .from("shop_role_applications")
        .insert({
          user_id: user.id,
          ...step1Data,
          status: "draft",
        })
        .select("id")
        .single();

      if (insertError) {
        return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
      }
      return NextResponse.json({ success: true, draft_id: newDraft.id });
    }

    // ======= ステップ2: 所在地・SNS保存 =======
    if (step === 2) {
      const { data: existing } = await db
        .from("shop_role_applications")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "draft")
        .maybeSingle();

      if (!existing) {
        return NextResponse.json(
          { error: "下書きが見つかりません" },
          { status: 404 }
        );
      }

      const { error: updateError } = await db
        .from("shop_role_applications")
        .update({
          postal_code: postal_code || null,
          address_prefecture: address_prefecture || null,
          address_city: address_city || null,
          address_street: address_street || null,
          address_building: address_building || null,
          phone: phone || null,
          shop_area: address_prefecture || null,
          website_url: website_url || null,
          instagram_url: instagram_url || null,
          tabelog_url: tabelog_url || null,
          gmb_url: gmb_url || null,
          application_step: 2,
        })
        .eq("id", existing.id);

      if (updateError) {
        return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
      }
      return NextResponse.json({ success: true, draft_id: existing.id });
    }

    // ======= ステップ3 or レガシー: 最終送信 =======
    if (step === 3) {
      // ドラフトをpendingに変更
      const { data: existing } = await db
        .from("shop_role_applications")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "draft")
        .maybeSingle();

      if (!existing) {
        return NextResponse.json(
          { error: "下書きが見つかりません" },
          { status: 404 }
        );
      }

      const { error: updateError } = await db
        .from("shop_role_applications")
        .update({
          status: "pending",
          application_step: 3,
        })
        .eq("id", existing.id);

      if (updateError) {
        return NextResponse.json({ error: "送信に失敗しました" }, { status: 500 });
      }

      // ドラフトの全データを取得してメール通知
      const { data: submittedApp } = await db
        .from("shop_role_applications")
        .select("*")
        .eq("id", existing.id)
        .single();

      if (submittedApp && user.email) {
        const sa = submittedApp as { shop_name: string; applicant_name: string; shop_genre?: string };
        // 運営通知（非同期、失敗しても送信成功は返す）
        notifyShopApplicationReceived({
          shopName: sa.shop_name,
          applicantName: sa.applicant_name,
          applicantEmail: user.email,
          category: sa.shop_genre || "未設定",
        }).catch((e) => console.error("申請受付通知エラー:", e));
        // 申請者確認メール
        notifyApplicantReceived(user.email, {
          shopName: sa.shop_name,
          applicantName: sa.applicant_name,
        }).catch((e) => console.error("申請者通知エラー:", e));
      }

      return NextResponse.json({ success: true });
    }

    // ======= レガシー（stepなし）: 一括送信 =======
    const legacyName = applicant_name || (applicant_name_sei && applicant_name_mei
      ? `${applicant_name_sei} ${applicant_name_mei}` : null);

    if (!shop_name || !legacyName) {
      return NextResponse.json(
        { error: "店名と申請者名は必須です" },
        { status: 400 }
      );
    }

    if (!address_prefecture || !address_city || !address_street) {
      return NextResponse.json(
        { error: "都道府県・市区町村・町名番地は必須です" },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        { error: "電話番号は必須です" },
        { status: 400 }
      );
    }

    // 既存の未審査申請がないか確認
    const { data: existing } = await db
      .from("shop_role_applications")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "審査中の申請があります。審査結果をお待ちください。" },
        { status: 409 }
      );
    }

    const { error } = await db.from("shop_role_applications").insert({
      user_id: user.id,
      shop_name,
      shop_genre: shop_genre || null,
      shop_area: shop_area || null,
      applicant_name: legacyName,
      applicant_name_sei: applicant_name_sei || null,
      applicant_name_mei: applicant_name_mei || null,
      applicant_role: applicant_role || null,
      message: message || null,
      postal_code: postal_code || null,
      address_prefecture: address_prefecture || null,
      address_city: address_city || null,
      address_street: address_street || null,
      address_building: address_building || null,
      phone: phone || null,
      website_url: website_url || null,
      instagram_url: instagram_url || null,
      tabelog_url: tabelog_url || null,
      gmb_url: gmb_url || null,
      application_step: 3,
    });

    if (error) {
      console.error("Application insert error:", error);
      return NextResponse.json(
        { error: "申請の送信に失敗しました" },
        { status: 500 }
      );
    }

    // メール通知（非同期、失敗しても送信成功は返す）
    if (user.email) {
      notifyShopApplicationReceived({
        shopName: shop_name,
        applicantName: legacyName,
        applicantEmail: user.email,
        category: shop_genre || "未設定",
      }).catch((e) => console.error("申請受付通知エラー:", e));
      notifyApplicantReceived(user.email, {
        shopName: shop_name,
        applicantName: legacyName,
      }).catch((e) => console.error("申請者通知エラー:", e));
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
