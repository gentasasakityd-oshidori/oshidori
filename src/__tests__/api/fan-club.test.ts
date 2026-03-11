import { describe, it, expect, vi, beforeEach } from "vitest";

const mockChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
};

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => mockChain),
};

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

const { GET } = await import("@/app/api/fan-club/route");

describe("API: /api/fan-club", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shopIdがなければ400を返す", async () => {
    const req = new Request("http://localhost/api/fan-club", {
      method: "GET",
    });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("shopId指定でプラン情報を返す", async () => {
    mockChain.maybeSingle.mockResolvedValue({
      data: {
        id: "plan-1",
        shop_id: "shop-1",
        name: "ゴールド会員",
        price: 0,
        is_active: true,
      },
      error: null,
    });

    const req = new Request(
      "http://localhost/api/fan-club?shopId=shop-1",
      { method: "GET" }
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.plan).toBeDefined();
    expect(body.plan.shop_id).toBe("shop-1");
  });

  it("プランが存在しない場合はnullを返す", async () => {
    mockChain.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    const req = new Request(
      "http://localhost/api/fan-club?shopId=shop-none",
      { method: "GET" }
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.plan).toBeNull();
  });
});
