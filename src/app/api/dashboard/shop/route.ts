import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getMyShopId, verifyShopOwnership } from "@/lib/queries/my-shop";

/** Service Role クライアント（RLSバイパス用） */
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// ────────────────────────────────────────────
// バリデーション関数
// ────────────────────────────────────────────

/** 電話番号バリデーション（3分割入力対応） */
function validatePhone(phone: string): { valid: boolean; normalized: string; error?: string } {
  if (!phone || !phone.trim()) return { valid: true, normalized: "" };
  // ハイフン・スペース・括弧を除去して数字のみに
  const digits = phone.replace(/[\s\-\(\)（）ー−]/g, "");
  if (!/^0\d{9,10}$/.test(digits)) {
    return { valid: false, normalized: phone, error: "電話番号は0から始まる10〜11桁の数字で入力してください" };
  }
  // ハイフン付きフォーマットに正規化
  let formatted: string;
  if (digits.startsWith("0120") || digits.startsWith("0800")) {
    formatted = `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  } else if (digits.startsWith("03") || digits.startsWith("06") || digits.startsWith("04")) {
    formatted = `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  } else if (digits.startsWith("090") || digits.startsWith("080") || digits.startsWith("070") || digits.startsWith("050")) {
    formatted = `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  } else {
    formatted = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return { valid: true, normalized: formatted };
}

/** 住所バリデーション（構造化対応） */
function validateStructuredAddress(
  prefecture: string | undefined,
  city: string | undefined,
  street: string | undefined,
): { valid: boolean; fullAddress: string; error?: string } {
  if (!prefecture) return { valid: false, fullAddress: "", error: "都道府県は必須です" };
  if (!city?.trim()) return { valid: false, fullAddress: "", error: "市区町村は必須です" };
  if (!street?.trim()) return { valid: false, fullAddress: "", error: "町名番地は必須です" };
  const fullAddress = `${prefecture}${city.trim()}${street.trim()}`;
  if (fullAddress.length > 200) return { valid: false, fullAddress, error: "住所が長すぎます" };
  return { valid: true, fullAddress };
}

/** 営業時間バリデーション（JSON or 文字列） */
function validateHours(hours: unknown): { valid: boolean; error?: string } {
  if (!hours) return { valid: false, error: "営業時間は必須です" };
  // JSON形式（構造化入力）
  if (typeof hours === "object") {
    const h = hours as { periods?: unknown[]; note?: string };
    if (!h.periods || !Array.isArray(h.periods) || h.periods.length === 0) {
      return { valid: false, error: "営業時間を少なくとも1つ設定してください" };
    }
    return { valid: true };
  }
  // 文字列形式（後方互換）
  if (typeof hours === "string") {
    if (hours.trim().length < 3) return { valid: false, error: "営業時間を正しく入力してください" };
    return { valid: true };
  }
  return { valid: false, error: "営業時間の形式が不正です" };
}

/** 定休日バリデーション（JSON or 文字列） */
function validateHolidays(holidays: unknown): { valid: boolean; error?: string } {
  if (!holidays) return { valid: false, error: "定休日は必須です" };
  // JSON形式（構造化入力）
  if (typeof holidays === "object") return { valid: true };
  // 文字列形式（後方互換）
  if (typeof holidays === "string") {
    if (holidays.trim().length === 0) return { valid: false, error: "定休日は必須です" };
    return { valid: true };
  }
  return { valid: false, error: "定休日の形式が不正です" };
}

/** URLバリデーション */
function validateUrl(url: string | undefined): boolean {
  if (!url || url.trim() === "") return true; // optional
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

// ────────────────────────────────────────────

/** GET: 自店舗のプロフィール */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const shopId = await getMyShopId(supabase, user.id);
    if (!shopId) {
      return NextResponse.json({ shop: null, basicInfo: null });
    }

    const { data: shopData } = await supabase
      .from("shops")
      .select("*")
      .eq("id", shopId)
      .single();

    const { data: basicInfo } = await supabase
      .from("shop_basic_info")
      .select("*")
      .eq("shop_id", shopId)
      .single();

    return NextResponse.json({ shop: shopData ?? null, basicInfo: basicInfo ?? null });
  } catch (error) {
    console.error("Dashboard shop GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST: 新規店舗登録 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const existingShopId = await getMyShopId(supabase, user.id);
    if (existingShopId) {
      return NextResponse.json({ error: "既に店舗が登録されています" }, { status: 409 });
    }

    const body = await request.json();
    const {
      name, owner_name, owner_real_name,
      category, description,
      // 構造化住所
      address_prefecture, address_city, address_street, address_building,
      // 電話（結合済みまたは分割）
      phone,
      // 営業時間・定休日（JSON形式）
      hours, holidays,
      // 外部URL
      tabelog_url, gmb_url, website_url,
      // ジオコーディング結果（フロントから渡される）
      nearest_station, latitude, longitude, walking_minutes,
    } = body;

    const errors: string[] = [];

    if (!name?.trim()) errors.push("店舗名は必須です");
    if (!owner_name?.trim()) errors.push("ニックネーム（公開名）は必須です");
    if (!category) errors.push("カテゴリーは必須です");

    // 構造化住所バリデーション
    const addrResult = validateStructuredAddress(address_prefecture, address_city, address_street);
    if (!addrResult.valid) errors.push(addrResult.error!);

    // 電話番号バリデーション
    const phoneResult = validatePhone(phone ?? "");
    if (!phoneResult.valid) errors.push(phoneResult.error!);

    // 営業時間・定休日
    const hoursResult = validateHours(hours);
    if (!hoursResult.valid) errors.push(hoursResult.error!);
    const holidaysResult = validateHolidays(holidays);
    if (!holidaysResult.valid) errors.push(holidaysResult.error!);

    // URL バリデーション
    if (!validateUrl(tabelog_url)) errors.push("食べログURLの形式が不正です");
    if (!validateUrl(gmb_url)) errors.push("GoogleマップURLの形式が不正です");
    if (!validateUrl(website_url)) errors.push("ホームページURLの形式が不正です");

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("、") }, { status: 400 });
    }

    // 結合住所
    const fullAddress = `${address_prefecture}${address_city?.trim() ?? ""}${address_street?.trim() ?? ""}${address_building?.trim() ? " " + address_building.trim() : ""}`;
    // 最寄り駅をareaに使う（後方互換）
    const area = nearest_station || address_city?.trim() || "";

    // slug生成
    const slug = name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30) + "-" + Date.now().toString(36);

    const admin = createServiceClient();

    const { data, error } = await admin
      .from("shops")
      .insert({
        slug,
        name: name.trim(),
        owner_name: owner_name.trim(),
        owner_real_name: owner_real_name?.trim() || null,
        category,
        area,
        description: description?.trim() || null,
        address: fullAddress.trim(),
        address_prefecture: address_prefecture || null,
        address_city: address_city?.trim() || null,
        address_street: address_street?.trim() || null,
        address_building: address_building?.trim() || null,
        phone: phoneResult.normalized || null,
        hours: typeof hours === "object" ? JSON.stringify(hours) : hours?.trim() ?? null,
        holidays: typeof holidays === "object" ? JSON.stringify(holidays) : holidays?.trim() ?? null,
        tabelog_url: tabelog_url?.trim() || null,
        gmb_url: gmb_url?.trim() || null,
        website_url: website_url?.trim() || null,
        owner_id: user.id,
        is_published: false,
      } as never)
      .select()
      .single();

    if (error) {
      console.error("Shop creation error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // shop_basic_info にジオコーディング結果を保存
    if (data && (latitude || nearest_station)) {
      const shopId = (data as { id: string }).id;
      await admin.from("shop_basic_info").upsert({
        shop_id: shopId,
        nearest_station: nearest_station || null,
        latitude: latitude || null,
        longitude: longitude || null,
        walking_minutes: walking_minutes || null,
      } as never, { onConflict: "shop_id" });
    }

    return NextResponse.json({ shop: data }, { status: 201 });
  } catch (error) {
    console.error("Dashboard shop POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** PATCH: 店舗プロフィールの更新 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const {
      shop_id,
      nearest_station, latitude, longitude, walking_minutes,
      ...updates
    } = body;

    if (!shop_id) {
      return NextResponse.json({ error: "shop_id is required" }, { status: 400 });
    }

    const isOwner = await verifyShopOwnership(supabase, user.id, shop_id);
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const errors: string[] = [];

    if ("phone" in updates && updates.phone) {
      const phoneResult = validatePhone(updates.phone);
      if (!phoneResult.valid) {
        errors.push(phoneResult.error!);
      } else {
        updates.phone = phoneResult.normalized || null;
      }
    }

    // 構造化住所更新
    if ("address_prefecture" in updates || "address_city" in updates || "address_street" in updates) {
      const pref = updates.address_prefecture;
      const city = updates.address_city;
      const street = updates.address_street;
      const building = updates.address_building || "";
      if (pref && city && street) {
        updates.address = `${pref}${city.trim()}${street.trim()}${building.trim() ? " " + building.trim() : ""}`;
      }
    }

    if ("hours" in updates && updates.hours) {
      const hoursResult = validateHours(updates.hours);
      if (!hoursResult.valid) errors.push(hoursResult.error!);
      if (typeof updates.hours === "object") {
        updates.hours = JSON.stringify(updates.hours);
      }
    }

    if ("holidays" in updates && updates.holidays) {
      const holidaysResult = validateHolidays(updates.holidays);
      if (!holidaysResult.valid) errors.push(holidaysResult.error!);
      if (typeof updates.holidays === "object") {
        updates.holidays = JSON.stringify(updates.holidays);
      }
    }

    // URL バリデーション
    if ("tabelog_url" in updates && !validateUrl(updates.tabelog_url)) errors.push("食べログURLの形式が不正です");
    if ("gmb_url" in updates && !validateUrl(updates.gmb_url)) errors.push("GoogleマップURLの形式が不正です");
    if ("website_url" in updates && !validateUrl(updates.website_url)) errors.push("ホームページURLの形式が不正です");

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("、") }, { status: 400 });
    }

    // 最寄り駅をareaにも反映
    if (nearest_station) {
      updates.area = nearest_station;
    }

    const { data, error } = await supabase
      .from("shops")
      .update({ ...updates, updated_at: new Date().toISOString() } as never)
      .eq("id", shop_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // shop_basic_info 更新（ジオコーディング結果）
    if (latitude || nearest_station) {
      const admin = createServiceClient();
      await admin.from("shop_basic_info").upsert({
        shop_id,
        nearest_station: nearest_station || null,
        latitude: latitude || null,
        longitude: longitude || null,
        walking_minutes: walking_minutes || null,
      } as never, { onConflict: "shop_id" });
    }

    return NextResponse.json({ shop: data });
  } catch (error) {
    console.error("Dashboard shop PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
