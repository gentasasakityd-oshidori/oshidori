import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

const { POST } = await import("@/app/api/oshi/route");

describe("API: /api/oshi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証なら401を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const req = new Request("http://localhost/api/oshi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_id: "shop-1" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("shop_idがなければ400を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const req = new Request("http://localhost/api/oshi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("不正なshop_idなら400を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    // 空文字
    const req1 = new Request("http://localhost/api/oshi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_id: "" }),
    });
    const res1 = await POST(req1);
    expect(res1.status).toBe(400);

    // 長すぎる
    const req2 = new Request("http://localhost/api/oshi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_id: "x".repeat(200) }),
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(400);
  });
});
