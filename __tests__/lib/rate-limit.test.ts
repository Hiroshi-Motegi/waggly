import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: vi.fn(() => ({})) },
}));

vi.mock("@upstash/ratelimit", () => {
  const mockLimit = vi.fn();
  return {
    Ratelimit: vi.fn(() => ({ limit: mockLimit })),
    __mockLimit: mockLimit,
  };
});

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns allowed:true when under limit (in-memory fallback)", async () => {
    // Without UPSTASH env vars, should use in-memory
    const { checkRateLimit } = await import("@/lib/rate-limit");
    const result = await checkRateLimit("test-key-1", 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("returns allowed:false when over limit (in-memory fallback)", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    // Hit the limit
    for (let i = 0; i < 3; i++) {
      await checkRateLimit("test-key-2", 3, 60_000);
    }
    const result = await checkRateLimit("test-key-2", 3, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});

describe("getClientIP", () => {
  it("returns x-real-ip as priority", async () => {
    const { getClientIP } = await import("@/lib/rate-limit");
    const req = new Request("http://localhost", {
      headers: { "x-real-ip": "9.8.7.6", "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIP(req)).toBe("9.8.7.6");
  });

  it("returns x-forwarded-for last entry when no x-real-ip", async () => {
    const { getClientIP } = await import("@/lib/rate-limit");
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIP(req)).toBe("5.6.7.8");
  });

  it("returns unknown when no IP headers", async () => {
    const { getClientIP } = await import("@/lib/rate-limit");
    const req = new Request("http://localhost");
    expect(getClientIP(req)).toBe("unknown");
  });
});
