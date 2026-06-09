import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
  },
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

import { Capacitor } from "@capacitor/core";
import { createClient } from "@/lib/supabase/client";

describe("apiUrl", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns path as-is on web", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    const { apiUrl } = await import("@/lib/api-client");
    expect(apiUrl("/api/clubs")).toBe("/api/clubs");
  });

  it("prepends production URL on native", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    const { apiUrl } = await import("@/lib/api-client");
    expect(apiUrl("/api/clubs")).toBe("https://waggly.jp/api/clubs");
  });
});

describe("apiFetch", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockClear();
    globalThis.fetch = mockFetch;
    mockFetch.mockResolvedValue(new Response("{}"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls fetch without auth header on web", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    const { apiFetch } = await import("@/lib/api-client");

    await apiFetch("/api/clubs");

    expect(mockFetch).toHaveBeenCalledWith("/api/clubs", undefined);
  });

  it("attaches Authorization header on native when session exists", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    const mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "test-jwt-token" } },
        }),
      },
    };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    const { apiFetch } = await import("@/lib/api-client");

    await apiFetch("/api/clubs");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://waggly.jp/api/clubs",
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );

    const calledHeaders = mockFetch.mock.calls[0][1].headers;
    expect(calledHeaders.get("Authorization")).toBe("Bearer test-jwt-token");
  });

  it("calls fetch without auth header on native when no session", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    const mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
        }),
      },
    };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    const { apiFetch } = await import("@/lib/api-client");

    await apiFetch("/api/clubs");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://waggly.jp/api/clubs",
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );

    const calledHeaders = mockFetch.mock.calls[0][1].headers;
    expect(calledHeaders.has("Authorization")).toBe(false);
  });

  it("preserves existing headers from caller", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    const mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "jwt" } },
        }),
      },
    };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    const { apiFetch } = await import("@/lib/api-client");

    await apiFetch("/api/clubs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });

    const calledHeaders = mockFetch.mock.calls[0][1].headers;
    expect(calledHeaders.get("Content-Type")).toBe("application/json");
    expect(calledHeaders.get("Authorization")).toBe("Bearer jwt");
  });
});
