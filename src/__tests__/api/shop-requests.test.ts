import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

const { POST } = await import("@/app/api/shop-requests/route");

describe("API: /api/shop-requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shop_nameとareaが欠けていると400を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    // shop_nameなし
    const req1 = new Request("http://localhost/api/shop-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ area: "shibuya" }),
    });
    const res1 = await POST(req1 as any);
    expect(res1.status).toBe(400);

    // areaなし
    const req2 = new Request("http://localhost/api/shop-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_name: "テスト店" }),
    });
    const res2 = await POST(req2 as any);
    expect(res2.status).toBe(400);
  });

  it("未認証でも送信できる（user_idはnull）", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const fromChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "req-1" },
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(fromChain);

    const req = new Request("http://localhost/api/shop-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_name: "テスト店", area: "shibuya" }),
    });

    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.id).toBe("req-1");

    const insertArgs = fromChain.insert.mock.calls[0][0];
    expect(insertArgs.user_id).toBeNull();
    expect(insertArgs.shop_name).toBe("テスト店");
    expect(insertArgs.area).toBe("shibuya");
  });

  it("認証済みユーザーのuser_idが保存される", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const fromChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "req-2" },
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(fromChain);

    const req = new Request("http://localhost/api/shop-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop_name: "推しの店",
        area: "shinjuku",
        reason: "友達のおすすめ",
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);

    const insertArgs = fromChain.insert.mock.calls[0][0];
    expect(insertArgs.user_id).toBe("user-1");
    expect(insertArgs.reason).toBe("友達のおすすめ");
  });

  it("reasonは任意パラメータ", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const fromChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "req-3" },
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(fromChain);

    const req = new Request("http://localhost/api/shop-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_name: "テスト", area: "ikebukuro" }),
    });

    await POST(req as any);
    const insertArgs = fromChain.insert.mock.calls[0][0];
    expect(insertArgs.reason).toBeNull();
  });
});
