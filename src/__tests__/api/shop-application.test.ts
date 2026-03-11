import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

const { POST, GET } = await import("@/app/api/shop-application/route");

describe("API: /api/shop-application", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== GET テスト =====
  it("GET: 未認証なら401を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET: ドラフトと審査中を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // ドラフト検索
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "draft-1", shop_name: "テスト" }, error: null }),
        };
      }
      // pending検索
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.draft).toBeTruthy();
    expect(json.hasPending).toBe(false);
  });

  // ===== POST テスト =====
  it("POST: 未認証なら401を返す", async () => {
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

  it("POST step=1: 基本情報でドラフト作成", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    let callCount = 0;
    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "draft-1" }, error: null }),
    };
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        // pending + draft チェック
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return insertChain;
    });

    const req = new Request("http://localhost/api/shop-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: 1,
        shop_name: "テスト居酒屋",
        applicant_name: "山田太郎",
        shop_genre: "居酒屋",
      }),
    });

    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.draft_id).toBe("draft-1");

    const insertArgs = insertChain.insert.mock.calls[0][0];
    expect(insertArgs.shop_name).toBe("テスト居酒屋");
    expect(insertArgs.status).toBe("draft");
    expect(insertArgs.application_step).toBe(1);
  });

  it("POST step=1: shop_nameが欠けると400", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const req = new Request("http://localhost/api/shop-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: 1, applicant_name: "山田" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("POST step=2: 所在地・SNS情報を更新", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "draft-1" }, error: null }),
        };
      }
      return updateChain;
    });

    const req = new Request("http://localhost/api/shop-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: 2,
        address_prefecture: "東京都",
        address_city: "目黒区",
        address_street: "1-2-3",
        phone: "0312345678",
        website_url: "https://example.com",
        instagram_url: "https://instagram.com/test",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const updateArgs = updateChain.update.mock.calls[0][0];
    expect(updateArgs.address_prefecture).toBe("東京都");
    expect(updateArgs.phone).toBe("0312345678");
    expect(updateArgs.website_url).toBe("https://example.com");
    expect(updateArgs.instagram_url).toBe("https://instagram.com/test");
    expect(updateArgs.application_step).toBe(2);
  });

  it("POST step=3: ドラフトをpendingに変更", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@example.com" } },
      error: null,
    });

    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // ドラフト確認
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "draft-1" }, error: null }),
        };
      }
      if (callCount === 2) {
        // ステータス更新
        return updateChain;
      }
      // 送信後のドラフト全データ取得（メール通知用）
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "draft-1", shop_name: "テスト店", applicant_name: "テスト太郎" },
          error: null,
        }),
      };
    });

    const req = new Request("http://localhost/api/shop-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: 3 }),
    });

    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const updateArgs = updateChain.update.mock.calls[0][0];
    expect(updateArgs.status).toBe("pending");
    expect(updateArgs.application_step).toBe(3);
  });

  it("POST step=3: ドラフトがない場合404", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const req = new Request("http://localhost/api/shop-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: 3 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  // ===== レガシー（stepなし）テスト =====
  it("レガシー: shop_nameまたはapplicant_nameが欠けていると400を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const req1 = new Request("http://localhost/api/shop-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicant_name: "山田", address_prefecture: "東京都", address_city: "目黒区", address_street: "1-2-3", phone: "0312345678" }),
    });
    const res1 = await POST(req1);
    expect(res1.status).toBe(400);

    const req2 = new Request("http://localhost/api/shop-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_name: "テスト店", address_prefecture: "東京都", address_city: "目黒区", address_street: "1-2-3", phone: "0312345678" }),
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(400);
  });

  it("レガシー: 住所・電話が欠けていると400を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const req1 = new Request("http://localhost/api/shop-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_name: "テスト", applicant_name: "山田", phone: "0312345678" }),
    });
    const res1 = await POST(req1);
    expect(res1.status).toBe(400);

    const req2 = new Request("http://localhost/api/shop-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_name: "テスト", applicant_name: "山田", address_prefecture: "東京都", address_city: "目黒区", address_street: "1-2-3" }),
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(400);
  });

  it("レガシー: 審査中の申請があると409を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const fromChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "existing-app" },
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(fromChain);

    const req = new Request("http://localhost/api/shop-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop_name: "テスト", applicant_name: "山田",
        address_prefecture: "東京都", address_city: "目黒区", address_street: "1-2-3", phone: "0312345678",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("レガシー: 正常な申請が成功する", async () => {
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
        shop_name: "テスト居酒屋",
        applicant_name: "山田太郎",
        shop_genre: "izakaya",
        shop_area: "東京都",
        applicant_role: "オーナー",
        message: "よろしくお願いします",
        address_prefecture: "東京都",
        address_city: "目黒区大岡山",
        address_street: "1-2-3",
        address_building: "テストビル2F",
        phone: "0312345678",
        website_url: "https://example.com",
        instagram_url: "https://instagram.com/test",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const insertArgs = insertChain.insert.mock.calls[0][0];
    expect(insertArgs.shop_name).toBe("テスト居酒屋");
    expect(insertArgs.applicant_name).toBe("山田太郎");
    expect(insertArgs.user_id).toBe("user-1");
    expect(insertArgs.address_prefecture).toBe("東京都");
    expect(insertArgs.phone).toBe("0312345678");
    expect(insertArgs.website_url).toBe("https://example.com");
    expect(insertArgs.instagram_url).toBe("https://instagram.com/test");
  });
});
