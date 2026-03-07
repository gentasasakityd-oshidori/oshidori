import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

const { POST } = await import("@/app/api/shop-application/route");

describe("API: /api/shop-application", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証なら401を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const req = new Request("http://localhost/api/shop-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_name: "テスト", applicant_name: "山田" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("shop_nameまたはapplicant_nameが欠けていると400を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    // shop_nameなし
    const req1 = new Request("http://localhost/api/shop-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicant_name: "山田" }),
    });
    const res1 = await POST(req1);
    expect(res1.status).toBe(400);

    // applicant_nameなし
    const req2 = new Request("http://localhost/api/shop-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_name: "テスト店" }),
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(400);
  });

  it("審査中の申請があると409を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const fromChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "existing-app" }, // 既存の申請あり
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(fromChain);

    const req = new Request("http://localhost/api/shop-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_name: "テスト", applicant_name: "山田" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("正常な申請が成功する", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    // 最初のfrom呼び出し: 既存申請チェック（なし）
    const checkChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    // 2回目のfrom呼び出し: 新規申請挿入
    const insertChain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? checkChain : insertChain;
    });

    const req = new Request("http://localhost/api/shop-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop_name: "テスト居酒屋",
        applicant_name: "山田太郎",
        shop_genre: "izakaya",
        shop_area: "shibuya",
        applicant_role: "オーナー",
        message: "よろしくお願いします",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const insertArgs = insertChain.insert.mock.calls[0][0];
    expect(insertArgs.shop_name).toBe("テスト居酒屋");
    expect(insertArgs.applicant_name).toBe("山田太郎");
    expect(insertArgs.shop_genre).toBe("izakaya");
    expect(insertArgs.message).toBe("よろしくお願いします");
    expect(insertArgs.user_id).toBe("user-1");
  });

  it("オプションフィールドが空の場合nullになる", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const checkChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const insertChain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? checkChain : insertChain;
    });

    const req = new Request("http://localhost/api/shop-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop_name: "テスト",
        applicant_name: "山田",
      }),
    });

    await POST(req);
    const insertArgs = insertChain.insert.mock.calls[0][0];
    expect(insertArgs.shop_genre).toBeNull();
    expect(insertArgs.shop_area).toBeNull();
    expect(insertArgs.applicant_role).toBeNull();
    expect(insertArgs.message).toBeNull();
  });
});
