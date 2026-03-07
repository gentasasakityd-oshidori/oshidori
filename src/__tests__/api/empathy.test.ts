import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

const { POST } = await import("@/app/api/empathy/route");

describe("API: /api/empathy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証なら401を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const req = new Request("http://localhost/api/empathy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ story_id: "s1", tag_type: "craftsman" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("story_idが欠けていたら400を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const req = new Request("http://localhost/api/empathy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag_type: "craftsman" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("無効なtag_typeなら400を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const req = new Request("http://localhost/api/empathy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ story_id: "s1", tag_type: "invalid_tag" }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid tag_type");
  });

  it("有効なtag_typeは受理される", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    // 既存タップなし → 新規作成
    const queryChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "tap-1", tag_type: "craftsman" },
        error: null,
      }),
    };

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? queryChain : insertChain;
    });

    const validTags = ["craftsman", "ingredient", "hospitality", "passion", "kodawari", "story"];
    for (const tag of validTags) {
      callCount = 0;

      const req = new Request("http://localhost/api/empathy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story_id: "s1", tag_type: tag }),
      });

      const res = await POST(req);
      // 200 or 400 depending on mock state, but should not be 400 for tag validation
      expect(res.status).not.toBe(400);
    }
  });
});
