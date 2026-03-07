import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

const { GET } = await import("@/app/api/oshidori-score/route");

describe("API: /api/oshidori-score", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証なら401を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const req = {
      nextUrl: new URL("http://localhost/api/oshidori-score?partner_id=p1"),
    };
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it("partner_idが無ければ400を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const req = {
      nextUrl: new URL("http://localhost/api/oshidori-score"),
    };
    const res = await GET(req as any);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("partner_id");
  });

  it("共通の推し店がない場合スコア0を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    // 自分: shop-A, shop-B  パートナー: shop-C, shop-D
    const myOshi = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [{ shop_id: "shop-A" }, { shop_id: "shop-B" }], error: null }) };
    const partnerOshi = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [{ shop_id: "shop-C" }, { shop_id: "shop-D" }], error: null }) };

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      return callCount <= 1 ? myOshi : partnerOshi;
    });

    const req = {
      nextUrl: new URL("http://localhost/api/oshidori-score?partner_id=user-2"),
    };
    const res = await GET(req as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.score).toBe(0);
    expect(json.level).toBe("これから");
    expect(json.commonCount).toBe(0);
    expect(json.myCount).toBe(2);
    expect(json.partnerCount).toBe(2);
  });

  it("共通の推し店がある場合Jaccard係数ベースのスコアを返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    // 自分: shop-A, shop-B  パートナー: shop-A, shop-C → 共通1 / union3 → 33%
    const myOshi = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [{ shop_id: "shop-A" }, { shop_id: "shop-B" }], error: null }) };
    const partnerOshi = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [{ shop_id: "shop-A" }, { shop_id: "shop-C" }], error: null }) };
    const shopsChain = { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [{ id: "shop-A", name: "共通のお店", slug: "common", area: "shibuya" }], error: null }) };

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return myOshi;
      if (callCount === 2) return partnerOshi;
      return shopsChain;
    });

    const req = {
      nextUrl: new URL("http://localhost/api/oshidori-score?partner_id=user-2"),
    };
    const res = await GET(req as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.score).toBe(33); // Math.round(1/3 * 100)
    expect(json.level).toBe("発見の余地あり");
    expect(json.commonCount).toBe(1);
    expect(json.commonShops).toHaveLength(1);
    expect(json.commonShops[0].name).toBe("共通のお店");
  });

  it("完全一致でスコア100を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    // 自分: shop-A  パートナー: shop-A → 100%
    const myOshi = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [{ shop_id: "shop-A" }], error: null }) };
    const partnerOshi = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [{ shop_id: "shop-A" }], error: null }) };
    const shopsChain = { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [{ id: "shop-A", name: "同じ推し", slug: "same", area: "shibuya" }], error: null }) };

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return myOshi;
      if (callCount === 2) return partnerOshi;
      return shopsChain;
    });

    const req = {
      nextUrl: new URL("http://localhost/api/oshidori-score?partner_id=user-2"),
    };
    const res = await GET(req as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.score).toBe(100);
    expect(json.level).toBe("おしどり夫婦");
  });

  it("レベル判定が正しく動作する", async () => {
    // レベル閾値: >=80 おしどり夫婦, >=60 食の相棒, >=40 いい感じ, >=20 発見の余地あり, <20 これから
    // このテストはレベル判定ロジックの境界値をカバー
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    // 4/5共通 = 80% → おしどり夫婦
    const myOshi = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          { shop_id: "s1" }, { shop_id: "s2" }, { shop_id: "s3" },
          { shop_id: "s4" }, { shop_id: "s5" },
        ],
        error: null,
      }),
    };
    const partnerOshi = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          { shop_id: "s1" }, { shop_id: "s2" }, { shop_id: "s3" },
          { shop_id: "s4" },
        ],
        error: null,
      }),
    };
    const shopsChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          { id: "s1", name: "S1", slug: "s1", area: "a" },
          { id: "s2", name: "S2", slug: "s2", area: "a" },
          { id: "s3", name: "S3", slug: "s3", area: "a" },
          { id: "s4", name: "S4", slug: "s4", area: "a" },
        ],
        error: null,
      }),
    };

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return myOshi;
      if (callCount === 2) return partnerOshi;
      return shopsChain;
    });

    const req = {
      nextUrl: new URL("http://localhost/api/oshidori-score?partner_id=user-2"),
    };
    const res = await GET(req as any);
    const json = await res.json();

    // 4 common / (5 + 4 - 4) = 4/5 = 80
    expect(json.score).toBe(80);
    expect(json.level).toBe("おしどり夫婦");
  });
});
