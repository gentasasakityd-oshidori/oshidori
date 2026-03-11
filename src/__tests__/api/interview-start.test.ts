import { describe, it, expect, vi, beforeEach } from "vitest";

// モックチェーンの結果を管理するオブジェクト
const chainResult = {
  data: null as unknown,
  error: null as unknown,
  count: null as number | null,
};

const chainMethods = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn(() => Promise.resolve({ data: chainResult.data, error: chainResult.error })),
  maybeSingle: vi.fn(() => Promise.resolve({ data: chainResult.data, error: chainResult.error })),
};

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => chainMethods),
};

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@/lib/ai/client", () => ({
  createChatCompletion: vi.fn(() =>
    Promise.resolve({
      content: '{"message": "こんにちは！インタビューを始めましょう。", "metadata": {"phase": "warmup"}}',
      model: "gpt-4o",
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    })
  ),
}));

vi.mock("@/lib/ai/usage-logger", () => ({
  logApiUsage: vi.fn(),
}));

vi.mock("@/lib/ai/interview-context", () => ({
  getInterviewContext: vi.fn(() => Promise.resolve(null)),
  mergeContextToEngagement: vi.fn(() => ({
    owner_name: "テスト太郎",
    shop_name: "テスト居酒屋",
    category: "居酒屋",
    key_quotes: [],
    emotion_tags: [],
    covered_topics: [],
  })),
  getInterviewLearningText: vi.fn(() => Promise.resolve("")),
}));

vi.mock("@/lib/prompts", () => ({
  buildInterviewSystemPrompt: vi.fn(() => "テスト用システムプロンプト"),
  buildMonthlyUpdatePrompt: vi.fn(() => "月次プロンプト"),
  buildMenuAdditionPrompt: vi.fn(() => "メニュー追加プロンプト"),
  buildSeasonalMenuPrompt: vi.fn(() => "季節メニュープロンプト"),
}));

const { POST } = await import("@/app/api/interview/start/route");

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/interview/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("API: /api/interview/start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chainResult.data = null;
    chainResult.error = null;
    // 環境変数の設定
    process.env.OPENAI_API_KEY = "test-key";
  });

  it("未認証なら401を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const res = await POST(makeRequest({ shop_id: "shop-1" }));
    expect(res.status).toBe(401);
  });

  it("shop_idがなければ400を返す", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("shop_id");
  });

  it("無効なinterview_typeなら400を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const res = await POST(
      makeRequest({ shop_id: "shop-1", interview_type: "invalid_type" })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid interview_type");
  });

  it("AIキーが未設定なら500を返す", async () => {
    delete process.env.OPENAI_API_KEY;

    const res = await POST(
      makeRequest({ shop_id: "shop-1", interview_type: "initial_interview" })
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("AI API key");
  });
});
