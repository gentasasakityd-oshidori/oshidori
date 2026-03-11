import { describe, it, expect, vi, beforeEach } from "vitest";

const mockChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn(),
};

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => mockChain),
};

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

const { GET } = await import("@/app/api/menus/search/route");

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/menus/search");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString(), { method: "GET" }) as unknown as import("next/server").NextRequest;
}

describe("API: /api/menus/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("パラメータなしで空のメニューリストを返す", async () => {
    mockChain.limit.mockResolvedValue({ data: [], error: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.menus).toEqual([]);
  });

  it("検索クエリでフィルタリングする", async () => {
    mockChain.limit.mockResolvedValue({
      data: [
        {
          id: "menu-1",
          name: "特製ラーメン",
          price: 980,
          description: "こだわりの一杯",
          photo_url: null,
          kodawari_text: "自家製麺",
          kodawari_tags: ["自家製"],
          key_ingredients: ["麺", "チャーシュー"],
          menu_story: "テストストーリー",
          shops: {
            id: "shop-1",
            slug: "test-ramen",
            name: "テストラーメン店",
            area: "大岡山",
            category: "ラーメン",
            image_url: null,
          },
        },
      ],
      error: null,
    });

    const res = await GET(makeRequest({ q: "ラーメン" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.menus).toHaveLength(1);
    expect(body.menus[0].name).toBe("特製ラーメン");
    expect(body.menus[0].shop.slug).toBe("test-ramen");
    // or()が呼ばれたことを確認
    expect(mockChain.or).toHaveBeenCalled();
  });

  it("価格フィルタが適用される", async () => {
    mockChain.limit.mockResolvedValue({ data: [], error: null });

    await GET(makeRequest({ priceMin: "500", priceMax: "1500" }));
    expect(mockChain.gte).toHaveBeenCalledWith("price", 500);
    expect(mockChain.lte).toHaveBeenCalledWith("price", 1500);
  });

  it("カテゴリフィルタが適用される", async () => {
    mockChain.limit.mockResolvedValue({ data: [], error: null });

    await GET(makeRequest({ category: "居酒屋" }));
    // eq()がis_publishedとcategoryの2回呼ばれる
    expect(mockChain.eq).toHaveBeenCalledWith("shops.category", "居酒屋");
  });

  it("DBエラー時は500を返す", async () => {
    mockChain.limit.mockResolvedValue({
      data: null,
      error: { message: "DB error" },
    });

    const res = await GET(makeRequest({ q: "test" }));
    expect(res.status).toBe(500);
  });
});
