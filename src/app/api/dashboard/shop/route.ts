import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getMyShopId, verifyShopOwnership } from "@/lib/queries/my-shop";
import { geocodeAddress } from "@/lib/geocode";

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
      owner_real_name_sei, owner_real_name_mei,
      category, description,
      // 構造化住所（addressはレガシー、address_*が新形式）
      address, address_prefecture, address_city, address_street, address_building,
      // 電話（結合済みまたは分割）
      phone,
      // 営業時間・定休日（JSON形式）
      hours, holidays,
      // 外部URL（フロントからは homepage_url / website_url どちらでも受付）
      tabelog_url, gmb_url, website_url, homepage_url,
      // homepage_url を website_url に統合
      // SNS URL
      instagram_url, x_url, facebook_url, youtube_url, line_url,
      // エリア（最寄り駅）
      area,
      // ジオコーディング結果（フロントから渡される）
      nearest_station, latitude, longitude, walking_minutes,
      // 詳細情報（オプション）
      budget_lunch, budget_dinner, payment_methods,
      service_charge, total_seats, private_rooms,
      rental_available, smoking_policy, parking, opening_date,
    } = body;

    const errors: string[] = [];

    if (!name?.trim()) errors.push("店舗名は必須です");
    if (!owner_name?.trim()) errors.push("ニックネーム（公開名）は必須です");
    if (!category) errors.push("カテゴリーは必須です");

    // 住所バリデーション（構造化 or レガシー）
    let fullAddress = "";
    if (address_prefecture || address_city || address_street) {
      // 構造化住所を優先
      const addrResult = validateStructuredAddress(address_prefecture, address_city, address_street);
      if (!addrResult.valid) {
        errors.push(addrResult.error!);
      } else {
        fullAddress = addrResult.fullAddress;
        if (address_building?.trim()) fullAddress += " " + address_building.trim();
      }
    } else if (address) {
      // レガシー形式（address文字列）
      fullAddress = address.trim();
    } else {
      errors.push("住所は必須です");
    }

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
    const resolvedWebsiteUrl = homepage_url || website_url;
    if (!validateUrl(resolvedWebsiteUrl)) errors.push("ホームページURLの形式が不正です");
    if (!validateUrl(instagram_url)) errors.push("Instagram URLの形式が不正です");
    if (!validateUrl(x_url)) errors.push("X(Twitter) URLの形式が不正です");
    if (!validateUrl(facebook_url)) errors.push("Facebook URLの形式が不正です");
    if (!validateUrl(youtube_url)) errors.push("YouTube URLの形式が不正です");
    if (!validateUrl(line_url)) errors.push("LINE URLの形式が不正です");

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("、") }, { status: 400 });
    }

    // 姓名を結合してowner_real_nameにも保存（後方互換）
    const resolvedRealName = owner_real_name_sei && owner_real_name_mei
      ? `${owner_real_name_sei.trim()} ${owner_real_name_mei.trim()}`
      : owner_real_name_sei?.trim() || owner_real_name?.trim() || null;

    // 最寄り駅をareaに使う（後方互換）
    const areaValue = area || nearest_station || address_city?.trim() || "";

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
        owner_real_name: resolvedRealName,
        owner_real_name_sei: owner_real_name_sei?.trim() || null,
        owner_real_name_mei: owner_real_name_mei?.trim() || null,
        category,
        area: areaValue,
        description: description?.trim() || null,
        address: fullAddress,
        address_prefecture: address_prefecture || null,
        address_city: address_city?.trim() || null,
        address_street: address_street?.trim() || null,
        address_building: address_building?.trim() || null,
        phone: phoneResult.normalized || null,
        hours: typeof hours === "object" ? JSON.stringify(hours) : hours?.trim() ?? null,
        holidays: typeof holidays === "object" ? JSON.stringify(holidays) : holidays?.trim() ?? null,
        tabelog_url: tabelog_url?.trim() || null,
        gmb_url: gmb_url?.trim() || null,
        website_url: resolvedWebsiteUrl?.trim() || null,
        instagram_url: instagram_url?.trim() || null,
        x_url: x_url?.trim() || null,
        facebook_url: facebook_url?.trim() || null,
        youtube_url: youtube_url?.trim() || null,
        line_url: line_url?.trim() || null,
        // 詳細情報（オプション）
        budget_lunch: budget_lunch?.trim() || null,
        budget_dinner: budget_dinner?.trim() || null,
        payment_methods: Array.isArray(payment_methods) ? JSON.stringify(payment_methods) : null,
        service_charge: service_charge?.trim() || null,
        total_seats: total_seats ? parseInt(String(total_seats), 10) || null : null,
        private_rooms: private_rooms || null,
        rental_available: rental_available ?? false,
        smoking_policy: smoking_policy || null,
        parking: parking?.trim() || null,
        opening_date: opening_date?.trim() || null,
        owner_id: user.id,
        is_published: false,
        onboarding_phase: "application_pending",
      } as never)
      .select()
      .single();

    if (error) {
      console.error("Shop creation error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // ジオコーディング: フロントから座標が渡されていない場合、住所から自動取得
    const shopId = (data as { id: string }).id;
    let resolvedLat = latitude ?? null;
    let resolvedLng = longitude ?? null;

    if (!resolvedLat && !resolvedLng && fullAddress) {
      try {
        const geo = await geocodeAddress(fullAddress);
        if (geo) {
          resolvedLat = geo.latitude;
          resolvedLng = geo.longitude;
          // shops テーブルの緯度経度を更新
          await admin
            .from("shops")
            .update({ latitude: resolvedLat, longitude: resolvedLng } as never)
            .eq("id", shopId);
        }
      } catch (e) {
        console.error("Geocoding failed for new shop:", e);
      }
    }

    // shop_basic_info にジオコーディング結果を保存
    if (resolvedLat || nearest_station) {
      await admin.from("shop_basic_info").upsert({
        shop_id: shopId,
        nearest_station: nearest_station || null,
        latitude: resolvedLat,
        longitude: resolvedLng,
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
    if ("address" in updates && updates.address) {
      // レガシー形式（address文字列）をそのまま使用
    } else if ("address_prefecture" in updates || "address_city" in updates || "address_street" in updates) {
      const pref = updates.address_prefecture;
      const city = updates.address_city;
      const street = updates.address_street;
      const building = updates.address_building || "";
      if (pref || city || street) {
        const addrResult = validateStructuredAddress(pref, city, street);
        if (!addrResult.valid) {
          errors.push(addrResult.error!);
        } else {
          updates.address = addrResult.fullAddress;
          if (building?.trim()) updates.address += " " + building.trim();
        }
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
    if ("homepage_url" in updates) {
      // フロントからの homepage_url を DB の website_url に変換
      updates.website_url = updates.homepage_url;
      delete updates.homepage_url;
    }
    if ("website_url" in updates && !validateUrl(updates.website_url)) errors.push("ホームページURLの形式が不正です");
    if ("instagram_url" in updates && !validateUrl(updates.instagram_url)) errors.push("Instagram URLの形式が不正です");
    if ("x_url" in updates && !validateUrl(updates.x_url)) errors.push("X(Twitter) URLの形式が不正です");
    if ("facebook_url" in updates && !validateUrl(updates.facebook_url)) errors.push("Facebook URLの形式が不正です");
    if ("youtube_url" in updates && !validateUrl(updates.youtube_url)) errors.push("YouTube URLの形式が不正です");
    if ("line_url" in updates && !validateUrl(updates.line_url)) errors.push("LINE URLの形式が不正です");

    // payment_methods が渡された場合、JSON変換
    if ("payment_methods" in updates && updates.payment_methods) {
      if (Array.isArray(updates.payment_methods)) {
        updates.payment_methods = JSON.stringify(updates.payment_methods);
      }
    }

    // total_seats が渡された場合、数値変換
    if ("total_seats" in updates && updates.total_seats !== null) {
      const seats = parseInt(String(updates.total_seats), 10);
      updates.total_seats = isNaN(seats) ? null : seats;
    }

    // 姓名分割: owner_real_name_sei / mei が渡された場合、owner_real_name も更新
    if ("owner_real_name_sei" in updates || "owner_real_name_mei" in updates) {
      const sei = updates.owner_real_name_sei?.trim() || "";
      const mei = updates.owner_real_name_mei?.trim() || "";
      if (sei || mei) {
        updates.owner_real_name = [sei, mei].filter(Boolean).join(" ");
      }
    }

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

    // ジオコーディング: 住所が更新されて座標が渡されていない場合、自動取得
    let resolvedLat = latitude ?? null;
    let resolvedLng = longitude ?? null;

    if (!resolvedLat && !resolvedLng && "address" in updates && updates.address) {
      try {
        const geo = await geocodeAddress(updates.address as string);
        if (geo) {
          resolvedLat = geo.latitude;
          resolvedLng = geo.longitude;
          // shops テーブルの緯度経度も更新
          await supabase
            .from("shops")
            .update({ latitude: resolvedLat, longitude: resolvedLng } as never)
            .eq("id", shop_id);
        }
      } catch (e) {
        console.error("Geocoding failed for shop update:", e);
      }
    }

    // shop_basic_info 更新（ジオコーディング結果）
    if (resolvedLat || nearest_station) {
      const admin = createServiceClient();
      await admin.from("shop_basic_info").upsert({
        shop_id,
        nearest_station: nearest_station || null,
        latitude: resolvedLat,
        longitude: resolvedLng,
        walking_minutes: walking_minutes || null,
      } as never, { onConflict: "shop_id" });
    }

    return NextResponse.json({ shop: data });
  } catch (error) {
    console.error("Dashboard shop PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
