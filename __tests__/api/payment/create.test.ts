import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, createMockRequest } from "../../helpers/mock-supabase";

// --- Mocks ---
vi.mock("@/lib/supabase/api", () => ({
  getApiAuth: vi.fn(),
  unauthorized: vi.fn(() => {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIP: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/payjp", () => ({
  getPayjpClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

import { POST } from "@/app/api/payment/create/route";
import { getApiAuth } from "@/lib/supabase/api";
import { checkRateLimit } from "@/lib/rate-limit";

const BASE_URL = "http://localhost:3000/api/payment/create";

describe("POST /api/payment/create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, remaining: 4 });
    vi.mocked(getApiAuth).mockResolvedValue(null);

    const req = createMockRequest(BASE_URL, {
      method: "POST",
      body: { token: "tok_test" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limit exceeded", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, remaining: 0 });

    const req = createMockRequest(BASE_URL, {
      method: "POST",
      body: { token: "tok_test" },
    });
    const res = await POST(req);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toContain("リクエストが多すぎます");
  });

  it("returns 400 when token is missing", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, remaining: 4 });
    vi.mocked(getApiAuth).mockResolvedValue({
      supabase: createMockSupabase(),
      userId: "user-1",
    } as any);

    const req = createMockRequest(BASE_URL, {
      method: "POST",
      body: {},
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("token required");
  });

  it("returns 400 when token is not a string", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, remaining: 4 });
    vi.mocked(getApiAuth).mockResolvedValue({
      supabase: createMockSupabase(),
      userId: "user-1",
    } as any);

    const req = createMockRequest(BASE_URL, {
      method: "POST",
      body: { token: 12345 },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("token required");
  });

  it("returns 400 when token exceeds max length", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, remaining: 4 });
    vi.mocked(getApiAuth).mockResolvedValue({
      supabase: createMockSupabase(),
      userId: "user-1",
    } as any);

    const req = createMockRequest(BASE_URL, {
      method: "POST",
      body: { token: "x".repeat(101) },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("token required");
  });

  it("returns 400 when coupon_code is invalid type", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, remaining: 4 });
    vi.mocked(getApiAuth).mockResolvedValue({
      supabase: createMockSupabase(),
      userId: "user-1",
    } as any);

    const req = createMockRequest(BASE_URL, {
      method: "POST",
      body: { token: "tok_test", coupon_code: 12345 },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid coupon code");
  });
});
