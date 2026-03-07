import { NextResponse } from "next/server";

/**
 * ジオコーディングAPI
 * 住所文字列 → 緯度経度 → 最寄り駅（Google Geocoding API使用）
 */

interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  nearestStations: Array<{
    station: string;
    distanceKm: number;
    walkMinutes: number;
  }>;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address } = body as { address?: string };

    if (!address || address.length < 5) {
      return NextResponse.json(
        { error: "住所が短すぎます" },
        { status: 400 },
      );
    }

    const { findNearestStations, STATION_COORDINATES } = await import("@/lib/station-coordinates");

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    // Google Maps APIキーがある場合: 正式なジオコーディング
    if (apiKey) {
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&language=ja&region=jp&key=${apiKey}`;
      const geocodeRes = await fetch(geocodeUrl);
      const geocodeData = await geocodeRes.json();

      if (
        geocodeData.status === "OK" &&
        geocodeData.results &&
        geocodeData.results.length > 0
      ) {
        const location = geocodeData.results[0].geometry.location;
        const lat = location.lat as number;
        const lng = location.lng as number;
        const formattedAddress = geocodeData.results[0].formatted_address as string;
        const nearestStations = findNearestStations(lat, lng, 10);

        const result: GeocodeResult = {
          lat,
          lng,
          formattedAddress,
          nearestStations,
        };
        return NextResponse.json(result);
      }
    }

    // フォールバック: 住所テキストから駅名をマッチングして推測
    const stationNames = Object.keys(STATION_COORDINATES);
    const matched = stationNames.filter((name) => address.includes(name));
    if (matched.length > 0) {
      const best = matched.sort((a, b) => b.length - a.length)[0];
      const coords = STATION_COORDINATES[best];
      const nearestStations = findNearestStations(coords.lat, coords.lng, 10);
      const result: GeocodeResult = {
        lat: coords.lat,
        lng: coords.lng,
        formattedAddress: address,
        nearestStations,
      };
      return NextResponse.json(result);
    }

    // 地域名マッチング: 住所内のキーワードから最も近い駅を推定
    const areaKeywords: Record<string, string> = {
      "目黒区": "目黒", "品川区": "大井町", "世田谷区": "二子玉川",
      "渋谷区": "渋谷", "新宿区": "新宿", "港区": "六本木",
      "中央区": "銀座", "千代田区": "東京", "文京区": "後楽園",
      "台東区": "上野", "墨田区": "錦糸町", "江東区": "豊洲",
      "大田区": "蒲田", "杉並区": "荻窪", "中野区": "中野",
      "豊島区": "池袋", "北区": "赤羽", "板橋区": "板橋",
      "練馬区": "練馬", "足立区": "北千住", "荒川区": "日暮里",
      "葛飾区": "亀有", "江戸川区": "葛西",
      "川崎市": "武蔵小杉", "横浜市": "横浜",
    };
    for (const [keyword, station] of Object.entries(areaKeywords)) {
      if (address.includes(keyword) && STATION_COORDINATES[station]) {
        const coords = STATION_COORDINATES[station];
        const nearestStations = findNearestStations(coords.lat, coords.lng, 10);
        return NextResponse.json({
          lat: coords.lat,
          lng: coords.lng,
          formattedAddress: address,
          nearestStations,
        } as GeocodeResult);
      }
    }

    return NextResponse.json(
      { error: "住所から最寄り駅を特定できませんでした。住所をより詳しく入力してください。" },
      { status: 404 },
    );
  } catch {
    return NextResponse.json(
      { error: "ジオコーディング中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
