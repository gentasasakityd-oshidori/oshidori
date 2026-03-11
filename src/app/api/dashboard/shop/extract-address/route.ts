import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/dashboard/shop/extract-address
 * GMBまたは食べログURLから住所情報を抽出する
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
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
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URLを入力してください" },
        { status: 400 },
      );
    }

    const trimmedUrl = url.trim();

    // Google Maps URL の場合
    if (
      trimmedUrl.includes("google.com/maps") ||
      trimmedUrl.includes("goo.gl/maps") ||
      trimmedUrl.includes("maps.app.goo.gl")
    ) {
      return await extractFromGoogleMaps(trimmedUrl);
    }

    // 食べログURL の場合
    if (trimmedUrl.includes("tabelog.com")) {
      return await extractFromTabelog(trimmedUrl);
    }

    return NextResponse.json(
      {
        error:
          "Google マップまたは食べログのURLを入力してください",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("Extract address error:", error);
    return NextResponse.json(
      { error: "住所の取得に失敗しました" },
      { status: 500 },
    );
  }
}

/** Google Maps URL から住所を抽出 */
async function extractFromGoogleMaps(url: string) {
  try {
    // Google Maps URL から place_id またはクエリを抽出
    // 形式例: https://maps.google.com/?cid=xxxxx
    //         https://www.google.com/maps/place/店名/@lat,lng,...
    //         https://maps.app.goo.gl/xxxxx

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      // APIキーがない場合はURLからの直接パース
      return extractAddressFromMapsUrl(url);
    }

    // 短縮URLの場合はリダイレクト先を取得
    let resolvedUrl = url;
    if (
      url.includes("goo.gl/maps") ||
      url.includes("maps.app.goo.gl")
    ) {
      try {
        const response = await fetch(url, {
          method: "HEAD",
          redirect: "follow",
        });
        resolvedUrl = response.url;
      } catch {
        // リダイレクト解決に失敗した場合は元URLを使用
      }
    }

    // URLから場所名を抽出してGeocoding APIで住所取得
    const placeMatch = resolvedUrl.match(
      /\/maps\/place\/([^/@]+)/,
    );
    if (placeMatch) {
      const placeName = decodeURIComponent(
        placeMatch[1].replace(/\+/g, " "),
      );
      const geocodeRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(placeName)}&language=ja&key=${apiKey}`,
      );
      const geocodeData = await geocodeRes.json();
      if (
        geocodeData.results &&
        geocodeData.results.length > 0
      ) {
        return parseGoogleGeoResult(geocodeData.results[0]);
      }
    }

    // 座標から逆ジオコーディング
    const coordMatch = resolvedUrl.match(
      /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    );
    if (coordMatch) {
      const lat = coordMatch[1];
      const lng = coordMatch[2];
      const geocodeRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=ja&key=${apiKey}`,
      );
      const geocodeData = await geocodeRes.json();
      if (
        geocodeData.results &&
        geocodeData.results.length > 0
      ) {
        return parseGoogleGeoResult(geocodeData.results[0]);
      }
    }

    return NextResponse.json(
      {
        error:
          "Google マップURLから住所を取得できませんでした。住所を手動で入力してください。",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("Google Maps extraction error:", error);
    return NextResponse.json(
      {
        error:
          "Google マップからの取得に失敗しました",
      },
      { status: 500 },
    );
  }
}

/** Google Geocoding API の結果をパース */
function parseGoogleGeoResult(
  result: Record<string, unknown>,
) {
  const components = (
    result.address_components as Array<{
      long_name: string;
      types: string[];
    }>
  ) || [];

  let prefecture = "";
  let city = "";
  let street = "";

  for (const comp of components) {
    if (
      comp.types.includes("administrative_area_level_1")
    ) {
      prefecture = comp.long_name;
    }
    if (comp.types.includes("locality")) {
      city = comp.long_name;
    }
    if (comp.types.includes("sublocality_level_1")) {
      city = city || comp.long_name;
    }
    if (
      comp.types.includes("sublocality_level_2") ||
      comp.types.includes("sublocality_level_3")
    ) {
      street += comp.long_name;
    }
    if (comp.types.includes("premise")) {
      street += comp.long_name;
    }
  }

  if (!prefecture) {
    return NextResponse.json(
      {
        error:
          "住所情報を取得できませんでした",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    prefecture,
    city,
    street,
    building: "",
    source: "google_maps",
  });
}

/** Google Maps URL から直接パース（APIキーなし） */
function extractAddressFromMapsUrl(url: string) {
  // URLに直接含まれる住所テキストを抽出
  const placeMatch = url.match(
    /\/maps\/place\/([^/@]+)/,
  );
  if (placeMatch) {
    const placeName = decodeURIComponent(
      placeMatch[1].replace(/\+/g, " "),
    );
    // 住所っぽいテキストを返す（都道府県を含む場合）
    const prefMatch = placeName.match(
      /(北海道|東京都|(?:京都|大阪)府|.{2,3}県)/,
    );
    if (prefMatch) {
      return NextResponse.json({
        prefecture: "",
        city: "",
        street: "",
        building: "",
        rawAddress: placeName,
        source: "google_maps_url",
      });
    }
  }

  return NextResponse.json(
    {
      error:
        "URLから住所を取得できませんでした。Google Maps APIキーが設定されていない可能性があります。",
    },
    { status: 400 },
  );
}

/** 食べログURL から住所を抽出 */
async function extractFromTabelog(url: string) {
  try {
    // 食べログのページをフェッチしてHTMLから住所を抽出
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; OshidoriBot/1.0)",
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            "食べログページの取得に失敗しました",
        },
        { status: 400 },
      );
    }

    const html = await response.text();

    // 食べログの住所はJSON-LDに含まれることが多い
    const jsonLdMatch = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        if (jsonLd.address) {
          const addr = jsonLd.address;
          return NextResponse.json({
            prefecture:
              addr.addressRegion || "",
            city:
              addr.addressLocality || "",
            street:
              addr.streetAddress || "",
            building: "",
            source: "tabelog",
          });
        }
      } catch {
        // JSON-LDパース失敗
      }
    }

    // HTMLから直接住所を抽出 (rstinfo-table__address)
    const addressMatch = html.match(
      /class="rstinfo-table__address"[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/,
    );
    if (addressMatch) {
      const rawAddress = addressMatch[1]
        .replace(/<[^>]*>/g, "")
        .trim();
      const prefMatch = rawAddress.match(
        /^(北海道|東京都|(?:京都|大阪)府|.{2,3}県)/,
      );
      if (prefMatch) {
        const prefecture = prefMatch[1];
        const rest = rawAddress
          .slice(prefecture.length)
          .trim();
        const cityMatch = rest.match(
          /^(.+?(?:市|区|町|村|郡.+?(?:町|村)))/,
        );
        if (cityMatch) {
          const city = cityMatch[1];
          const street = rest
            .slice(city.length)
            .trim();
          return NextResponse.json({
            prefecture,
            city,
            street,
            building: "",
            source: "tabelog",
          });
        }
      }
    }

    return NextResponse.json(
      {
        error:
          "食べログページから住所を取得できませんでした。住所を手動で入力してください。",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("Tabelog extraction error:", error);
    return NextResponse.json(
      {
        error:
          "食べログからの取得に失敗しました",
      },
      { status: 500 },
    );
  }
}
