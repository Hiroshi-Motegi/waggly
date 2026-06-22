import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, createMockRequest } from "../../helpers/mock-supabase";

// --- Mocks ---
vi.mock("@/lib/supabase/api", () => ({
  getApiAuthWithAuthUserId: vi.fn(),
}));
vi.mock("@/lib/auth-helpers", () => ({
  extractProviderInfo: vi.fn(),
  deleteUserData: vi.fn().mockResolvedValue(undefined),
  uploadAvatarFromUrl: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/user-data-summary", () => ({
  getUserDataSummary: vi.fn(),
}));
vi.mock("@/lib/insert-local-data", () => ({
  insertLocalData: vi.fn().mockResolvedValue(undefined),
}));

import { POST, PUT } from "@/app/api/auth/resolve-session/route";
import { getApiAuthWithAuthUserId } from "@/lib/supabase/api";
import { extractProviderInfo, deleteUserData } from "@/lib/auth-helpers";
import { getUserDataSummary } from "@/lib/user-data-summary";
import { insertLocalData } from "@/lib/insert-local-data";

const BASE_URL = "http://localhost:3000/api/auth/resolve-session";

const mockUser = {
  id: "user-1",
};

const mockAuthUserId = "auth-user-123";

function setupAuth(supabase: any, opts: { userId?: string } = {}) {
  vi.mocked(getApiAuthWithAuthUserId).mockResolvedValue({
    supabase,
    authUserId: mockAuthUserId,
    userId: opts.userId ?? null,
  } as any);
}

describe("POST /api/auth/resolve-session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getApiAuthWithAuthUserId).mockResolvedValue(null);
    const req = createMockRequest(BASE_URL, { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  describe("Case 1: found by auth_user_id", () => {
    it("returns user with conflict:false when no local data", async () => {
      const supabase = createMockSupabase();
      setupAuth(supabase, { userId: "user-1" });
      supabase.queueResult("users", { data: mockUser, error: null });

      const req = createMockRequest(BASE_URL, { method: "POST" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.user).toEqual(mockUser);
      expect(json.conflict).toBe(false);
    });

    it("returns conflict:false when local timestamps match server", async () => {
      const supabase = createMockSupabase();
      setupAuth(supabase, { userId: "user-1" });
      supabase.queueResult("users", { data: mockUser, error: null });

      const timestamp = "2026-06-10T12:00:00Z";
      vi.mocked(getUserDataSummary).mockResolvedValue({
        lastUpdated: timestamp,
        counts: { clubs: 3, practices: 1, accessories: 2 },
      } as any);

      const req = createMockRequest(BASE_URL, {
        method: "POST",
        body: { hasLocalData: true, localLastUpdated: timestamp },
      });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.conflict).toBe(false);
      expect(json.user).toEqual(mockUser);
    });

    it("returns conflict:true when timestamps differ", async () => {
      const supabase = createMockSupabase();
      setupAuth(supabase, { userId: "user-1" });
      supabase.queueResult("users", { data: mockUser, error: null });

      vi.mocked(getUserDataSummary).mockResolvedValue({
        lastUpdated: "2026-06-10T14:00:00Z",
        counts: { clubs: 3, practices: 1, accessories: 2 },
      } as any);

      const req = createMockRequest(BASE_URL, {
        method: "POST",
        body: { hasLocalData: true, localLastUpdated: "2026-06-09T10:00:00Z" },
      });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.conflict).toBe(true);
      expect(json.existingUser.userId).toBe("user-1");
      expect(json.provider).toBe("returning");
      expect(json.authUserId).toBe(mockAuthUserId);
    });

    it("returns uploadLocal:true when server has no data but local does", async () => {
      const supabase = createMockSupabase();
      setupAuth(supabase, { userId: "user-1" });
      supabase.queueResult("users", { data: mockUser, error: null });

      vi.mocked(getUserDataSummary).mockResolvedValue({
        lastUpdated: null,
        counts: { clubs: 0, practices: 0, accessories: 0 },
      } as any);

      const req = createMockRequest(BASE_URL, {
        method: "POST",
        body: { hasLocalData: true },
      });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.conflict).toBe(false);
      expect(json.uploadLocal).toBe(true);
      expect(json.user).toEqual(mockUser);
    });
  });

  describe("Case 2: found by provider_sub", () => {
    function setupCase2(supabase: any, opts: { hasLocalData?: boolean } = {}) {
      // No userId from auth
      setupAuth(supabase);
      // users query returns null (no user found by auth_user_id path — userId is null so this is skipped)
      // auth.admin.getUserById returns an auth user
      supabase.auth.admin.getUserById.mockResolvedValue({
        data: {
          user: {
            app_metadata: { provider: "google" },
            user_metadata: { sub: "google-456", email: "test@gmail.com" },
          },
        },
      });
      vi.mocked(extractProviderInfo).mockReturnValue({
        provider: "google",
        providerSub: "google-456",
      });
      // user_providers query finds existing provider
      supabase.queueResult("user_providers", {
        data: { user_id: "existing-user-99" },
        error: null,
      });
    }

    it("links by provider_sub and returns user when no local data", async () => {
      const supabase = createMockSupabase();
      setupCase2(supabase);
      // After update of user_providers, the route does another from("user_providers") for update
      supabase.queueResult("user_providers", { data: null, error: null });
      // Then fetches user from "users"
      supabase.queueResult("users", { data: { ...mockUser, id: "existing-user-99" }, error: null });

      const req = createMockRequest(BASE_URL, { method: "POST" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.conflict).toBe(false);
      expect(json.user.id).toBe("existing-user-99");
    });

    it("returns conflict when found by provider_sub with local data", async () => {
      const supabase = createMockSupabase();
      setupCase2(supabase);

      vi.mocked(getUserDataSummary).mockResolvedValue({
        lastUpdated: "2026-06-10T12:00:00Z",
        counts: { clubs: 5, practices: 2, accessories: 1 },
      } as any);

      const req = createMockRequest(BASE_URL, {
        method: "POST",
        body: { hasLocalData: true },
      });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.conflict).toBe(true);
      expect(json.existingUser.userId).toBe("existing-user-99");
      expect(json.provider).toBe("google");
      expect(json.providerSub).toBe("google-456");
    });
  });

  describe("Case 3: new user creation", () => {
    it("creates new user when nobody found", async () => {
      const supabase = createMockSupabase();
      setupAuth(supabase);

      supabase.auth.admin.getUserById.mockResolvedValue({
        data: {
          user: {
            app_metadata: { provider: "google" },
            user_metadata: {
              sub: "google-new",
              email: "newuser@gmail.com",
              full_name: "New User",
            },
            email: "newuser@gmail.com",
          },
        },
      });
      vi.mocked(extractProviderInfo).mockReturnValue({
        provider: "google",
        providerSub: "google-new",
      });

      // user_providers query returns nothing (no existing provider)
      supabase.queueResult("user_providers", { data: null, error: null });

      // users insert returns new user
      const newUser = {
        id: "new-user-1",
      };
      supabase.queueResult("users", { data: newUser, error: null });

      // profiles insert
      supabase.queueResult("profiles", { data: null, error: null });

      // user_providers insert (for linking)
      supabase.queueResult("user_providers", { data: null, error: null });

      const req = createMockRequest(BASE_URL, { method: "POST" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.user).toEqual(newUser);
      expect(json.conflict).toBe(false);
      expect(json.isNew).toBe(true);
    });
  });
});

describe("PUT /api/auth/resolve-session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getApiAuthWithAuthUserId).mockResolvedValue(null);
    const req = createMockRequest(BASE_URL, {
      method: "PUT",
      body: { choice: "server", existingUserId: "user-1" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    const supabase = createMockSupabase();
    setupAuth(supabase);

    const req = createMockRequest(BASE_URL, {
      method: "PUT",
      body: {},
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Missing required fields");
  });

  it("deletes server data and inserts local data when choice is 'local'", async () => {
    const supabase = createMockSupabase();
    setupAuth(supabase);

    const localData = { clubs: [{ id: "c1", name: "Driver" }] };

    // ownership check (user_providers)
    supabase.queueResult("user_providers", { data: { user_id: "user-1" }, error: null });
    // user_providers update
    supabase.queueResult("user_providers", { data: null, error: null });
    // users select at end
    supabase.queueResult("users", { data: mockUser, error: null });

    const req = createMockRequest(BASE_URL, {
      method: "PUT",
      body: {
        choice: "local",
        existingUserId: "user-1",
        provider: "google",
        providerSub: "google-456",
        localData,
      },
    });
    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.conflict).toBe(false);
    expect(json.user).toEqual(mockUser);
    expect(vi.mocked(deleteUserData)).toHaveBeenCalledWith(supabase, "user-1");
    expect(vi.mocked(insertLocalData)).toHaveBeenCalledWith(supabase, "user-1", localData);
  });

  it("does not delete or insert data when choice is 'server'", async () => {
    const supabase = createMockSupabase();
    setupAuth(supabase);

    // ownership check (user_providers)
    supabase.queueResult("user_providers", { data: { user_id: "user-1" }, error: null });
    // user_providers update
    supabase.queueResult("user_providers", { data: null, error: null });
    // users select at end
    supabase.queueResult("users", { data: mockUser, error: null });

    const req = createMockRequest(BASE_URL, {
      method: "PUT",
      body: {
        choice: "server",
        existingUserId: "user-1",
        provider: "google",
        providerSub: "google-456",
      },
    });
    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.conflict).toBe(false);
    expect(vi.mocked(deleteUserData)).not.toHaveBeenCalled();
    expect(vi.mocked(insertLocalData)).not.toHaveBeenCalled();
  });

  it("skips provider update when provider/providerSub not provided", async () => {
    const supabase = createMockSupabase();
    setupAuth(supabase);

    // ownership check (user_providers)
    supabase.queueResult("user_providers", { data: { user_id: "user-1" }, error: null });
    // users select at end
    supabase.queueResult("users", { data: mockUser, error: null });

    const req = createMockRequest(BASE_URL, {
      method: "PUT",
      body: {
        choice: "server",
        existingUserId: "user-1",
      },
    });
    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.user).toEqual(mockUser);
    // from() should be called for user_providers (ownership check) and users select
    // but NOT for user_providers update (since provider/providerSub not provided)
    const fromCalls = supabase.from.mock.calls.map((c: any) => c[0]);
    expect(fromCalls.filter((t: string) => t === "user_providers").length).toBe(1); // ownership check only
  });
});
