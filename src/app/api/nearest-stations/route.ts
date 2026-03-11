import { NextResponse } from "next/server";

/**
 * GET /api/nearest-stations?lat=35.6074&lng=139.6855
 * 緯度経度から最寄り駅を検索するAPI
 * HeartRails Express API（無料）を利用
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "緯度(lat)と経度(lng)を指定してください" },
      { status: 400 }
    );
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json(
      { error: "緯度・経度は数値で指定してください" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `https://express.heartrails.com/api/json?method=getStations&x=${longitude}&y=${latitude}`,
      { next: { revalidate: 86400 } } // 24時間キャッシュ
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "駅検索サービスに接続できません" },
        { status: 502 }
      );
    }

    const data = await res.json();

    if (!data.response?.station || data.response.station.length === 0) {
      return NextResponse.json({ stations: [] });
    }

    // 徒歩10分（約800m）以内の駅をフィルタ、なければ最寄り1駅
    const stations = data.response.station.map(
      (s: { name: string; line: string; distance: string; x: string; y: string }) => {
        // distance は "xxxm" 形式
        const distanceMeters = parseInt(s.distance.replace("m", ""), 10);
        const walkingMinutes = Math.ceil(distanceMeters / 80); // 80m/分
        return {
          name: s.name,
          line: s.line,
          walking_minutes: walkingMinutes,
          distance_meters: distanceMeters,
        };
      }
    );

    // 徒歩10分以内の駅 or なければ最寄り1件
    const nearbyStations = stations.filter(
      (s: { walking_minutes: number }) => s.walking_minutes <= 10
    );
    const result =
      nearbyStations.length > 0 ? nearbyStations : stations.slice(0, 1);

    // 同名駅の重複除去（路線名は結合）
    const uniqueStations = new Map<
      string,
      { name: string; lines: string[]; walking_minutes: number }
    >();
    for (const s of result) {
      const existing = uniqueStations.get(s.name);
      if (existing) {
        if (!existing.lines.includes(s.line)) {
          existing.lines.push(s.line);
        }
        // より近い方を採用
        if (s.walking_minutes < existing.walking_minutes) {
          existing.walking_minutes = s.walking_minutes;
        }
      } else {
        uniqueStations.set(s.name, {
          name: s.name,
          lines: [s.line],
          walking_minutes: s.walking_minutes,
        });
      }
    }

    return NextResponse.json({
      stations: Array.from(uniqueStations.values()).map((s) => ({
        name: s.name,
        line: s.lines.join("・"),
        walking_minutes: s.walking_minutes,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "駅検索に失敗しました" },
      { status: 500 }
    );
  }
}
