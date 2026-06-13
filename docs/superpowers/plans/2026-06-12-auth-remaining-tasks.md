# Auth Remaining Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up debug code, add Vitest unit tests for auth API routes, and add loading overlays to the settings page

**Architecture:** Three sequential changes: (A) remove debug alerts exposing internal error details, (B) add comprehensive Vitest tests for all auth API routes with mocked Supabase, (C) replace fragmented loading states with a unified ProcessingOverlay

**Tech Stack:** Next.js, Vitest, TypeScript, Supabase, Lucide React (Loader2)

---

### Task 1: Clean up debug alerts

**Files:**
- Modify: `src/app/settings/page.tsx:270,281,331,342,636`

- [ ] **Step 1: Search for remaining debug code**

Run: `grep -rn "サインインエラー\|サインイン例外\|userId=" src/app/settings/page.tsx`

Expected: matches on lines 270, 281, 331, 342, 636

- [ ] **Step 2: Replace debug alerts with generic user messages**

In `src/app/settings/page.tsx`, make these 5 edits:

**Line 270** — Google sign-in error (exposes raw error detail):
```tsx
// Before:
alert(`サインインエラー: ${result.error}`);
// After:
alert("サインインに失敗しました");
```

**Line 281** — Google sign-in exception (exposes raw exception message):
```tsx
// Before:
alert(`サインイン例外: ${e.message}`);
// After:
alert("サインインに失敗しました");
```

**Line 331** — LINE sign-in error (same pattern):
```tsx
// Before:
alert(`サインインエラー: ${result.error}`);
// After:
alert("サインインに失敗しました");
```

**Line 342** — LINE sign-in exception (same pattern):
```tsx
// Before:
alert(`サインイン例外: ${e.message}`);
// After:
alert("サインインに失敗しました");
```

**Line 636** — LINE accessToken alert (exposes userId):
```tsx
// Before:
alert(`LINE accessToken が取得できませんでした。userId=${result.userId}`);
// After:
alert("LINE accessToken が取得できませんでした");
```

- [ ] **Step 3: Verify no debug code remains**

Run: `grep -rn "サインインエラー\|サインイン例外\|userId=" src/app/settings/page.tsx`

Expected: no matches

- [ ] **Step 4: Commit**

```bash
git add src/app/settings/page.tsx
git commit -m "fix(auth): replace debug alerts with generic user messages

Remove internal error details from user-facing alerts in settings page.
Replaces サインインエラー/例外 alerts and removes userId from LINE alert."
```

---

### Task 2: Create Supabase mock helper for tests

**Files:**
- Create: `__tests__/helpers/mock-supabase.ts`

- [ ] **Step 1: Create the shared mock helper**

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit __tests__/helpers/mock-supabase.ts 2>&1 | head -5`

Expected: no errors (or only unrelated warnings)

- [ ] **Step 3: Commit**

```bash
git add __tests__/helpers/mock-supabase.ts
git commit -m "test: add shared Supabase mock helper for auth API tests"
```

---

### Task 3: Write resolve-session tests

**Files:**
- Create: `__tests__/api/auth/resolve-session.test.ts`

- [ ] **Step 1: Create test file with all cases**

```typescript
// __tests__/api/auth/resolve-session.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, createMockRequest } from "../../helpers/mock-supabase";

// Mock dependencies before importing route handlers
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

const URL = "http://localhost/api/auth/resolve-session";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/resolve-session", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getApiAuthWithAuthUserId).mockResolvedValue(null);

    const req = createMockRequest(URL, { method: "POST" });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("Case 1: returns user when found by auth_user_id (no local data)", async () => {
    const mockUser = { id: "user-1", display_name: "Test User" };
    const mockSb = createMockSupabase();
    mockSb.queueResult("users", { data: mockUser, error: null });

    vi.mocked(getApiAuthWithAuthUserId).mockResolvedValue({
      supabase: mockSb,
      authUserId: "auth-1",
      userId: "user-1",
    });

    const req = createMockRequest(URL, { method: "POST" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ user: mockUser, conflict: false });
  });

  it("Case 1: returns conflict:false when local timestamps match server", async () => {
    const mockUser = { id: "user-1", display_name: "Test User" };
    const mockSb = createMockSupabase();
    mockSb.queueResult("users", { data: mockUser, error: null });

    vi.mocked(getApiAuthWithAuthUserId).mockResolvedValue({
      supabase: mockSb,
      authUserId: "auth-1",
      userId: "user-1",
    });
    vi.mocked(getUserDataSummary).mockResolvedValue({
      lastUpdated: "2026-06-01T00:00:00Z",
      counts: { clubs: 2, practices: 3, accessories: 1 },
    });

    const req = createMockRequest(URL, {
      method: "POST",
      body: { hasLocalData: true, localLastUpdated: "2026-06-01T00:00:00Z" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ user: mockUser, conflict: false });
  });

  it("Case 1: returns conflict:true when local timestamps differ from server", async () => {
    const mockUser = { id: "user-1", display_name: "Test User" };
    const mockSb = createMockSupabase();
    mockSb.queueResult("users", { data: mockUser, error: null });

    vi.mocked(getApiAuthWithAuthUserId).mockResolvedValue({
      supabase: mockSb,
      authUserId: "auth-1",
      userId: "user-1",
    });
    vi.mocked(getUserDataSummary).mockResolvedValue({
      lastUpdated: "2026-06-02T00:00:00Z",
      counts: { clubs: 2, practices: 3, accessories: 1 },
    });

    const req = createMockRequest(URL, {
      method: "POST",
      body: { hasLocalData: true, localLastUpdated: "2026-06-01T00:00:00Z" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.conflict).toBe(true);
    expect(json.existingUser.userId).toBe("user-1");
    expect(json.existingUser.counts).toEqual({ clubs: 2, practices: 3, accessories: 1 });
    expect(json.provider).toBe("returning");
  });

  it("Case 1: returns uploadLocal:true when server has no data", async () => {
    const mockUser = { id: "user-1", display_name: "Test User" };
    const mockSb = createMockSupabase();
    mockSb.queueResult("users", { data: mockUser, error: null });

    vi.mocked(getApiAuthWithAuthUserId).mockResolvedValue({
      supabase: mockSb,
      authUserId: "auth-1",
      userId: "user-1",
    });
    vi.mocked(getUserDataSummary).mockResolvedValue({
      lastUpdated: null,
      counts: { clubs: 0, practices: 0, accessories: 0 },
    });

    const req = createMockRequest(URL, {
      method: "POST",
      body: { hasLocalData: true, localLastUpdated: "2026-06-01T00:00:00Z" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.user).toEqual(mockUser);
    expect(json.uploadLocal).toBe(true);
    expect(json.conflict).toBe(false);
  });

  it("Case 2: links by provider_sub when auth_user_id not found (no local data)", async () => {
    const mockUser = { id: "user-2", display_name: "Existing" };
    const mockSb = createMockSupabase();
    // user_providers: find existing by provider_sub
    mockSb.queueResult("user_providers", { data: { user_id: "user-2" } });
    // user_providers: update auth_user_id (chain resolves)
    mockSb.queueResult("user_providers", { data: null, error: null });
    // users: fetch the linked user
    mockSb.queueResult("users", { data: mockUser, error: null });

    vi.mocked(getApiAuthWithAuthUserId).mockResolvedValue({
      supabase: mockSb,
      authUserId: "auth-new",
      userId: null,
    });
    mockSb.auth.admin.getUserById.mockResolvedValue({
      data: {
        user: {
          app_metadata: { provider: "google" },
          user_metadata: { sub: "google-123", email: "test@gmail.com" },
        },
      },
    });
    vi.mocked(extractProviderInfo).mockReturnValue({
      provider: "google",
      providerSub: "google-123",
      providerEmail: "test@gmail.com",
    });

    const req = createMockRequest(URL, { method: "POST" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.user).toEqual(mockUser);
    expect(json.conflict).toBe(false);
  });

  it("Case 2: returns conflict when found by provider_sub with local data", async () => {
    const mockSb = createMockSupabase();
    // user_providers: find existing by provider_sub
    mockSb.queueResult("user_providers", { data: { user_id: "user-2" } });

    vi.mocked(getApiAuthWithAuthUserId).mockResolvedValue({
      supabase: mockSb,
      authUserId: "auth-new",
      userId: null,
    });
    mockSb.auth.admin.getUserById.mockResolvedValue({
      data: {
        user: {
          app_metadata: { provider: "google" },
          user_metadata: { sub: "google-123", email: "test@gmail.com" },
        },
      },
    });
    vi.mocked(extractProviderInfo).mockReturnValue({
      provider: "google",
      providerSub: "google-123",
      providerEmail: "test@gmail.com",
    });
    vi.mocked(getUserDataSummary).mockResolvedValue({
      lastUpdated: "2026-06-01T00:00:00Z",
      counts: { clubs: 1, practices: 0, accessories: 0 },
    });

    const req = createMockRequest(URL, {
      method: "POST",
      body: { hasLocalData: true },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.conflict).toBe(true);
    expect(json.existingUser.userId).toBe("user-2");
    expect(json.provider).toBe("google");
    expect(json.providerSub).toBe("google-123");
  });

  it("Case 3: creates new user when nobody found", async () => {
    const newUser = { id: "user-new", display_name: "New User", avatar_url: null, google_email: "new@gmail.com" };
    const mockSb = createMockSupabase();
    // user_providers: no existing by provider_sub
    mockSb.queueResult("user_providers", { data: null });
    // users: insert new user
    mockSb.queueResult("users", { data: newUser, error: null });
    // user_providers: insert new provider
    mockSb.queueResult("user_providers", { data: null, error: null });

    vi.mocked(getApiAuthWithAuthUserId).mockResolvedValue({
      supabase: mockSb,
      authUserId: "auth-new",
      userId: null,
    });
    mockSb.auth.admin.getUserById.mockResolvedValue({
      data: {
        user: {
          app_metadata: { provider: "google" },
          user_metadata: { sub: "google-new", email: "new@gmail.com", full_name: "New User" },
          email: "new@gmail.com",
        },
      },
    });
    vi.mocked(extractProviderInfo).mockReturnValue({
      provider: "google",
      providerSub: "google-new",
      providerEmail: "new@gmail.com",
    });

    const req = createMockRequest(URL, { method: "POST" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.user.id).toBe("user-new");
    expect(json.isNew).toBe(true);
    expect(json.conflict).toBe(false);
  });
});

describe("PUT /api/auth/resolve-session", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getApiAuthWithAuthUserId).mockResolvedValue(null);

    const req = createMockRequest(URL, {
      method: "PUT",
      body: { choice: "server", existingUserId: "user-1" },
    });
    const res = await PUT(req);

    expect(res.status).toBe(401);
  });

  it("resolves conflict with local choice: deletes server data and inserts local", async () => {
    const mockUser = { id: "user-1", display_name: "Test" };
    const mockSb = createMockSupabase();
    // user_providers: update auth_user_id
    mockSb.queueResult("user_providers", { data: null, error: null });
    // users: fetch user after resolve
    mockSb.queueResult("users", { data: mockUser, error: null });

    vi.mocked(getApiAuthWithAuthUserId).mockResolvedValue({
      supabase: mockSb,
      authUserId: "auth-1",
      userId: null,
    });

    const localData = { clubs: [{ id: "c1", name: "Driver" }] };
    const req = createMockRequest(URL, {
      method: "PUT",
      body: {
        choice: "local",
        existingUserId: "user-1",
        provider: "google",
        providerSub: "google-123",
        localData,
      },
    });
    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.user).toEqual(mockUser);
    expect(json.conflict).toBe(false);
    expect(vi.mocked(deleteUserData)).toHaveBeenCalledWith(mockSb, "user-1");
    expect(vi.mocked(insertLocalData)).toHaveBeenCalledWith(mockSb, "user-1", localData);
  });

  it("resolves conflict with server choice: no data changes", async () => {
    const mockUser = { id: "user-1", display_name: "Test" };
    const mockSb = createMockSupabase();
    // user_providers: update auth_user_id
    mockSb.queueResult("user_providers", { data: null, error: null });
    // users: fetch user
    mockSb.queueResult("users", { data: mockUser, error: null });

    vi.mocked(getApiAuthWithAuthUserId).mockResolvedValue({
      supabase: mockSb,
      authUserId: "auth-1",
      userId: null,
    });

    const req = createMockRequest(URL, {
      method: "PUT",
      body: {
        choice: "server",
        existingUserId: "user-1",
        provider: "google",
        providerSub: "google-123",
      },
    });
    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.conflict).toBe(false);
    expect(vi.mocked(deleteUserData)).not.toHaveBeenCalled();
    expect(vi.mocked(insertLocalData)).not.toHaveBeenCalled();
  });

  it("skips provider update when provider/providerSub not provided (re-login conflict)", async () => {
    const mockUser = { id: "user-1", display_name: "Test" };
    const mockSb = createMockSupabase();
    // users: fetch user (no user_providers call since no provider)
    mockSb.queueResult("users", { data: mockUser, error: null });

    vi.mocked(getApiAuthWithAuthUserId).mockResolvedValue({
      supabase: mockSb,
      authUserId: "auth-1",
      userId: "user-1",
    });

    const req = createMockRequest(URL, {
      method: "PUT",
      body: {
        choice: "server",
        existingUserId: "user-1",
        // No provider or providerSub
      },
    });
    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.conflict).toBe(false);
    // from("user_providers") should NOT have been called
    const providerCalls = mockSb.from.mock.calls.filter(
      (c: any[]) => c[0] === "user_providers"
    );
    expect(providerCalls).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run __tests__/api/auth/resolve-session.test.ts`

Expected: all tests pass

- [ ] **Step 3: Fix any failures and re-run**

If any test fails, adjust mock setup to match actual route behavior and re-run.

- [ ] **Step 4: Commit**

```bash
git add __tests__/api/auth/resolve-session.test.ts
git commit -m "test(auth): add resolve-session API route tests

Tests POST (7 cases) and PUT (4 cases) covering:
- existing user lookup with/without local data
- conflict detection with timestamp comparison
- provider_sub fallback linking
- new user creation
- local/server conflict resolution"
```

---

### Task 4: Write link-provider tests

**Files:**
- Create: `__tests__/api/auth/link-provider.test.ts`

- [ ] **Step 1: Create test file with all cases**

```typescript
// __tests__/api/auth/link-provider.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, createMockRequest } from "../../helpers/mock-supabase";

vi.mock("@/lib/supabase/api", () => ({
  getApiAuth: vi.fn(),
  unauthorized: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
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
  verifyLineAccessToken,
  deleteUserData,
} from "@/lib/auth-helpers";
import { getUserDataSummary } from "@/lib/user-data-summary";
import { headers } from "next/headers";

const URL = "http://localhost/api/auth/link-provider";

let mockAdmin: any;

beforeEach(() => {
  vi.clearAllMocks();
  mockAdmin = createMockSupabase();
  vi.mocked(getSupabaseAdmin).mockReturnValue(mockAdmin);
});

describe("POST /api/auth/link-provider", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getApiAuth).mockResolvedValue(null);

    const req = createMockRequest(URL, {
      method: "POST",
      body: { provider: "google", idToken: "token" },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("links new Google provider (no conflict)", async () => {
    vi.mocked(getApiAuth).mockResolvedValue({ supabase: {}, userId: "user-1" });
    vi.mocked(verifyGoogleIdToken).mockResolvedValue({
      sub: "google-456",
      email: "new@gmail.com",
    });
    // user_providers: no existing provider with this sub
    mockAdmin.queueResult("user_providers", { data: null });
    // user_providers: insert new provider
    mockAdmin.queueResult("user_providers", { error: null });
    // users: update google_email
    mockAdmin.queueResult("users", { error: null });

    const req = createMockRequest(URL, {
      method: "POST",
      body: { provider: "google", idToken: "valid-token" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ linked: true });
  });

  it("detects conflict when provider_sub belongs to another user", async () => {
    vi.mocked(getApiAuth).mockResolvedValue({ supabase: {}, userId: "user-1" });
    vi.mocked(verifyGoogleIdToken).mockResolvedValue({
      sub: "google-789",
      email: "other@gmail.com",
    });
    // user_providers: found under different user
    mockAdmin.queueResult("user_providers", { data: { user_id: "user-2" } });

    vi.mocked(getUserDataSummary)
      .mockResolvedValueOnce({ lastUpdated: "2026-06-01T00:00:00Z", counts: { clubs: 1, practices: 0, accessories: 0 } })
      .mockResolvedValueOnce({ lastUpdated: "2026-05-01T00:00:00Z", counts: { clubs: 2, practices: 1, accessories: 0 } });

    const req = createMockRequest(URL, {
      method: "POST",
      body: { provider: "google", idToken: "valid-token" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.needsConfirm).toBe(true);
    expect(json.currentAccount.id).toBe("user-1");
    expect(json.existingAccount.id).toBe("user-2");
  });

  it("merges accounts when confirmMerge is true", async () => {
    vi.mocked(getApiAuth).mockResolvedValue({ supabase: {}, userId: "user-1" });
    // user_providers: existing provider belongs to user-2
    mockAdmin.queueResult("user_providers", { data: { user_id: "user-2" } });
    // user_providers: get current auth_user_id
    mockAdmin.queueResult("user_providers", { data: { auth_user_id: "auth-1" } });
    // user_providers: get loser's providers
    mockAdmin.queueResult("user_providers", {
      data: [{ id: "lp-1", provider: "google", provider_sub: "google-789", user_id: "user-2" }],
    });
    // user_providers: dup check (no dup)
    mockAdmin.queueResult("user_providers", { data: null });
    // user_providers: move provider (update)
    mockAdmin.queueResult("user_providers", { data: null, error: null });
    // user_providers: session check
    mockAdmin.queueResult("user_providers", { data: { id: "sp-1" } });
    // user_providers: delete loser's remaining providers
    mockAdmin.queueResult("user_providers", { data: null, error: null });
    // users: delete loser
    mockAdmin.queueResult("users", { data: null, error: null });

    const req = createMockRequest(URL, {
      method: "POST",
      body: {
        provider: "google",
        providerSub: "google-789",
        confirmMerge: true,
        keepAccountId: "user-1",
      },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.linked).toBe(true);
    expect(json.merged).toBe(true);
    expect(json.mergedInto).toBe("user-1");
    expect(vi.mocked(deleteUserData)).toHaveBeenCalledWith(mockAdmin, "user-2");
  });

  it("returns alreadyLinked when same user already has this provider", async () => {
    vi.mocked(getApiAuth).mockResolvedValue({ supabase: {}, userId: "user-1" });
    vi.mocked(verifyGoogleIdToken).mockResolvedValue({
      sub: "google-existing",
      email: "me@gmail.com",
    });
    // user_providers: found under same user
    mockAdmin.queueResult("user_providers", { data: { user_id: "user-1" } });

    const req = createMockRequest(URL, {
      method: "POST",
      body: { provider: "google", idToken: "valid-token" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ linked: true, alreadyLinked: true });
  });
});

describe("DELETE /api/auth/link-provider", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getApiAuth).mockResolvedValue(null);

    const req = createMockRequest(URL, {
      method: "DELETE",
      body: { provider: "line" },
    });
    const res = await DELETE(req);

    expect(res.status).toBe(401);
  });

  it("unlinks provider when multiple providers exist", async () => {
    vi.mocked(getApiAuth).mockResolvedValue({ supabase: {}, userId: "user-1" });
    // user_providers: list current providers (2 providers)
    mockAdmin.queueResult("user_providers", {
      data: [
        { id: "p1", provider: "google", auth_user_id: "auth-1" },
        { id: "p2", provider: "line", auth_user_id: "auth-2" },
      ],
    });
    // user_providers: delete the target
    mockAdmin.queueResult("user_providers", { data: null, error: null });

    // Mock headers to identify current session as auth-1 (Google)
    vi.mocked(headers).mockResolvedValue({
      get: (name: string) => name === "authorization" ? "Bearer test-token" : null,
    } as any);
    mockAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: "auth-1" } },
    });

    const req = createMockRequest(URL, {
      method: "DELETE",
      body: { provider: "line" },
    });
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.unlinked).toBe(true);
    expect(json.needsRelogin).toBe(false);
  });

  it("rejects when only one provider remains", async () => {
    vi.mocked(getApiAuth).mockResolvedValue({ supabase: {}, userId: "user-1" });
    // user_providers: only 1 provider
    mockAdmin.queueResult("user_providers", {
      data: [{ id: "p1", provider: "google", auth_user_id: "auth-1" }],
    });

    const req = createMockRequest(URL, {
      method: "DELETE",
      body: { provider: "google" },
    });
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("最低1つのログイン方法が必要です");
  });

  it("rejects when trying to unlink currently logged-in provider", async () => {
    vi.mocked(getApiAuth).mockResolvedValue({ supabase: {}, userId: "user-1" });
    // user_providers: 2 providers, Google is current
    mockAdmin.queueResult("user_providers", {
      data: [
        { id: "p1", provider: "google", auth_user_id: "auth-1" },
        { id: "p2", provider: "line", auth_user_id: "auth-2" },
      ],
    });

    vi.mocked(headers).mockResolvedValue({
      get: (name: string) => name === "authorization" ? "Bearer test-token" : null,
    } as any);
    mockAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: "auth-1" } },
    });

    const req = createMockRequest(URL, {
      method: "DELETE",
      body: { provider: "google" },
    });
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("ログイン中のため解除できません");
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run __tests__/api/auth/link-provider.test.ts`

Expected: all tests pass

- [ ] **Step 3: Fix any failures and re-run**

If any test fails, adjust mock setup to match actual route behavior and re-run.

- [ ] **Step 4: Commit**

```bash
git add __tests__/api/auth/link-provider.test.ts
git commit -m "test(auth): add link-provider API route tests

Tests POST (5 cases) and DELETE (4 cases) covering:
- new provider linking
- conflict detection and merge
- already-linked detection
- unlink with minimum provider check
- current session provider protection"
```

---

### Task 5: Write providers GET and getApiAuth tests

**Files:**
- Create: `__tests__/api/auth/providers.test.ts`
- Create: `__tests__/lib/supabase-api.test.ts`

- [ ] **Step 1: Create providers GET test file**

```typescript
// __tests__/api/auth/providers.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, createMockRequest } from "../../helpers/mock-supabase";

vi.mock("@/lib/supabase/api", () => ({
  getApiAuth: vi.fn(),
  unauthorized: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
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

let mockAdmin: any;

beforeEach(() => {
  vi.clearAllMocks();
  mockAdmin = createMockSupabase();
  vi.mocked(getSupabaseAdmin).mockReturnValue(mockAdmin);
});

describe("GET /api/auth/providers", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getApiAuth).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it("returns provider list with is_current flag", async () => {
    vi.mocked(getApiAuth).mockResolvedValue({ supabase: {}, userId: "user-1" });
    // user_providers: list
    mockAdmin.queueResult("user_providers", {
      data: [
        { provider: "google", provider_email: "test@gmail.com", auth_user_id: "auth-1" },
        { provider: "line", provider_email: null, auth_user_id: "auth-2" },
      ],
    });

    // Mock headers for current session detection
    vi.mocked(headers).mockResolvedValue({
      get: (name: string) => name === "authorization" ? "Bearer test-token" : null,
    } as any);
    mockAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: "auth-1" } },
    });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual([
      { provider: "google", provider_email: "test@gmail.com", is_current: true },
      { provider: "line", provider_email: null, is_current: false },
    ]);
  });
});
```

- [ ] **Step 2: Create getApiAuth test file**

```typescript
// __tests__/lib/supabase-api.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "../helpers/mock-supabase";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const mockAdmin = createMockSupabase();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockAdmin),
}));

import { getApiAuth } from "@/lib/supabase/api";
import { headers } from "next/headers";
import { createClient as createServerClient } from "@/lib/supabase/server";

beforeEach(() => {
  vi.clearAllMocks();
  // Reset environment to non-dev mode
  process.env.NODE_ENV = "test";
  delete process.env.NEXT_PUBLIC_DEV_SKIP_AUTH;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
});

describe("getApiAuth", () => {
  it("returns userId for Bearer token when user_providers exists", async () => {
    vi.mocked(headers).mockResolvedValue({
      get: (name: string) => name === "authorization" ? "Bearer valid-token" : null,
    } as any);
    mockAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: "auth-1" } },
      error: null,
    });
    // resolveUserId: user_providers lookup
    mockAdmin.queueResult("user_providers", { data: { user_id: "user-1" } });

    const result = await getApiAuth();

    expect(result).not.toBeNull();
    expect(result!.userId).toBe("user-1");
  });

  it("returns null for Bearer token when user_providers not found", async () => {
    vi.mocked(headers).mockResolvedValue({
      get: (name: string) => name === "authorization" ? "Bearer valid-token" : null,
    } as any);
    mockAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: "auth-orphan" } },
      error: null,
    });
    // resolveUserId: no user_providers
    mockAdmin.queueResult("user_providers", { data: null });

    const result = await getApiAuth();

    expect(result).toBeNull();
  });

  it("returns userId for cookie session when user_providers exists", async () => {
    vi.mocked(headers).mockResolvedValue({
      get: () => null, // No authorization header
    } as any);

    const mockSessionClient: any = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "auth-cookie" } },
        }),
      },
    };
    vi.mocked(createServerClient).mockResolvedValue(mockSessionClient);
    // resolveUserId: user_providers lookup
    mockAdmin.queueResult("user_providers", { data: { user_id: "user-cookie" } });

    const result = await getApiAuth();

    expect(result).not.toBeNull();
    expect(result!.userId).toBe("user-cookie");
  });

  it("returns null for cookie session when not logged in", async () => {
    vi.mocked(headers).mockResolvedValue({
      get: () => null,
    } as any);

    const mockSessionClient: any = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    };
    vi.mocked(createServerClient).mockResolvedValue(mockSessionClient);

    const result = await getApiAuth();

    expect(result).toBeNull();
  });
});
```

- [ ] **Step 3: Run all tests**

Run: `npx vitest run __tests__/api/auth/ __tests__/lib/supabase-api.test.ts`

Expected: all tests pass

- [ ] **Step 4: Fix any failures and re-run**

If any test fails, adjust mock setup to match actual behavior and re-run.

- [ ] **Step 5: Commit**

```bash
git add __tests__/api/auth/providers.test.ts __tests__/lib/supabase-api.test.ts
git commit -m "test(auth): add providers GET and getApiAuth unit tests

Tests providers GET (2 cases) and getApiAuth (4 cases) covering:
- provider list with is_current session detection
- Bearer token and cookie session auth flows
- handling of missing user_providers"
```

---

### Task 6: Add ProcessingOverlay and unified loading state

**Files:**
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1: Add ProcessingOverlay component at the bottom of the file**

Add before the closing of the file (after the `AccountLinking` function):

```tsx
function ProcessingOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
        <p className="text-white font-bold">{message}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace signingIn and conflictProcessing with unified processing state**

In `SettingsPage`, replace:
```tsx
const [signingIn, setSigningIn] = useState(false);
```
and:
```tsx
const [conflictProcessing, setConflictProcessing] = useState(false);
```

With a single state:
```tsx
const [processing, setProcessing] = useState<string | null>(null);
```

- [ ] **Step 3: Update conflict resolution UI to use processing state**

Replace all `conflictProcessing` references:
- `disabled={conflictProcessing}` → `disabled={!!processing}`
- `setConflictProcessing(true)` → `setProcessing("データを処理中...")`
- `setConflictProcessing(false)` → `setProcessing(null)`
- `{conflictProcessing ? "処理中..." : "OK"}` → `{processing ? "処理中..." : "OK"}`

Add the overlay to the conflict UI return (inside the outer div, at the end):
```tsx
{processing && <ProcessingOverlay message={processing} />}
```

- [ ] **Step 4: Replace signingIn overlay with ProcessingOverlay**

Replace the `if (signingIn)` full-page return block (lines 220-229) — remove that entire block.

Instead, add the overlay to the sign-in page return (the `if (!user && isNative())` block):
```tsx
return (
  <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={...}>
    {processing && <ProcessingOverlay message={processing} />}
    {/* ... rest of sign-in page ... */}
  </div>
);
```

- [ ] **Step 5: Update sign-in handlers to use processing state**

Google sign-in handler:
- `setSigningIn(true)` → `setProcessing("ログイン中...")`
- `setSigningIn(false)` → `setProcessing(null)`

LINE sign-in handler:
- `setSigningIn(true)` → `setProcessing("ログイン中...")`
- `setSigningIn(false)` → `setProcessing(null)`

- [ ] **Step 6: Wrap logout button with processing state**

Replace the logout button's `onClick`:
```tsx
// Before:
onClick={liffLogout}

// After:
onClick={async () => {
  setProcessing("ログアウト中...");
  await liffLogout();
}}
```

Note: `liffLogout` ends with `window.location.href = "/"` so `setProcessing(null)` is unnecessary.

- [ ] **Step 7: Add processing overlay to logged-in settings page**

In the main return (when user is logged in), add the overlay inside the outer div:
```tsx
return (
  <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={...}>
    {processing && <ProcessingOverlay message={processing} />}
    <img ... />
    {/* ... rest of settings page ... */}
  </div>
);
```

- [ ] **Step 8: Update AccountLinking to accept and use setProcessing**

Change AccountLinking props:
```tsx
function AccountLinking({
  user,
  onConflict,
  setProcessing,
}: {
  user: User;
  onConflict: (info: any) => void;
  setProcessing: (msg: string | null) => void;
}) {
```

Update the caller:
```tsx
<AccountLinking user={user} onConflict={setConflictInfo} setProcessing={setProcessing} />
```

Wrap `unlinkProvider`:
```tsx
async function unlinkProvider(provider: "line" | "google") {
  if (!confirm(`${provider === "line" ? "LINE" : "Google"}の連携を解除しますか？`)) return;
  setProcessing("解除中...");
  try {
    const res = await apiFetch("/api/auth/link-provider", { ... });
    if (res.ok) {
      // ... existing success logic ...
    } else {
      const err = await res.json();
      alert(err.error || "解除に失敗しました");
    }
  } finally {
    setProcessing(null);
  }
}
```

Wrap `linkLine` (native path):
```tsx
async function linkLine() {
  try {
    if (isNative()) {
      setProcessing("連携中...");
      // ... existing native logic ...
      setProcessing(null);
      return;
    }
    // Web: redirect (no setProcessing needed — browser navigates away)
    // ...
  } catch (e: any) {
    console.error("linkLine error:", e);
    alert(e.message || "LINE連携に失敗しました");
    setProcessing(null);
  }
}
```

Wrap `linkGoogle`:
```tsx
async function linkGoogle() {
  setProcessing("連携中...");
  // ... existing OAuth redirect logic ...
  // No setProcessing(null) needed — browser navigates away
}
```

- [ ] **Step 9: Build and verify**

Run: `npx next build 2>&1 | tail -5`

Expected: build succeeds with no errors

- [ ] **Step 10: Run full test suite**

Run: `npx vitest run`

Expected: all tests pass

- [ ] **Step 11: Commit**

```bash
git add src/app/settings/page.tsx
git commit -m "feat(auth): add ProcessingOverlay for all async operations

Replace fragmented signingIn/conflictProcessing states with unified
processing state. Shows full-screen overlay with spinner for login,
logout, provider link/unlink, and conflict resolution operations."
```
