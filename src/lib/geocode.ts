/**
 * ジオコーディングユーティリティ
 * 住所文字列から緯度・経度を取得する
 *
 * 優先順位:
 * 1. Google Maps Geocoding API（GOOGLE_MAPS_API_KEY がある場合）
 * 2. OpenStreetMap Nominatim（フォールバック、レート制限あり）
 */

type GeoResult = {
  latitude: number;
  longitude: number;
} | null;

/**
 * Google Maps Geocoding API で住所を座標に変換
 */
async function geocodeWithGoogle(address: string): Promise<GeoResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", address);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("language", "ja");
    url.searchParams.set("region", "jp");

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status === "OK" && data.results?.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
      };
    }
    return null;
  } catch (error) {
    console.error("Google Geocoding error:", error);
    return null;
  }
}

/**
 * OpenStreetMap Nominatim で住所を座標に変換（フォールバック）
 * レート制限: 1リクエスト/秒
 */
async function geocodeWithNominatim(address: string): Promise<GeoResult> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", address);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "jp");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "Oshidori-App/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error("Nominatim Geocoding error:", error);
    return null;
  }
}

/**
 * 住所を緯度・経度に変換する
 * Google Maps API → Nominatim の順で試行
 */
export async function geocodeAddress(address: string): Promise<GeoResult> {
  if (!address || address.trim().length < 5) return null;

  // Google Maps API を優先
  const googleResult = await geocodeWithGoogle(address);
  if (googleResult) return googleResult;

  // フォールバック: Nominatim
  return geocodeWithNominatim(address);
}
