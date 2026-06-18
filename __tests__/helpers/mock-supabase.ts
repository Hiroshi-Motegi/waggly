// __tests__/helpers/mock-supabase.ts
import { vi } from "vitest";

/**
 * Create a chainable Supabase query mock.
 * Terminal methods (single, maybeSingle) resolve to `result`.
 * The chain itself is thenable for list/count queries.
 */
export function mockChain(result: any = { data: null, error: null }) {
  const chain: any = {};
  const methods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "in", "order", "limit", "is",
    "lt", "gt", "lte", "gte", "not", "like", "ilike", "or", "filter",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: any, reject?: any) =>
    Promise.resolve(result).then(resolve, reject);
  chain.catch = (reject: any) => Promise.resolve(result).catch(reject);
  return chain;
}

/**
 * Create a mock Supabase client with per-table response queues.
 * Call queueResult(table, result) to enqueue expected responses.
 * Results are consumed FIFO per table.
 */
export function createMockSupabase() {
  const queues = new Map<string, any[]>();

  function queueResult(table: string, result: any) {
    if (!queues.has(table)) queues.set(table, []);
    queues.get(table)!.push(result);
  }

  const supabase: any = {
    from: vi.fn((table: string) => {
      const q = queues.get(table) ?? [];
      const result = q.shift() ?? { data: null, error: null };
      return mockChain(result);
    }),
    auth: {
      admin: { getUserById: vi.fn() },
      getUser: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    queueResult,
  };

  return supabase;
}

/**
 * Create a mock NextRequest with optional JSON body.
 */
export function createMockRequest(
  url: string,
  options: { method?: string; body?: any; headers?: Record<string, string> } = {}
) {
  const { method = "GET", body, headers: extraHeaders } = options;
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json", ...extraHeaders };
  } else if (extraHeaders) {
    init.headers = extraHeaders;
  }
  // Use standard Request — route handlers only use .json() which is standard
  return new Request(url, init) as any;
}
