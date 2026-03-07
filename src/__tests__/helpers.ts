import { vi } from "vitest";

// --- Mock Supabase helpers ---

type MockQueryResult = {
  data: unknown;
  error: null | { message: string };
};

export function createMockSupabaseClient(overrides: {
  user?: { id: string; email: string } | null;
  queryResults?: Record<string, MockQueryResult>;
} = {}) {
  const user = overrides.user ?? null;
  const queryResults = overrides.queryResults ?? {};

  const chainMethods = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn((resolve: (value: MockQueryResult) => void) =>
      resolve({ data: [], error: null })
    ),
  };

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: user ? { user } : null },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn((table: string) => {
      const result = queryResults[table];
      if (result) {
        return {
          ...chainMethods,
          then: vi.fn((resolve: (value: MockQueryResult) => void) => resolve(result)),
        };
      }
      return chainMethods;
    }),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: "test.jpg" }, error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/test.jpg" } })),
      })),
    },
  };
}

// --- Mock Request helpers ---

export function createMockRequest(
  method: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>
): Request {
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new Request("http://localhost:3000/api/test", init);
}

// --- Test data factories ---

export const testUser = {
  id: "test-user-id-123",
  email: "test@example.com",
};

export const testShop = {
  id: "test-shop-id-456",
  name: "テスト居酒屋",
  slug: "test-izakaya",
  description: "テスト用の店舗です",
  image_url: null,
  status: "published",
  owner_id: testUser.id,
};

export const testStory = {
  id: "test-story-id-789",
  shop_id: testShop.id,
  title: "テストストーリー",
  body: "これはテスト用のストーリーです。",
  status: "published",
};

export const testVisit = {
  id: "test-visit-id-001",
  user_id: testUser.id,
  shop_id: testShop.id,
  mood_tag: "delicious",
  mood_tags: ["delicious", "heartwarming"],
  memo: "美味しかった！",
  photo_url: null,
  is_public: false,
  visited_at: "2026-03-02T12:00:00Z",
  created_at: "2026-03-02T12:00:00Z",
};

// --- Fetch mock helpers ---

export function mockFetchSuccess(data: unknown) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  });
}

export function mockFetchError(status: number, error: string) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve({ error }),
  });
}

export function mockFetchUnauthorized() {
  mockFetchError(401, "Authentication required");
}
