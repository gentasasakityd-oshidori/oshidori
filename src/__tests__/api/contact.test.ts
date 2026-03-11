import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

const { POST, rateLimitMap } = await import("@/app/api/contact/route");

describe("API: /api/contact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitMap.clear(); // レート制限をリセット
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
  });

  function createRequest(body: Record<string, unknown>) {
    return new Request("http://localhost/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "127.0.0.1",
      },
      body: JSON.stringify({
        _form_time: Date.now() - 5000, // 5秒前（正常）
        ...body,
      }),
    });
  }

  it("名前が空なら400を返す", async () => {
    const req = createRequest({
      name: "",
      email: "test@example.com",
      message: "テストメッセージです。",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("メールが空なら400を返す", async () => {
    const req = createRequest({
      name: "テスト太郎",
      email: "",
      message: "テストメッセージです。",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("メッセージが短すぎると400を返す", async () => {
    const req = createRequest({
      name: "テスト太郎",
      email: "test@example.com",
      message: "短い",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("ハニーポットフィールドが入力されていると静かに成功を返す", async () => {
    const req = createRequest({
      name: "Bot",
      email: "bot@spam.com",
      message: "スパムメッセージです。これはテストです。",
      _hp_field: "filled-by-bot",
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    // DBにinsertされていないことを確認
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("URLが4つ以上含まれると静かに成功を返す", async () => {
    const req = createRequest({
      name: "スパマー",
      email: "spam@example.com",
      message: "https://a.com https://b.com https://c.com https://d.com",
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("正常なお問い合わせが成功する", async () => {
    const insertChain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    mockSupabase.from.mockReturnValue(insertChain);

    const req = createRequest({
      name: "テスト太郎",
      email: "test@example.com",
      inquiry_type: "general",
      message: "オシドリについて質問があります。よろしくお願いします。",
    });

    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const insertArgs = insertChain.insert.mock.calls[0][0];
    expect(insertArgs.name).toBe("テスト太郎");
    expect(insertArgs.email).toBe("test@example.com");
    expect(insertArgs.inquiry_type).toBe("general");
  });
});
