import { describe, it, expect, vi, beforeEach } from "vitest";

// ダッシュボード用Supply Flash API テスト
const mockChain = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
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

const { GET, POST, DELETE } = await import(
  "@/app/api/dashboard/supply-flash/route"
);

describe("API: /api/dashboard/supply-flash", () => {
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
      mockedGetMyShopId.mockResolvedValue(null);

      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.posts).toEqual([]);
    });
  });

  describe("POST", () => {
    it("未認証なら401を返す", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const req = new Request("http://localhost/api/dashboard/supply-flash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "本日の限定" }),
      }) as unknown as import("next/server").NextRequest;

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("店舗がない場合は404を返す", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });
      mockedGetMyShopId.mockResolvedValue(null);

      const req = new Request("http://localhost/api/dashboard/supply-flash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "本日の限定" }),
      }) as unknown as import("next/server").NextRequest;

      const res = await POST(req);
      expect(res.status).toBe(404);
    });

    it("タイトルが空なら400を返す", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });
      mockedGetMyShopId.mockResolvedValue("shop-1");

      const req = new Request("http://localhost/api/dashboard/supply-flash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "" }),
      }) as unknown as import("next/server").NextRequest;

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("タイトルが60文字超なら400を返す", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });
      mockedGetMyShopId.mockResolvedValue("shop-1");

      const req = new Request("http://localhost/api/dashboard/supply-flash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "あ".repeat(61) }),
      }) as unknown as import("next/server").NextRequest;

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("説明が280文字超なら400を返す", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });
      mockedGetMyShopId.mockResolvedValue("shop-1");

      const req = new Request("http://localhost/api/dashboard/supply-flash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "限定メニュー",
          description: "あ".repeat(281),
        }),
      }) as unknown as import("next/server").NextRequest;

      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE", () => {
    it("未認証なら401を返す", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const req = new Request(
        "http://localhost/api/dashboard/supply-flash?id=post-1",
        { method: "DELETE" }
      ) as unknown as import("next/server").NextRequest;

      const res = await DELETE(req);
      expect(res.status).toBe(401);
    });

    it("IDがなければ400を返す", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });
      mockedGetMyShopId.mockResolvedValue("shop-1");

      const req = new Request(
        "http://localhost/api/dashboard/supply-flash",
        { method: "DELETE" }
      ) as unknown as import("next/server").NextRequest;

      const res = await DELETE(req);
      expect(res.status).toBe(400);
    });
  });
});
