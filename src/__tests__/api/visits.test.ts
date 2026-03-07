import { describe, it, expect, vi, beforeEach } from "vitest";

// Supabase server mock
const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

// Dynamically import after mocks
const { GET, POST } = await import("@/app/api/visits/route");

describe("API: /api/visits", () => {
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
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe("Authentication required");
    });

    it("認証済みなら来店記録一覧を返す", async () => {
      const mockUser = { id: "user-1", email: "test@example.com" };
      const mockVisits = [
        { id: "v1", shop_id: "shop-1", mood_tag: "delicious", mood_tags: ["delicious"], memo: "おいしい" },
      ];
      const mockShops = [
        { id: "shop-1", name: "テスト食堂", slug: "test-shokudo", image_url: null },
      ];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const fromChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockVisits, error: null }),
      };
      const shopsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockShops, error: null }),
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? fromChain : shopsChain;
      });

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.visits).toHaveLength(1);
      expect(json.visits[0].shop_name).toBe("テスト食堂");
      expect(json.total).toBe(1);
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

    it("shop_idなしなら400を返す", async () => {
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
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("shop_id is required");
    });

    it("mood_tags配列を正しく保存する", async () => {
      const mockUser = { id: "user-1" };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "new-visit",
            user_id: "user-1",
            shop_id: "shop-1",
            mood_tags: ["delicious", "heartwarming"],
            mood_tag: "delicious",
          },
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue(insertChain);

      const req = new Request("http://localhost/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_id: "shop-1",
          mood_tags: ["delicious", "heartwarming"],
          memo: "両方の気持ち",
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.visit.mood_tags).toEqual(["delicious", "heartwarming"]);
      expect(json.visit.mood_tag).toBe("delicious"); // 後方互換

      // insertに渡されたデータを検証
      const insertArgs = insertChain.insert.mock.calls[0][0];
      expect(insertArgs.mood_tags).toEqual(["delicious", "heartwarming"]);
      expect(insertArgs.mood_tag).toBe("delicious");
    });

    it("旧形式のmood_tag（単一）も動作する", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });

      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "v2", mood_tag: "satisfied", mood_tags: ["satisfied"] },
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue(insertChain);

      const req = new Request("http://localhost/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop_id: "shop-1", mood_tag: "satisfied" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const insertArgs = insertChain.insert.mock.calls[0][0];
      expect(insertArgs.mood_tag).toBe("satisfied");
      expect(insertArgs.mood_tags).toEqual(["satisfied"]); // 配列にも変換
    });

    it("メモは500文字にトリミングされる", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });

      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "v3" }, error: null }),
      };
      mockSupabase.from.mockReturnValue(insertChain);

      const longMemo = "あ".repeat(600);
      const req = new Request("http://localhost/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop_id: "shop-1", memo: longMemo }),
      });

      await POST(req);
      const insertArgs = insertChain.insert.mock.calls[0][0];
      expect(insertArgs.memo.length).toBe(500);
    });
  });
});
