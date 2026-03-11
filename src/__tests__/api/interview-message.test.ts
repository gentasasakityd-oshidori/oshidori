import { describe, it, expect, vi, beforeEach } from "vitest";

const mockChain = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
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

vi.mock("@/lib/ai/client", () => ({
  createChatCompletion: vi.fn(() =>
    Promise.resolve({
      content: '{"message": "素敵ですね！次の質問です。", "metadata": {"phase": "concept", "should_transition": false}}',
      model: "gpt-4o",
      usage: { prompt_tokens: 200, completion_tokens: 80, total_tokens: 280 },
    })
  ),
}));

vi.mock("@/lib/ai/usage-logger", () => ({
  logApiUsage: vi.fn(),
}));

vi.mock("@/lib/ai/interview-context", () => ({
  getInterviewLearningText: vi.fn(() => Promise.resolve("")),
}));

vi.mock("@/lib/prompts", () => ({
  buildInterviewSystemPrompt: vi.fn(() => "システムプロンプト"),
  buildMonthlyUpdatePrompt: vi.fn(() => "月次プロンプト"),
  buildMenuAdditionPrompt: vi.fn(() => "メニュー追加プロンプト"),
  buildSeasonalMenuPrompt: vi.fn(() => "季節プロンプト"),
}));

const { POST } = await import("@/app/api/interview/message/route");

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/interview/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("API: /api/interview/message", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証なら401を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const res = await POST(
      makeRequest({ interview_id: "int-1", content: "テスト" })
    );
    expect(res.status).toBe(401);
  });

  it("interview_idがなければ400を返す", async () => {
    const res = await POST(makeRequest({ content: "テスト" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("interview_id");
  });

  it("contentがなければ400を返す", async () => {
    const res = await POST(makeRequest({ interview_id: "int-1" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("content");
  });

  it("存在しないインタビューなら404を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockChain.single.mockResolvedValue({ data: null, error: null });

    const res = await POST(
      makeRequest({ interview_id: "non-existent", content: "テスト" })
    );
    expect(res.status).toBe(404);
  });

  it("完了済みインタビューなら400を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockChain.single.mockResolvedValue({
      data: {
        id: "int-1",
        shop_id: "shop-1",
        status: "completed",
        interview_type: "initial_interview",
        current_phase: 7,
        engagement_context: {
          owner_name: "テスト太郎",
          shop_name: "テスト居酒屋",
          category: "居酒屋",
          key_quotes: [],
          emotion_tags: [],
          covered_topics: [],
        },
      },
      error: null,
    });

    const res = await POST(
      makeRequest({ interview_id: "int-1", content: "テスト" })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("completed");
  });

  it("正常なメッセージ送信でassistantレスポンスを返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    // from呼び出しごとに異なる結果を返す
    let fromCallCount = 0;
    mockSupabase.from.mockImplementation(() => {
      fromCallCount++;
      const chain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn(),
        maybeSingle: vi.fn(),
      };

      if (fromCallCount === 1) {
        // ai_interviews lookup
        chain.single.mockResolvedValue({
          data: {
            id: "int-1",
            shop_id: "shop-1",
            status: "in_progress",
            interview_type: "initial_interview",
            current_phase: 1,
            engagement_context: {
              owner_name: "テスト太郎",
              shop_name: "テスト居酒屋",
              category: "居酒屋",
              key_quotes: [],
              emotion_tags: [],
              covered_topics: [],
            },
          },
          error: null,
        });
      } else if (fromCallCount === 2) {
        // shops lookup
        chain.single.mockResolvedValue({
          data: {
            id: "shop-1",
            name: "テスト居酒屋",
            owner_name: "テスト太郎",
            category: "居酒屋",
          },
          error: null,
        });
      }

      return chain;
    });

    const res = await POST(
      makeRequest({ interview_id: "int-1", content: "うちの店は10年前に始めました" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBeDefined();
    expect(body.message.role).toBe("assistant");
  });
});
