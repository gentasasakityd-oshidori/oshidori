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

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Maps APIキーが未設定です" },
        { status: 500 },
      );
    }

    // Google Geocoding APIで住所→緯度経度
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&language=ja&region=jp&key=${apiKey}`;
    const geocodeRes = await fetch(geocodeUrl);
    const geocodeData = await geocodeRes.json();

    if (
      geocodeData.status !== "OK" ||
      !geocodeData.results ||
      geocodeData.results.length === 0
    ) {
      return NextResponse.json(
        { error: "住所から位置情報を取得できませんでした" },
        { status: 404 },
      );
    }

    const location = geocodeData.results[0].geometry.location;
    const lat = location.lat as number;
    const lng = location.lng as number;
    const formattedAddress = geocodeData.results[0].formatted_address as string;

    // station-coordinates.ts から最寄り駅を検索
    // 動的importを避けるためインライン実装（サーバーサイドのみ）
    const { findNearestStations } = await import("@/lib/station-coordinates");
    const nearestStations = findNearestStations(lat, lng, 10);

    const result: GeocodeResult = {
      lat,
      lng,
      formattedAddress,
      nearestStations,
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "ジオコーディング中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
