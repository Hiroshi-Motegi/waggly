import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, createMockRequest } from "../../helpers/mock-supabase";

// --- Mocks ---
vi.mock("@/lib/supabase/api", () => ({
  getApiAuth: vi.fn(),
  unauthorized: () =>
    Response.json({ error: "Unauthorized" }, { status: 401 }),
}));
vi.mock("@/lib/auth-helpers", () => ({
  getSupabaseAdmin: vi.fn(),
  verifyGoogleIdToken: vi.fn(),
  verifyLineAccessToken: vi.fn(),
  exchangeLineCode: vi.fn(),
  deleteUserData: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/user-data-summary", () => ({
  getUserDataSummary: vi.fn(),
}));
vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { POST, DELETE } from "@/app/api/auth/link-provider/route";
import { getApiAuth } from "@/lib/supabase/api";
import {
  getSupabaseAdmin,
  verifyGoogleIdToken,
  deleteUserData,
} from "@/lib/auth-helpers";
import { getUserDataSummary } from "@/lib/user-data-summary";
import { headers } from "next/headers";

const BASE_URL = "http://localhost:3000/api/auth/link-provider";

describe("POST /api/auth/link-provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getApiAuth).mockResolvedValue(null as any);
    const req = createMockRequest(BASE_URL, {
      method: "POST",
      body: { provider: "google", idToken: "tok" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("links new Google provider (no conflict) → { linked: true }", async () => {
    const supabase = createMockSupabase();
    vi.mocked(getApiAuth).mockResolvedValue({ userId: "user-1" } as any);
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);
    vi.mocked(verifyGoogleIdToken).mockResolvedValue({
      sub: "google-sub-1",
      email: "test@gmail.com",
    } as any);

    // Conflict check: no existing provider
    supabase.queueResult("user_providers", { data: null, error: null });
    // Insert new provider row
    supabase.queueResult("user_providers", { data: null, error: null });
    // Update users.google_email
    supabase.queueResult("users", { data: null, error: null });

    const req = createMockRequest(BASE_URL, {
      method: "POST",
      body: { provider: "google", idToken: "valid-token" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.linked).toBe(true);
    expect(json.alreadyLinked).toBeUndefined();
    expect(json.merged).toBeUndefined();
  });

  it("detects conflict and returns needsConfirm", async () => {
    const supabase = createMockSupabase();
    vi.mocked(getApiAuth).mockResolvedValue({ userId: "user-1" } as any);
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);
    vi.mocked(verifyGoogleIdToken).mockResolvedValue({
      sub: "google-sub-conflict",
      email: "other@gmail.com",
    } as any);

    // Conflict check: provider belongs to another user
    supabase.queueResult("user_providers", {
      data: { user_id: "other-user" },
      error: null,
    });

    vi.mocked(getUserDataSummary)
      .mockResolvedValueOnce({
        lastUpdated: "2026-06-10T12:00:00Z",
        counts: { clubs: 3, practices: 1, accessories: 2 },
      } as any)
      .mockResolvedValueOnce({
        lastUpdated: "2026-06-09T08:00:00Z",
        counts: { clubs: 5, practices: 0, accessories: 0 },
      } as any);

    const req = createMockRequest(BASE_URL, {
      method: "POST",
      body: { provider: "google", idToken: "valid-token" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.needsConfirm).toBe(true);
    expect(json.providerId).toBe("google-sub-conflict");
    expect(json.currentAccount.id).toBe("user-1");
    expect(json.existingAccount.id).toBe("other-user");
  });

  it("executes merge when confirmMerge is true", async () => {
    const supabase = createMockSupabase();
    vi.mocked(getApiAuth).mockResolvedValue({ userId: "user-1" } as any);
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    // 1) Conflict check → provider belongs to other-user
    supabase.queueResult("user_providers", {
      data: { user_id: "other-user" },
      error: null,
    });
    // 2) Current provider auth_user_id lookup
    supabase.queueResult("user_providers", {
      data: { auth_user_id: "auth-1" },
      error: null,
    });
    // 3) Loser's providers list (deleteId = "other-user" since keepAccountId = "user-1")
    supabase.queueResult("user_providers", {
      data: [
        { id: "lp-1", provider: "google", provider_sub: "google-sub-conflict" },
      ],
      error: null,
    });
    // 4) Dup check for lp-1 → no duplicate
    supabase.queueResult("user_providers", { data: null, error: null });
    // 5) Move provider (update user_id)
    supabase.queueResult("user_providers", { data: null, error: null });
    // 6) Session provider check → session exists
    supabase.queueResult("user_providers", {
      data: { id: "sp-1" },
      error: null,
    });
    // 7) deleteUserData is mocked separately
    // 8) Delete loser's remaining user_providers
    supabase.queueResult("user_providers", { data: null, error: null });
    // 9) Delete loser's users row
    supabase.queueResult("users", { data: null, error: null });

    const req = createMockRequest(BASE_URL, {
      method: "POST",
      body: {
        provider: "google",
        confirmMerge: true,
        providerSub: "google-sub-conflict",
        keepAccountId: "user-1",
      },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.linked).toBe(true);
    expect(json.merged).toBe(true);
    expect(json.mergedInto).toBe("user-1");
    expect(vi.mocked(deleteUserData)).toHaveBeenCalledWith(
      supabase,
      "other-user"
    );
  });

  it("returns alreadyLinked when same user already has this provider", async () => {
    const supabase = createMockSupabase();
    vi.mocked(getApiAuth).mockResolvedValue({ userId: "user-1" } as any);
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);
    vi.mocked(verifyGoogleIdToken).mockResolvedValue({
      sub: "google-sub-existing",
      email: "me@gmail.com",
    } as any);

    // Conflict check: same user
    supabase.queueResult("user_providers", {
      data: { user_id: "user-1" },
      error: null,
    });

    const req = createMockRequest(BASE_URL, {
      method: "POST",
      body: { provider: "google", idToken: "valid-token" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.linked).toBe(true);
    expect(json.alreadyLinked).toBe(true);
  });
});

describe("DELETE /api/auth/link-provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getApiAuth).mockResolvedValue(null as any);
    const req = createMockRequest(BASE_URL, {
      method: "DELETE",
      body: { provider: "line" },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("unlinks provider when 2+ providers exist and not current session", async () => {
    const supabase = createMockSupabase();
    vi.mocked(getApiAuth).mockResolvedValue({ userId: "user-1" } as any);
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    // Provider list: 2 providers
    supabase.queueResult("user_providers", {
      data: [
        { id: "p-1", provider: "google", auth_user_id: "auth-google" },
        { id: "p-2", provider: "line", auth_user_id: "auth-line" },
      ],
      error: null,
    });

    // Mock next/headers to return Bearer token
    const mockHeadersList = {
      get: vi.fn().mockReturnValue("Bearer test-token"),
    };
    vi.mocked(headers).mockResolvedValue(mockHeadersList as any);

    // supabaseAdmin.auth.getUser(token) → current session is google (auth-google)
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "auth-google" } },
    });

    // Delete the LINE provider row (not current session)
    supabase.queueResult("user_providers", { data: null, error: null });
    // No google_email clear needed for LINE unlink

    const req = createMockRequest(BASE_URL, {
      method: "DELETE",
      body: { provider: "line" },
    });
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.unlinked).toBe(true);
    expect(json.needsRelogin).toBe(false);
  });

  it("returns 400 when only 1 provider remains", async () => {
    const supabase = createMockSupabase();
    vi.mocked(getApiAuth).mockResolvedValue({ userId: "user-1" } as any);
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    // Provider list: only 1 provider
    supabase.queueResult("user_providers", {
      data: [{ id: "p-1", provider: "google", auth_user_id: "auth-google" }],
      error: null,
    });

    const req = createMockRequest(BASE_URL, {
      method: "DELETE",
      body: { provider: "google" },
    });
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("最低1つのログイン方法が必要です");
  });

  it("returns 400 when trying to unlink currently logged-in provider", async () => {
    const supabase = createMockSupabase();
    vi.mocked(getApiAuth).mockResolvedValue({ userId: "user-1" } as any);
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase);

    // Provider list: 2 providers
    supabase.queueResult("user_providers", {
      data: [
        { id: "p-1", provider: "google", auth_user_id: "auth-google" },
        { id: "p-2", provider: "line", auth_user_id: "auth-line" },
      ],
      error: null,
    });

    // Mock next/headers to return Bearer token
    const mockHeadersList = {
      get: vi.fn().mockReturnValue("Bearer test-token"),
    };
    vi.mocked(headers).mockResolvedValue(mockHeadersList as any);

    // supabaseAdmin.auth.getUser(token) → current session is google (auth-google)
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "auth-google" } },
    });

    const req = createMockRequest(BASE_URL, {
      method: "DELETE",
      body: { provider: "google" },
    });
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("ログイン中のため解除できません");
  });
});
