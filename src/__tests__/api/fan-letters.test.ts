import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

const { GET, POST } = await import("@/app/api/fan-letters/route");

describe("API: /api/fan-letters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET - ファンレター一覧", () => {
    it("未認証なら401を返す", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const req = new Request("http://localhost/api/fan-letters");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("認証済みで自分の送信済みレターを返す", async () => {
      const mockUser = { id: "user-1", email: "test@example.com" };
      const mockLetters = [
        { id: "l1", user_id: "user-1", shop_id: "shop-1", content: "美味しかったです！" },
      ];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const fromChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockLetters, error: null }),
      };
      mockSupabase.from.mockReturnValue(fromChain);

      const req = new Request("http://localhost/api/fan-letters");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.letters).toHaveLength(1);
      expect(json.total).toBe(1);
    });
  });

  describe("POST - ファンレター送信", () => {
    it("未認証なら401を返す", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const req = new Request("http://localhost/api/fan-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop_id: "shop-1", content: "すごい！" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("shop_idまたはcontentが欠けていると400を返す", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });

      // shop_idなし
      const req1 = new Request("http://localhost/api/fan-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "テスト" }),
      });
      const res1 = await POST(req1);
      expect(res1.status).toBe(400);

      // contentなし
      const req2 = new Request("http://localhost/api/fan-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop_id: "shop-1" }),
      });
      const res2 = await POST(req2);
      expect(res2.status).toBe(400);
    });

    it("200文字超のcontentは400を返す", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });

      const longContent = "あ".repeat(201);
      const req = new Request("http://localhost/api/fan-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop_id: "shop-1", content: longContent }),
      });

      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.error).toContain("200");
    });

    it("正常な送信でレターが作成される", async () => {
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
            id: "new-letter",
            user_id: "user-1",
            shop_id: "shop-1",
            content: "最高でした",
            is_anonymous: false,
          },
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue(insertChain);

      const req = new Request("http://localhost/api/fan-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_id: "shop-1",
          content: "最高でした",
          is_anonymous: false,
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.letter.content).toBe("最高でした");
      expect(json.letter.is_anonymous).toBe(false);
    });

    it("匿名フラグが正しく反映される", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });

      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "l2", is_anonymous: true },
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue(insertChain);

      const req = new Request("http://localhost/api/fan-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_id: "shop-1",
          content: "匿名応援",
          is_anonymous: true,
        }),
      });

      await POST(req);
      const insertArgs = insertChain.insert.mock.calls[0][0];
      expect(insertArgs.is_anonymous).toBe(true);
    });
  });
});
