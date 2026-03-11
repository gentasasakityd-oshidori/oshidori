import { describe, it, expect, vi, beforeEach } from "vitest";

const mockChain = {
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn(),
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
  verifyShopOwnership: vi.fn(),
}));

vi.mock("@/lib/onboarding-pipeline", () => ({
  markStoryReviewed: vi.fn(() => Promise.resolve()),
}));

const { verifyShopOwnership } = await import("@/lib/queries/my-shop");
const mockedVerify = verifyShopOwnership as ReturnType<typeof vi.fn>;

const { GET, PATCH } = await import("@/app/api/dashboard/stories/route");

describe("API: /api/dashboard/stories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("未認証なら401を返す", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("店舗がない場合は空配列を返す", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });
      mockChain.single.mockResolvedValue({ data: null, error: null });

      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.stories).toEqual([]);
    });
  });

  describe("PATCH", () => {
    it("未認証なら401を返す", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const req = new Request("http://localhost/api/dashboard/stories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story_id: "s-1", status: "published" }),
      }) as unknown as import("next/server").NextRequest;

      const res = await PATCH(req);
      expect(res.status).toBe(401);
    });

    it("story_idがなければ400を返す", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });

      const req = new Request("http://localhost/api/dashboard/stories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      }) as unknown as import("next/server").NextRequest;

      const res = await PATCH(req);
      expect(res.status).toBe(400);
    });

    it("他人のストーリーは403を返す", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        const chain = {
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(),
        };
        if (callCount === 1) {
          // stories lookup
          chain.single.mockResolvedValue({
            data: { shop_id: "shop-other" },
            error: null,
          });
        }
        return chain;
      });
      mockedVerify.mockResolvedValue(false);

      const req = new Request("http://localhost/api/dashboard/stories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story_id: "s-1", status: "published" }),
      }) as unknown as import("next/server").NextRequest;

      const res = await PATCH(req);
      expect(res.status).toBe(403);
    });
  });
});
