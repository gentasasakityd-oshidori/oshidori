import { describe, it, expect, vi, beforeEach } from "vitest";

const mockChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
};

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => mockChain),
};

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@/lib/queries/my-shop", () => ({
  getMyShopId: vi.fn(),
}));

const { getMyShopId } = await import("@/lib/queries/my-shop");
const mockedGetMyShopId = getMyShopId as ReturnType<typeof vi.fn>;

const { GET } = await import("@/app/api/dashboard/fan-club/members/route");

describe("API: /api/dashboard/fan-club/members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証なら401を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("店舗がない場合は404を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockedGetMyShopId.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("メンバー数を正しく返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockedGetMyShopId.mockResolvedValue("shop-1");

    // select with count
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 5 }),
      }),
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBeDefined();
  });
});
