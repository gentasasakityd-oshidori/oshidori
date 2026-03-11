import { NextResponse } from "next/server";

/**
 * GET /api/postal-code?code=1520033
 * 郵便番号から住所を自動入力するAPI
 * zipcloud.ibsnet.co.jp の無料APIを利用
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "郵便番号を指定してください" }, { status: 400 });
  }

  // ハイフン除去・数字のみに正規化
  const normalized = code.replace(/[-\s〒]/g, "");
  if (!/^\d{7}$/.test(normalized)) {
    return NextResponse.json({ error: "郵便番号は7桁の数字で入力してください" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${normalized}`,
      { next: { revalidate: 86400 } } // 24時間キャッシュ
    );

    if (!res.ok) {
      return NextResponse.json({ error: "住所検索サービスに接続できません" }, { status: 502 });
    }

    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      return NextResponse.json({ error: "該当する住所が見つかりません" }, { status: 404 });
    }

    const result = data.results[0];
    return NextResponse.json({
      prefecture: result.address1, // 都道府県
      city: result.address2,       // 市区町村
      street: result.address3,     // 町域
    });
  } catch {
    return NextResponse.json({ error: "住所検索に失敗しました" }, { status: 500 });
  }
}
