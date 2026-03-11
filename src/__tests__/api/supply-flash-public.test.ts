import { describe, it, expect, vi, beforeEach } from "vitest";

const mockChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
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

const { GET } = await import("@/app/api/supply-flash/route");

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/supply-flash");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString(), { method: "GET" }) as unknown as import("next/server").NextRequest;
}

describe("API: /api/supply-flash (消費者向け)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shopId指定でアクティブな在庫速報を返す", async () => {
    mockChain.limit.mockResolvedValue({
      data: [
        {
          id: "flash-1",
          title: "本日の限定メニュー",
          description: "チャーシュー麺、残り5杯！",
          supply_type: "limited",
          remaining_count: 5,
          is_active: true,
        },
      ],
      error: null,
    });

    const res = await GET(makeRequest({ shopId: "shop-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.posts).toHaveLength(1);
    expect(body.posts[0].title).toBe("本日の限定メニュー");
  });

  it("shopId未指定・未ログインで空配列を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.posts).toEqual([]);
  });

  it("shopId未指定・ログイン済みで推し店の速報を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    let fromCallCount = 0;
    mockSupabase.from.mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) {
        // oshi_shops
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{ shop_id: "shop-1" }, { shop_id: "shop-2" }],
          }),
        };
      }
      // supply_flash_posts
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            { id: "flash-2", title: "季節限定", shop_id: "shop-1" },
          ],
          error: null,
        }),
      };
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.posts).toBeDefined();
  });

  it("推し店がない場合は空配列を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [] }),
    }));

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.posts).toEqual([]);
  });
});
