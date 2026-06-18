import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, createMockRequest } from "../../helpers/mock-supabase";

// --- Mocks ---
vi.mock("@/lib/supabase/api", () => ({
  getApiAuth: vi.fn().mockResolvedValue(null),
  getAdminClient: vi.fn(() => createMockSupabase()),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIP: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/turnstile", () => ({
  verifyTurnstile: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/send-admin-email", () => ({
  sendAdminEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/email-templates", () => ({
  buildInquiryEmail: vi.fn().mockReturnValue({
    subject: "Test",
    html: "<p>Test</p>",
  }),
}));

import { POST } from "@/app/api/contact/route";
import { checkRateLimit } from "@/lib/rate-limit";

const BASE_URL = "http://localhost:3000/api/contact";

describe("POST /api/contact - rate limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 429 when rate limit is exceeded", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, remaining: 0 });

    const req = createMockRequest(BASE_URL, {
      method: "POST",
      body: {
        email: "test@example.com",
        category: "bug",
        message: "Something broke",
        turnstileToken: "valid-token",
      },
    });

    // NextRequest needs nextUrl, so we use a plain Request
    // The route accepts NextRequest but Request is compatible for our test
    const res = await POST(req as any);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toContain("送信回数の上限");
  });

  it("proceeds past rate limit when allowed", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, remaining: 2 });

    const { getAdminClient } = await import("@/lib/supabase/api");
    const mockSupa = createMockSupabase();
    mockSupa.queueResult("inquiries", { data: null, error: null });
    vi.mocked(getAdminClient as any).mockReturnValue(mockSupa);

    const req = createMockRequest(BASE_URL, {
      method: "POST",
      body: {
        email: "test@example.com",
        category: "bug",
        message: "Something broke",
        turnstileToken: "valid-token",
      },
    });

    const res = await POST(req as any);
    // Should not be 429 (rate limit passes), should proceed to success
    expect(res.status).not.toBe(429);
  });
});
