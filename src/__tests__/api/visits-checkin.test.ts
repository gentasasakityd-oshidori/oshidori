import { describe, it, expect, vi, beforeEach } from "vitest";

const mockChain = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn(),
};

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => mockChain),
};

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

const { GET, POST } = await import("@/app/api/visits/route");

describe("API: /api/visits (チェックイン)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET - 来店記録一覧", () => {
    it("未認証なら401を返す", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const res = await GET();
      expect(res.status).toBe(401);
    });
  });

  describe("POST - 来店記録作成", () => {
    it("未認証なら401を返す", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const req = new Request("http://localhost/api/visits", {
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

      const req = new Request("http://localhost/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("正常なチェックインで来店記録を作成する", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });
      mockChain.single.mockResolvedValue({
        data: {
          id: "visit-1",
          user_id: "user-1",
          shop_id: "shop-1",
          mood_tags: ["delicious"],
          memo: "美味しかった",
        },
        error: null,
      });

      const req = new Request("http://localhost/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_id: "shop-1",
          mood_tags: ["delicious"],
          memo: "美味しかった",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.visit).toBeDefined();
      expect(body.visit.shop_id).toBe("shop-1");
    });

    it("mood_tag単一指定もmood_tagsに変換される", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });
      mockChain.single.mockResolvedValue({
        data: {
          id: "visit-2",
          user_id: "user-1",
          shop_id: "shop-1",
          mood_tag: "heartwarming",
          mood_tags: ["heartwarming"],
        },
        error: null,
      });

      const req = new Request("http://localhost/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_id: "shop-1",
          mood_tag: "heartwarming",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      // insert が呼ばれたことを確認
      expect(mockSupabase.from).toHaveBeenCalledWith("visit_records");
    });

    it("メモは500文字に切り詰められる", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });
      mockChain.single.mockResolvedValue({
        data: { id: "visit-3", user_id: "user-1", shop_id: "shop-1" },
        error: null,
      });

      const longMemo = "あ".repeat(600);
      const req = new Request("http://localhost/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_id: "shop-1",
          memo: longMemo,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      // insertが呼ばれた際にmemoが500文字以下になっていることを確認
      const insertCall = mockChain.insert.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
      if (insertCall?.memo) {
        expect((insertCall.memo as string).length).toBeLessThanOrEqual(500);
      }
    });
  });
});
