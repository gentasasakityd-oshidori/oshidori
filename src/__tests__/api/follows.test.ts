import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

const { GET, POST } = await import("@/app/api/follows/route");

describe("API: /api/follows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET - フォロー一覧", () => {
    it("未認証なら401を返す", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const req = new Request("http://localhost/api/follows");
      // NextRequest needs nextUrl
      const nextReq = {
        ...req,
        nextUrl: new URL("http://localhost/api/follows"),
      };
      const res = await GET(nextReq as any);
      expect(res.status).toBe(401);
    });

    it("特定ユーザーのフォロー状態を確認できる", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });

      const fromChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [{ id: "f1" }], error: null }),
      };
      mockSupabase.from.mockReturnValue(fromChain);

      const req = {
        nextUrl: new URL("http://localhost/api/follows?user_id=user-2"),
      };
      const res = await GET(req as any);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.isFollowing).toBe(true);
    });

    it("フォローしていない場合isFollowing=falseを返す", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });

      const fromChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockSupabase.from.mockReturnValue(fromChain);

      const req = {
        nextUrl: new URL("http://localhost/api/follows?user_id=user-2"),
      };
      const res = await GET(req as any);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.isFollowing).toBe(false);
    });
  });

  describe("POST - フォロー/アンフォロー", () => {
    it("未認証なら401を返す", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const req = {
        json: vi.fn().mockResolvedValue({ user_id: "user-2", action: "follow" }),
        nextUrl: new URL("http://localhost/api/follows"),
      };
      const res = await POST(req as any);
      expect(res.status).toBe(401);
    });

    it("user_idまたはactionが欠けていると400を返す", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });

      // actionなし
      const req1 = {
        json: vi.fn().mockResolvedValue({ user_id: "user-2" }),
        nextUrl: new URL("http://localhost/api/follows"),
      };
      const res1 = await POST(req1 as any);
      expect(res1.status).toBe(400);

      // user_idなし
      const req2 = {
        json: vi.fn().mockResolvedValue({ action: "follow" }),
        nextUrl: new URL("http://localhost/api/follows"),
      };
      const res2 = await POST(req2 as any);
      expect(res2.status).toBe(400);
    });

    it("自分自身をフォローしようとすると400を返す", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });

      const req = {
        json: vi.fn().mockResolvedValue({ user_id: "user-1", action: "follow" }),
        nextUrl: new URL("http://localhost/api/follows"),
      };
      const res = await POST(req as any);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain("yourself");
    });

    it("フォロー操作が成功する", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });

      const fromChain = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      };
      mockSupabase.from.mockReturnValue(fromChain);

      const req = {
        json: vi.fn().mockResolvedValue({ user_id: "user-2", action: "follow" }),
        nextUrl: new URL("http://localhost/api/follows"),
      };
      const res = await POST(req as any);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.action).toBe("followed");
    });

    it("アンフォロー操作が成功する", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });

      const fromChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      // eq の最後の呼び出しが解決する
      let eqCallCount = 0;
      fromChain.eq.mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount >= 2) {
          return Promise.resolve({ error: null });
        }
        return fromChain;
      });
      mockSupabase.from.mockReturnValue(fromChain);

      const req = {
        json: vi.fn().mockResolvedValue({ user_id: "user-2", action: "unfollow" }),
        nextUrl: new URL("http://localhost/api/follows"),
      };
      const res = await POST(req as any);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.action).toBe("unfollowed");
    });
  });
});
