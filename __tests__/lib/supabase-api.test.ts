import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "../helpers/mock-supabase";

// --- Mocks ---
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const mockAdmin = createMockSupabase();
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockAdmin),
}));

import { getApiAuth } from "@/lib/supabase/api";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

describe("getApiAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure env vars are set for getAdminClient()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    // Ensure we're not in dev mode
    delete process.env.NEXT_PUBLIC_DEV_SKIP_AUTH;
  });

  it("returns { supabase, userId } when Bearer token is valid and user_providers exists", async () => {
    const mockHeadersList = {
      get: vi.fn().mockReturnValue("Bearer valid-token"),
    };
    vi.mocked(headers).mockResolvedValue(mockHeadersList as any);

    // auth.getUser(token) returns a valid user
    mockAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: "auth-user-123" } },
      error: null,
    });

    // resolveUserId: user_providers query returns user_id
    mockAdmin.queueResult("user_providers", {
      data: { user_id: "app-user-456" },
      error: null,
    });

    const result = await getApiAuth();

    expect(result).not.toBeNull();
    expect(result!.userId).toBe("app-user-456");
    expect(result!.supabase).toBeDefined();
  });

  it("returns null when Bearer token is valid but no user_providers row", async () => {
    const mockHeadersList = {
      get: vi.fn().mockReturnValue("Bearer valid-token"),
    };
    vi.mocked(headers).mockResolvedValue(mockHeadersList as any);

    // auth.getUser(token) returns a valid user
    mockAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: "auth-user-no-provider" } },
      error: null,
    });

    // resolveUserId: user_providers query returns null
    mockAdmin.queueResult("user_providers", {
      data: null,
      error: null,
    });

    const result = await getApiAuth();

    expect(result).toBeNull();
  });

  it("returns { supabase, userId } for cookie session when user_providers exists", async () => {
    // No Bearer token
    const mockHeadersList = {
      get: vi.fn().mockReturnValue(null),
    };
    vi.mocked(headers).mockResolvedValue(mockHeadersList as any);

    // Cookie-based supabase client
    const mockCookieSupabase = createMockSupabase();
    mockCookieSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "auth-user-cookie" } },
    });
    vi.mocked(createClient).mockResolvedValue(mockCookieSupabase);

    // resolveUserId: user_providers query returns user_id
    mockAdmin.queueResult("user_providers", {
      data: { user_id: "app-user-789" },
      error: null,
    });

    const result = await getApiAuth();

    expect(result).not.toBeNull();
    expect(result!.userId).toBe("app-user-789");
    expect(result!.supabase).toBeDefined();
  });

  it("returns null for cookie session when no logged-in user", async () => {
    // No Bearer token
    const mockHeadersList = {
      get: vi.fn().mockReturnValue(null),
    };
    vi.mocked(headers).mockResolvedValue(mockHeadersList as any);

    // Cookie-based supabase client returns no user
    const mockCookieSupabase = createMockSupabase();
    mockCookieSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });
    vi.mocked(createClient).mockResolvedValue(mockCookieSupabase);

    const result = await getApiAuth();

    expect(result).toBeNull();
  });
});
