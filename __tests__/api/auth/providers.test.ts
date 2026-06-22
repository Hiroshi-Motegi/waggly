import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "../../helpers/mock-supabase";

// --- Mocks ---
vi.mock("@/lib/supabase/api", () => ({
  getApiAuth: vi.fn(),
  unauthorized: () =>
    Response.json({ error: "Unauthorized" }, { status: 401 }),
}));
vi.mock("@/lib/auth-helpers", () => ({
  getSupabaseAdmin: vi.fn(),
}));
vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { GET } from "@/app/api/auth/providers/route";
import { getApiAuth } from "@/lib/supabase/api";
import { getSupabaseAdmin } from "@/lib/auth-helpers";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

describe("GET /api/auth/providers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getApiAuth).mockResolvedValue(null as any);

    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns provider list with is_current flag (Bearer token path)", async () => {
    const supabase = createMockSupabase();
    vi.mocked(getApiAuth).mockResolvedValue({
      supabase,
      userId: "user-1",
    } as any);
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    // user_providers query returns two providers
    supabase.queueResult("user_providers", {
      data: [
        {
          provider: "google",
          provider_email: "test@gmail.com",
          auth_user_id: "auth-google-1",
        },
        {
          provider: "line",
          provider_email: null,
          auth_user_id: "auth-line-1",
        },
      ],
      error: null,
    });

    // Mock headers to return Bearer token
    const mockHeadersList = {
      get: vi.fn().mockReturnValue("Bearer test-token"),
    };
    vi.mocked(headers).mockResolvedValue(mockHeadersList as any);

    // supabaseAdmin.auth.getUser(token) returns the google auth user
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "auth-google-1" } },
    });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveLength(2);
    expect(json[0]).toEqual({
      provider: "google",
      email: "test@gmail.com",
      is_current: true,
    });
    expect(json[1]).toEqual({
      provider: "line",
      email: null,
      is_current: false,
    });
  });

  it("returns provider list with is_current flag (cookie session path)", async () => {
    const supabase = createMockSupabase();
    vi.mocked(getApiAuth).mockResolvedValue({
      supabase,
      userId: "user-1",
    } as any);
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    // user_providers query returns one provider
    supabase.queueResult("user_providers", {
      data: [
        {
          provider: "google",
          provider_email: "test@gmail.com",
          auth_user_id: "auth-google-1",
        },
      ],
      error: null,
    });

    // Mock headers to return no Bearer token (cookie path)
    const mockHeadersList = {
      get: vi.fn().mockReturnValue(null),
    };
    vi.mocked(headers).mockResolvedValue(mockHeadersList as any);

    // Mock the cookie-based supabase client
    const mockCookieSupabase = createMockSupabase();
    mockCookieSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "auth-google-1" } },
    });
    vi.mocked(createClient).mockResolvedValue(mockCookieSupabase);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveLength(1);
    expect(json[0]).toEqual({
      provider: "google",
      email: "test@gmail.com",
      is_current: true,
    });
  });
});
