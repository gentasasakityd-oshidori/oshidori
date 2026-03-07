import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const nickname = searchParams.get("nickname") ?? "ユーザー";
  const count = searchParams.get("count") ?? "0";
  const shops = searchParams.get("shops") ?? "";
  const shopList = shops ? shops.split(",").slice(0, 3) : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #FFF5F0 0%, #FFF0E5 50%, #FFE8D6 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "24px",
          }}
        >
          <span style={{ fontSize: "28px", color: "#E06A4E", fontWeight: 700 }}>
            オシドリ
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "32px",
            fontWeight: 700,
            color: "#2C3E50",
            marginBottom: "16px",
          }}
        >
          {nickname} のマイコレクション
        </div>

        {/* Count */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "8px",
            marginBottom: "24px",
          }}
        >
          <span style={{ fontSize: "56px", fontWeight: 800, color: "#E06A4E" }}>
            {count}
          </span>
          <span style={{ fontSize: "24px", color: "#6B7280" }}>店</span>
        </div>

        {/* Shop names */}
        {shopList.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {shopList.map((shop, i) => (
              <div
                key={i}
                style={{
                  fontSize: "18px",
                  color: "#4B5563",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span style={{ color: "#E06A4E" }}>❤️</span> {shop}
              </div>
            ))}
            {parseInt(count) > 3 && (
              <div style={{ fontSize: "14px", color: "#9CA3AF" }}>
                ...ほか {parseInt(count) - 3} 店
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: "24px",
            fontSize: "14px",
            color: "#9CA3AF",
          }}
        >
          oshidori.vercel.app
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
