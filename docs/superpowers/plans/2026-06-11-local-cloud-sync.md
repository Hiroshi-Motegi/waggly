# Local-to-Cloud Data Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When users sign in or link accounts, detect WID conflicts and let users choose which data to keep via a selection UI, then cleanly merge the winner and delete the loser.

**Architecture:** New server APIs (`check-conflict`, `resolve-conflict`, `data-summary`) handle conflict detection and resolution in transactions. A new `/auth/resolve-conflict` page shows data summaries for user selection. Client-side sign-in and linking flows are updated to call check-conflict before proceeding.

**Tech Stack:** Next.js API routes, Supabase (admin client for cross-user operations), SQLite (Capacitor), React (selection UI page)

**Spec:** `docs/superpowers/specs/2026-06-11-local-cloud-sync-design.md`

---

### Task 1: Track last_data_updated in sync_meta

**Files:**
- Modify: `src/lib/data-store.ts`
- Test: `__tests__/lib/data-store.test.ts`

The `sync_meta` table is already a key-value store (`key TEXT, value TEXT`), so no schema migration is needed — just write a `last_data_updated` key on each mutation.

- [ ] **Step 1: Write failing test for last_data_updated tracking**

In `__tests__/lib/data-store.test.ts`, add a test inside the `mutateData (write)` describe block:

```typescript
it("updates last_data_updated in sync_meta on successful mutation (native + online)", async () => {
  vi.mocked(Network.getStatus).mockResolvedValue({
    connected: true,
    connectionType: "wifi",
  });
  const newClub = { id: "2", club_number: "PW" };
  vi.mocked(apiFetch).mockResolvedValue(
    new Response(JSON.stringify(newClub), { status: 200 })
  );

  const { mutateData } = await import("@/lib/data-store");
  await mutateData("/api/clubs", "POST", newClub);

  expect(execute).toHaveBeenCalledWith(
    "INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)",
    ["last_data_updated", expect.any(String)]
  );
});

it("updates last_data_updated in sync_meta on offline mutation (native + offline)", async () => {
  vi.mocked(Network.getStatus).mockResolvedValue({
    connected: false,
    connectionType: "none",
  });

  const { mutateData } = await import("@/lib/data-store");
  await mutateData("/api/clubs", "POST", { id: "3", club_number: "5W" });

  expect(execute).toHaveBeenCalledWith(
    "INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)",
    ["last_data_updated", expect.any(String)]
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/data-store.test.ts`
Expected: FAIL — `execute` is not called with `sync_meta` args.

- [ ] **Step 3: Implement last_data_updated tracking in mutateData**

In `src/lib/data-store.ts`, add a helper function and call it at the end of `mutateData`:

```typescript
/** Record the last data modification timestamp in sync_meta (native only). */
async function touchLastDataUpdated(): Promise<void> {
  try {
    const { execute } = await import("@/lib/sqlite/database");
    await execute(
      "INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)",
      ["last_data_updated", new Date().toISOString()]
    );
  } catch {
    // Non-fatal — sync_meta update failure shouldn't block mutations
  }
}
```

Then add `await touchLastDataUpdated();` at the end of the `mutateData` function, right before the final `return payload as T;` — but only within the native branch. Specifically:

1. After the `if (online) { ... return res.json(); }` block's return.
2. After the `await execute("INSERT INTO pending_sync ...")` call.

Since the function returns early in both native branches (online and offline), we need to add the call before each return:

In the online native branch (around line 88), before `return res.json()`:
```typescript
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    await touchLastDataUpdated();
    if (method === "DELETE") return null;
    return res.json();
```

In the offline native branch (around line 101), before `return payload as T`:
```typescript
    await touchLastDataUpdated();
    return payload as T;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/data-store.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/data-store.ts __tests__/lib/data-store.test.ts
git commit -m "feat: track last_data_updated in sync_meta on mutations"
```

---

### Task 2: Create getLocalDataSummary() utility

**Files:**
- Modify: `src/lib/sync.ts`
- Test: `__tests__/lib/sync.test.ts`

- [ ] **Step 1: Write failing test for getLocalDataSummary**

In `__tests__/lib/sync.test.ts`, add a new describe block:

```typescript
describe("getLocalDataSummary", () => {
  it("returns counts and lastUpdated for local data", async () => {
    // Mock COUNT queries for each table
    vi.mocked(query)
      .mockResolvedValueOnce([{ count: 14 }])   // clubs
      .mockResolvedValueOnce([{ count: 8 }])     // practice_sessions
      .mockResolvedValueOnce([{ count: 3 }])     // accessories
      .mockResolvedValueOnce([{ value: "2026-12-12T13:11:00.000Z" }]); // sync_meta

    const { getLocalDataSummary } = await import("@/lib/sync");
    const summary = await getLocalDataSummary();

    expect(summary).toEqual({
      lastUpdated: "2026-12-12T13:11:00.000Z",
      counts: { clubs: 14, practices: 8, accessories: 3 },
    });
  });

  it("returns null lastUpdated when no sync_meta entry exists", async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([]); // no sync_meta row

    const { getLocalDataSummary } = await import("@/lib/sync");
    const summary = await getLocalDataSummary();

    expect(summary).toEqual({
      lastUpdated: null,
      counts: { clubs: 0, practices: 0, accessories: 0 },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/sync.test.ts`
Expected: FAIL — `getLocalDataSummary` is not exported.

- [ ] **Step 3: Implement getLocalDataSummary**

In `src/lib/sync.ts`, add after the imports:

```typescript
export interface DataSummary {
  lastUpdated: string | null;
  counts: { clubs: number; practices: number; accessories: number };
}

/**
 * Get summary of local SQLite data for the conflict resolution UI.
 */
export async function getLocalDataSummary(): Promise<DataSummary> {
  const clubRows = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM clubs"
  );
  const practiceRows = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM practice_sessions"
  );
  const accessoryRows = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM accessories"
  );
  const metaRows = await query<{ value: string }>(
    "SELECT value FROM sync_meta WHERE key = 'last_data_updated'"
  );

  return {
    lastUpdated: metaRows.length > 0 ? metaRows[0].value : null,
    counts: {
      clubs: clubRows[0]?.count ?? 0,
      practices: practiceRows[0]?.count ?? 0,
      accessories: accessoryRows[0]?.count ?? 0,
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/sync.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/sync.ts __tests__/lib/sync.test.ts
git commit -m "feat: add getLocalDataSummary for conflict resolution UI"
```

---

### Task 3: Create collectLocalData() for upload

**Files:**
- Modify: `src/lib/sync.ts`
- Test: `__tests__/lib/sync.test.ts`

This function collects all local SQLite data (with child tables) for uploading to the server when the user chooses "local data" during conflict resolution.

- [ ] **Step 1: Write failing test for collectLocalData**

In `__tests__/lib/sync.test.ts`, add:

```typescript
describe("collectLocalData", () => {
  it("collects clubs with child tables, accessories, and practice sessions with practice_clubs", async () => {
    const mockClubs = [{ id: "c1", user_id: "local", category: "iron", club_number: "7I", created_at: "2026-01-01" }];
    const mockMemos = [{ id: "m1", club_id: "c1", memo: "good", created_at: "2026-01-01" }];
    const mockImages = [{ id: "i1", club_id: "c1", image_url: "http://...", is_primary: 1, created_at: "2026-01-01" }];
    const mockMaintenances = [{ id: "mt1", club_id: "c1", type: "grip_change", done_at: "2026-01-01", created_at: "2026-01-01" }];
    const mockAccessories = [{ id: "a1", user_id: "local", category: "ball", created_at: "2026-01-01" }];
    const mockSessions = [{ id: "s1", user_id: "local", practiced_at: "2026-01-01", created_at: "2026-01-01" }];
    const mockPracticeClubs = [{ id: "pc1", session_id: "s1", club_id: "c1", balls: 20 }];

    vi.mocked(query)
      .mockResolvedValueOnce(mockClubs)          // SELECT * FROM clubs
      .mockResolvedValueOnce(mockMemos)           // club_memos for c1
      .mockResolvedValueOnce(mockImages)          // club_images for c1
      .mockResolvedValueOnce(mockMaintenances)    // maintenances for c1
      .mockResolvedValueOnce(mockAccessories)     // SELECT * FROM accessories
      .mockResolvedValueOnce(mockSessions)        // SELECT * FROM practice_sessions
      .mockResolvedValueOnce(mockPracticeClubs);  // practice_clubs for s1

    const { collectLocalData } = await import("@/lib/sync");
    const data = await collectLocalData();

    expect(data.clubs).toHaveLength(1);
    expect(data.clubs[0].club_memos).toEqual(mockMemos);
    expect(data.clubs[0].club_images).toEqual(mockImages);
    expect(data.clubs[0].maintenances).toEqual(mockMaintenances);
    expect(data.accessories).toEqual(mockAccessories);
    expect(data.practiceSessions).toHaveLength(1);
    expect(data.practiceSessions[0].practice_clubs).toEqual(mockPracticeClubs);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/sync.test.ts`
Expected: FAIL — `collectLocalData` is not exported.

- [ ] **Step 3: Implement collectLocalData**

In `src/lib/sync.ts`, add:

```typescript
/**
 * Collect all local SQLite data for uploading to the server.
 * Includes child tables nested within their parents.
 */
export async function collectLocalData(): Promise<{
  clubs: any[];
  accessories: any[];
  practiceSessions: any[];
}> {
  // Clubs + child tables
  const clubs = await query<any>("SELECT * FROM clubs");
  for (const club of clubs) {
    club.club_memos = await query<any>(
      "SELECT * FROM club_memos WHERE club_id = ?",
      [club.id]
    );
    club.club_images = await query<any>(
      "SELECT * FROM club_images WHERE club_id = ?",
      [club.id]
    );
    club.maintenances = await query<any>(
      "SELECT * FROM maintenances WHERE club_id = ?",
      [club.id]
    );
  }

  // Accessories (no child tables)
  const accessories = await query<any>("SELECT * FROM accessories");

  // Practice sessions + practice_clubs
  const practiceSessions = await query<any>("SELECT * FROM practice_sessions");
  for (const session of practiceSessions) {
    session.practice_clubs = await query<any>(
      "SELECT * FROM practice_clubs WHERE session_id = ?",
      [session.id]
    );
  }

  return { clubs, accessories, practiceSessions };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/sync.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/sync.ts __tests__/lib/sync.test.ts
git commit -m "feat: add collectLocalData for local-to-cloud upload"
```

---

### Task 4: Create GET /api/auth/data-summary API

**Files:**
- Create: `src/app/api/auth/data-summary/route.ts`

Returns data counts and last updated timestamp for the authenticated user.

- [ ] **Step 1: Implement data-summary API**

Create `src/app/api/auth/data-summary/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

export async function GET() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();

  const { supabase, userId } = auth;

  const [clubsRes, practicesRes, accessoriesRes] = await Promise.all([
    supabase.from("clubs").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("practice_sessions").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("accessories").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  // Get the most recent created_at across all tables as lastUpdated
  const [latestClub, latestPractice, latestAccessory] = await Promise.all([
    supabase.from("clubs").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("practice_sessions").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("accessories").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const dates = [
    latestClub.data?.created_at,
    latestPractice.data?.created_at,
    latestAccessory.data?.created_at,
  ].filter(Boolean) as string[];

  const lastUpdated = dates.length > 0
    ? dates.sort().reverse()[0]
    : null;

  return NextResponse.json({
    wid: userId,
    lastUpdated,
    counts: {
      clubs: clubsRes.count ?? 0,
      practices: practicesRes.count ?? 0,
      accessories: accessoriesRes.count ?? 0,
    },
  });
}
```

- [ ] **Step 2: Verify the route compiles**

Run: `npx next build --no-lint 2>&1 | head -20` (or `npx tsc --noEmit` if faster)
Expected: No TypeScript errors in the new file.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/data-summary/route.ts
git commit -m "feat: add GET /api/auth/data-summary endpoint"
```

---

### Task 5: Create POST /api/auth/check-conflict API

**Files:**
- Create: `src/app/api/auth/check-conflict/route.ts`

Detects WID conflicts when a provider ID is already linked to an existing user.

- [ ] **Step 1: Implement check-conflict API**

Create `src/app/api/auth/check-conflict/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/auth/check-conflict
 *
 * Check if a provider ID is already linked to an existing user (WID conflict).
 * Called after authentication succeeds but before finalizing sign-in/linking.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { provider, providerUserId, currentWid } = body;

  if (!provider || !providerUserId) {
    return NextResponse.json(
      { error: "Missing provider or providerUserId" },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Look up existing user by provider ID
  let existingUser = null;
  if (provider === "google") {
    const { data } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("google_id", providerUserId)
      .maybeSingle();
    existingUser = data;
  } else if (provider === "line") {
    const { data } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("line_user_id", providerUserId)
      .maybeSingle();
    existingUser = data;
  } else if (provider === "apple") {
    // Future: apple_id column
    return NextResponse.json({ conflict: false });
  }

  // No existing user → no conflict
  if (!existingUser) {
    return NextResponse.json({ conflict: false });
  }

  // If currentWid matches existing user → same user, no conflict
  if (currentWid && existingUser.id === currentWid) {
    return NextResponse.json({ conflict: false });
  }

  // Conflict found — return data summary for the existing user
  const existingSummary = await getUserDataSummary(supabaseAdmin, existingUser.id);

  const result: any = {
    conflict: true,
    existingUser: {
      wid: existingUser.id,
      displayName: existingUser.display_name,
      ...existingSummary,
    },
  };

  // If account linking, also return current user's summary
  if (currentWid) {
    const currentSummary = await getUserDataSummary(supabaseAdmin, currentWid);
    const { data: currentUser } = await supabaseAdmin
      .from("users")
      .select("display_name")
      .eq("id", currentWid)
      .single();
    result.currentUser = {
      wid: currentWid,
      displayName: currentUser?.display_name ?? "",
      ...currentSummary,
    };
  }

  return NextResponse.json(result);
}

async function getUserDataSummary(supabase: any, userId: string) {
  const [clubsRes, practicesRes, accessoriesRes] = await Promise.all([
    supabase.from("clubs").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("practice_sessions").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("accessories").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const [latestClub, latestPractice, latestAccessory] = await Promise.all([
    supabase.from("clubs").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("practice_sessions").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("accessories").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const dates = [
    latestClub.data?.created_at,
    latestPractice.data?.created_at,
    latestAccessory.data?.created_at,
  ].filter(Boolean) as string[];

  return {
    lastUpdated: dates.length > 0 ? dates.sort().reverse()[0] : null,
    counts: {
      clubs: clubsRes.count ?? 0,
      practices: practicesRes.count ?? 0,
      accessories: accessoriesRes.count ?? 0,
    },
  };
}
```

- [ ] **Step 2: Verify the route compiles**

Run: `npx tsc --noEmit 2>&1 | grep check-conflict || echo "No errors"`
Expected: No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/check-conflict/route.ts
git commit -m "feat: add POST /api/auth/check-conflict endpoint"
```

---

### Task 6: Create POST /api/auth/resolve-conflict API

**Files:**
- Create: `src/app/api/auth/resolve-conflict/route.ts`

Handles conflict resolution: deletes loser data/user, transfers provider IDs, inserts local data if chosen. All within a transaction-like sequence using the admin client.

- [ ] **Step 1: Implement resolve-conflict API**

Create `src/app/api/auth/resolve-conflict/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/auth/resolve-conflict
 *
 * Execute conflict resolution based on user's choice.
 * Handles both first-signin and account-linking scenarios.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    scenario,    // "first-signin" | "account-linking"
    provider,    // "google" | "line" | "apple"
    providerUserId,
    choice,      // "local" | "server" | "current" | "existing"
    winnerWid,
    loserWid,
    localData,   // { clubs, accessories, practiceSessions } — only when choice === "local"
  } = body;

  if (!scenario || !provider || !providerUserId || !choice) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();

  try {
    if (scenario === "first-signin") {
      return await handleFirstSignin(
        supabaseAdmin,
        { provider, providerUserId, choice, localData }
      );
    }

    if (scenario === "account-linking") {
      return await handleAccountLinking(
        supabaseAdmin,
        { provider, providerUserId, choice, winnerWid, loserWid }
      );
    }

    return NextResponse.json({ error: "Unknown scenario" }, { status: 400 });
  } catch (e: any) {
    console.error("[resolve-conflict] Error:", e);
    return NextResponse.json(
      { error: e.message ?? "Conflict resolution failed" },
      { status: 500 }
    );
  }
}

/**
 * First sign-in: local user signs in and finds existing WID.
 * - "local": delete existing WID's data, insert local data under that WID
 * - "server": keep existing WID's data as-is (client just runs fullSync)
 */
async function handleFirstSignin(
  supabase: any,
  opts: {
    provider: string;
    providerUserId: string;
    choice: string;
    localData?: any;
  }
) {
  // Find the existing user by provider
  const existingUser = await findUserByProvider(
    supabase,
    opts.provider,
    opts.providerUserId
  );
  if (!existingUser) {
    return NextResponse.json({ error: "Existing user not found" }, { status: 404 });
  }

  if (opts.choice === "local" && opts.localData) {
    // Delete existing user's data (keep user record)
    await deleteUserData(supabase, existingUser.id);

    // Insert local data under the existing WID
    await insertLocalData(supabase, existingUser.id, opts.localData);
  }
  // choice === "server": do nothing — client will fullSync

  // Create session for the existing user
  const session = await createSessionForUser(supabase, existingUser.id);

  return NextResponse.json({
    success: true,
    userId: existingUser.id,
    ...(session ?? {}),
  });
}

/**
 * Account linking: logged-in user links a provider that has another WID.
 * - "current": keep current user's data, delete existing (linked) user
 * - "existing": keep existing user's data, delete current user
 */
async function handleAccountLinking(
  supabase: any,
  opts: {
    provider: string;
    providerUserId: string;
    choice: string;
    winnerWid?: string;
    loserWid?: string;
  }
) {
  const { winnerWid, loserWid } = opts;
  if (!winnerWid || !loserWid) {
    return NextResponse.json(
      { error: "Missing winnerWid or loserWid" },
      { status: 400 }
    );
  }

  // Delete loser's data and user record
  await deleteUserData(supabase, loserWid);
  await supabase.from("users").delete().eq("id", loserWid);
  await supabase.auth.admin.deleteUser(loserWid);

  // Transfer provider ID to winner
  await transferProvider(supabase, winnerWid, opts.provider, opts.providerUserId);

  // If winner is the existing (linked) user, client needs a new session
  let session = null;
  if (opts.choice === "existing") {
    session = await createSessionForUser(supabase, winnerWid);
  }

  return NextResponse.json({
    success: true,
    userId: winnerWid,
    ...(session ?? {}),
  });
}

// ── Helpers ──

async function findUserByProvider(supabase: any, provider: string, providerUserId: string) {
  const column = provider === "google" ? "google_id" : "line_user_id";
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq(column, providerUserId)
    .maybeSingle();
  return data;
}

async function deleteUserData(supabase: any, userId: string) {
  // Delete in order to respect FK constraints (child → parent)
  await supabase.from("favorite_courses").delete().eq("user_id", userId);
  await supabase.from("profiles").delete().eq("id", userId);
  await supabase.from("practice_sessions").delete().eq("user_id", userId);
  await supabase.from("accessories").delete().eq("user_id", userId);
  await supabase.from("clubs").delete().eq("user_id", userId);
}

async function transferProvider(
  supabase: any,
  userId: string,
  provider: string,
  providerUserId: string
) {
  if (provider === "google") {
    await supabase
      .from("users")
      .update({ google_id: providerUserId })
      .eq("id", userId);
  } else if (provider === "line") {
    await supabase
      .from("users")
      .update({ line_user_id: providerUserId })
      .eq("id", userId);
  }
}

async function insertLocalData(supabase: any, userId: string, localData: any) {
  const { clubs = [], accessories = [], practiceSessions = [] } = localData;

  // Insert clubs + child tables
  for (const club of clubs) {
    const { club_memos = [], club_images = [], maintenances = [], ...clubData } = club;
    await supabase.from("clubs").insert({ ...clubData, user_id: userId });

    for (const memo of club_memos) {
      await supabase.from("club_memos").insert(memo);
    }
    for (const image of club_images) {
      await supabase.from("club_images").insert(image);
    }
    for (const maintenance of maintenances) {
      await supabase.from("maintenances").insert(maintenance);
    }
  }

  // Insert accessories
  for (const accessory of accessories) {
    await supabase.from("accessories").insert({ ...accessory, user_id: userId });
  }

  // Insert practice sessions + practice_clubs
  for (const session of practiceSessions) {
    const { practice_clubs = [], ...sessionData } = session;
    await supabase.from("practice_sessions").insert({ ...sessionData, user_id: userId });

    for (const pc of practice_clubs) {
      await supabase.from("practice_clubs").insert(pc);
    }
  }
}

async function createSessionForUser(supabase: any, userId: string) {
  const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);
  if (!authUser?.email) return null;

  const tempPassword = crypto.randomUUID();
  await supabase.auth.admin.updateUserById(userId, { password: tempPassword });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: authUser.email,
    password: tempPassword,
  });

  if (error || !data.session) {
    console.error("[resolve-conflict] Session creation failed:", error);
    return null;
  }

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  };
}
```

- [ ] **Step 2: Verify the route compiles**

Run: `npx tsc --noEmit 2>&1 | grep resolve-conflict || echo "No errors"`
Expected: No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/resolve-conflict/route.ts
git commit -m "feat: add POST /api/auth/resolve-conflict endpoint"
```

---

### Task 7: Create POST /api/auth/upload-local-data API

**Files:**
- Create: `src/app/api/auth/upload-local-data/route.ts`

For the no-conflict case: when a new user signs in and has local data, upload it to the server. Reuses `insertLocalData` logic from resolve-conflict.

- [ ] **Step 1: Extract insertLocalData to shared module**

Create `src/lib/insert-local-data.ts`:

```typescript
/**
 * Insert local data into Supabase under a given user ID.
 * Shared by resolve-conflict and upload-local-data APIs.
 */
export async function insertLocalData(supabase: any, userId: string, localData: any) {
  const { clubs = [], accessories = [], practiceSessions = [] } = localData;

  for (const club of clubs) {
    const { club_memos = [], club_images = [], maintenances = [], ...clubData } = club;
    await supabase.from("clubs").insert({ ...clubData, user_id: userId });
    for (const memo of club_memos) {
      await supabase.from("club_memos").insert(memo);
    }
    for (const image of club_images) {
      await supabase.from("club_images").insert(image);
    }
    for (const maintenance of maintenances) {
      await supabase.from("maintenances").insert(maintenance);
    }
  }

  for (const accessory of accessories) {
    await supabase.from("accessories").insert({ ...accessory, user_id: userId });
  }

  for (const session of practiceSessions) {
    const { practice_clubs = [], ...sessionData } = session;
    await supabase.from("practice_sessions").insert({ ...sessionData, user_id: userId });
    for (const pc of practice_clubs) {
      await supabase.from("practice_clubs").insert(pc);
    }
  }
}
```

- [ ] **Step 2: Create upload-local-data API**

Create `src/app/api/auth/upload-local-data/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { insertLocalData } from "@/lib/insert-local-data";

/**
 * POST /api/auth/upload-local-data
 *
 * Upload local SQLite data to the server for the authenticated user.
 * Used when a new user signs in with local data and no WID conflict exists.
 */
export async function POST(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();

  const { localData } = await request.json();
  if (!localData) {
    return NextResponse.json({ error: "Missing localData" }, { status: 400 });
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await insertLocalData(supabaseAdmin, auth.userId, localData);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[upload-local-data] Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Update resolve-conflict API to use shared insertLocalData**

In `src/app/api/auth/resolve-conflict/route.ts`, replace the inline `insertLocalData` function with:

```typescript
import { insertLocalData } from "@/lib/insert-local-data";
```

And remove the local `insertLocalData` function definition.

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/insert-local-data.ts src/app/api/auth/upload-local-data/route.ts src/app/api/auth/resolve-conflict/route.ts
git commit -m "feat: add POST /api/auth/upload-local-data endpoint"
```

---

### Task 8: Create /auth/resolve-conflict page (selection UI)  

**Files:**
- Create: `src/app/auth/resolve-conflict/page.tsx`

Full-screen page showing two data source cards. User taps one → confirmation dialog → resolve API call → redirect to home.

- [ ] **Step 1: Create the resolve-conflict page**

Create `src/app/auth/resolve-conflict/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";

interface DataSourceInfo {
  label: string;
  isNew: boolean;
  wid: string | null;
  lastUpdated: string | null;
  counts: { clubs: number; practices: number; accessories: number };
}

interface ConflictInfo {
  scenario: "first-signin" | "account-linking";
  provider: string;
  providerUserId: string;
  sourceA: DataSourceInfo;
  sourceB: DataSourceInfo;
}

export default function ResolveConflictPage() {
  const [info, setInfo] = useState<ConflictInfo | null>(null);
  const [selected, setSelected] = useState<"a" | "b" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("conflict_info");
    if (stored) {
      setInfo(JSON.parse(stored));
    } else {
      window.location.href = "/";
    }
  }, []);

  function handleSelect(side: "a" | "b") {
    setSelected(side);
    setShowConfirm(true);
  }

  async function handleConfirm() {
    if (!info || !selected) return;
    setIsProcessing(true);

    const source = selected === "a" ? info.sourceA : info.sourceB;
    const loser = selected === "a" ? info.sourceB : info.sourceA;

    try {
      const { apiFetch } = await import("@/lib/api-client");
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      let resolveBody: any = {
        scenario: info.scenario,
        provider: info.provider,
        providerUserId: info.providerUserId,
      };

      if (info.scenario === "first-signin") {
        // source.wid === null means local data
        const isLocal = source.wid === null;
        resolveBody.choice = isLocal ? "local" : "server";

        if (isLocal) {
          // Collect and send local data
          const { collectLocalData } = await import("@/lib/sync");
          resolveBody.localData = await collectLocalData();
        }
      } else {
        // account-linking
        const isCurrentWinner = source.wid === info.sourceA.wid;
        resolveBody.choice = isCurrentWinner ? "current" : "existing";
        resolveBody.winnerWid = source.wid;
        resolveBody.loserWid = loser.wid;
      }

      const res = await apiFetch("/api/auth/resolve-conflict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resolveBody),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "処理に失敗しました。もう一度お試しください。");
        setIsProcessing(false);
        setShowConfirm(false);
        return;
      }

      const result = await res.json();

      // Switch session if new tokens were returned
      if (result.access_token) {
        await supabase.auth.setSession({
          access_token: result.access_token,
          refresh_token: result.refresh_token,
        });
      }

      // Sync and navigate
      sessionStorage.removeItem("conflict_info");
      const { isNative } = await import("@/lib/platform");
      if (isNative()) {
        const { resetLocalModeCache } = await import("@/lib/api-client");
        resetLocalModeCache();
        const { fullSync } = await import("@/lib/sync");
        await fullSync();
      }
      window.location.href = "/";
    } catch (e) {
      console.error("Resolve conflict failed:", e);
      alert("処理に失敗しました。もう一度お試しください。");
      setIsProcessing(false);
      setShowConfirm(false);
    }
  }

  function handleCancel() {
    sessionStorage.removeItem("conflict_info");

    // Sign out the provisional session
    import("@/lib/supabase/client").then(({ createClient }) => {
      createClient().auth.signOut();
    });

    window.location.href = "/";
  }

  if (!info) return null;

  const selectedSource = selected === "a" ? info.sourceA : info.sourceB;

  return (
    <div
      className="relative flex flex-col px-4 py-4 space-y-4 bg-[#139847]"
      style={{ minHeight: "100dvh" }}
    >
      <img
        src="/images/home-bg.jpg"
        alt=""
        className="fixed inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
      />
      <div className="relative z-10 flex flex-col space-y-4">
        <PageHeader
          title="使用するデータを選んでください"
          variant="dark"
          showBack={false}
        />

        <DataCard
          source={info.sourceA}
          isSelected={selected === "a"}
          onSelect={() => handleSelect("a")}
          disabled={isProcessing}
        />

        <DataCard
          source={info.sourceB}
          isSelected={selected === "b"}
          onSelect={() => handleSelect("b")}
          disabled={isProcessing}
        />

        <div className="flex items-start gap-2 rounded-lg bg-white/90 p-3">
          <span className="text-amber-500 text-lg">⚠</span>
          <p className="text-sm text-[#666]">
            選ばなかった側のデータは削除され、復元できません
          </p>
        </div>

        <button
          onClick={handleCancel}
          disabled={isProcessing}
          className="text-sm text-white/80 py-2 text-center disabled:opacity-50"
        >
          キャンセル
        </button>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && selectedSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="bg-white rounded-xl p-5 w-full max-w-sm space-y-4">
            <p className="text-base font-bold text-center">
              {selectedSource.label}を使用します
            </p>
            <p className="text-sm text-[#666] text-center">
              もう一方のデータは削除されます。よろしいですか？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-lg border border-[#ccc] text-sm disabled:opacity-50"
              >
                戻る
              </button>
              <button
                onClick={handleConfirm}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-lg bg-[#006728] text-white text-sm font-bold disabled:opacity-50"
              >
                {isProcessing ? "処理中..." : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DataCard({
  source,
  isSelected,
  onSelect,
  disabled,
}: {
  source: DataSourceInfo;
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
}) {
  const hasData =
    source.counts.clubs > 0 ||
    source.counts.practices > 0 ||
    source.counts.accessories > 0;

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`w-full text-left rounded-xl p-4 transition-all disabled:opacity-50 ${
        isSelected
          ? "bg-white ring-2 ring-[#006728] shadow-lg"
          : "bg-white/90 shadow"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {source.isNew && (
          <span className="text-xs font-bold text-white bg-[#006728] rounded-full px-2 py-0.5">
            NEW
          </span>
        )}
        <span className="text-base font-bold text-[#333]">
          {source.label}
        </span>
      </div>

      {hasData ? (
        <>
          <div className="flex gap-4 text-sm text-[#666] mb-1">
            <span>クラブ: {source.counts.clubs}件</span>
            <span>練習記録: {source.counts.practices}件</span>
          </div>
          <div className="flex gap-4 text-sm text-[#666] mb-1">
            <span>アクセサリー: {source.counts.accessories}件</span>
          </div>
          {source.lastUpdated && (
            <p className="text-xs text-[#999] mt-1">
              最終更新: {formatDate(source.lastUpdated)}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-[#999]">データはありません</p>
      )}
    </button>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
```

- [ ] **Step 2: Verify the page compiles**

Run: `npx tsc --noEmit 2>&1 | grep resolve-conflict || echo "No errors"`
Expected: No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/auth/resolve-conflict/page.tsx
git commit -m "feat: add /auth/resolve-conflict data selection page"
```

---

### Task 9: Integrate conflict check into native sign-in flows

**Files:**
- Modify: `src/lib/native-auth.ts`

After authentication succeeds, call `check-conflict`. If conflict detected, store info in sessionStorage and navigate to `/auth/resolve-conflict`. If no conflict + local data exists, upload local data to new WID.

- [ ] **Step 1: Add conflict check helper to native-auth.ts**

Add at the bottom of `src/lib/native-auth.ts`:

```typescript
/**
 * After native sign-in, check for WID conflict and handle accordingly.
 * Returns the resolved user, or null if redirecting to conflict page.
 */
export async function handlePostSignIn(
  provider: "google" | "apple" | "line",
  providerUserId: string,
  authUser: any
): Promise<User | null> {
  const { apiFetch, resetLocalModeCache, apiUrl } = await import("@/lib/api-client");
  const { getLocalDataSummary, collectLocalData, fullSync } = await import("@/lib/sync");

  // Reset local mode cache since we now have a session
  resetLocalModeCache();

  // Get local data summary
  const localSummary = await getLocalDataSummary();

  // Check for conflict
  const checkRes = await apiFetch("/api/auth/check-conflict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, providerUserId }),
  });

  if (!checkRes.ok) {
    // Fallback: proceed without conflict check
    await fullSync();
    return authUser;
  }

  const checkResult = await checkRes.json();

  if (!checkResult.conflict) {
    // No conflict — upload local data if it exists, then sync
    const hasLocalData =
      localSummary.counts.clubs > 0 ||
      localSummary.counts.practices > 0 ||
      localSummary.counts.accessories > 0;

    if (hasLocalData) {
      // Upload local data to the server under the new account
      const localData = await collectLocalData();
      await apiFetch("/api/auth/upload-local-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localData }),
      });
    }

    await fullSync();
    return authUser;
  }

  // Conflict detected — navigate to resolve-conflict page
  const providerLabel =
    provider === "google" ? "Googleアカウント" :
    provider === "apple" ? "Appleアカウント" : "LINEアカウント";

  sessionStorage.setItem(
    "conflict_info",
    JSON.stringify({
      scenario: "first-signin",
      provider,
      providerUserId,
      sourceA: {
        label: "ローカルのデータ",
        isNew: false,
        wid: null,
        lastUpdated: localSummary.lastUpdated,
        counts: localSummary.counts,
      },
      sourceB: {
        label: `${providerLabel}のデータ`,
        isNew: true,
        wid: checkResult.existingUser.wid,
        lastUpdated: checkResult.existingUser.lastUpdated,
        counts: checkResult.existingUser.counts,
      },
    })
  );

  // Return null to signal caller to redirect
  return null;
}
```

- [ ] **Step 2: Update signInWithGoogle to use handlePostSignIn**

Replace the body of `signInWithGoogle` after Supabase `signInWithIdToken` succeeds. The key ordering is: auth → profile load/create → THEN conflict check. After `if (error) return { user: null, error: error.message };`:

```typescript
    const googleSub = data.user.user_metadata?.sub ?? data.user.id;

    // Load or create user profile FIRST (needed before conflict check)
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    let user = profile;
    if (!user) {
      // Check for linked account via resolve-google-user (existing orphan flow)
      try {
        const { apiFetch } = await import("@/lib/api-client");
        const res = await apiFetch("/api/auth/resolve-google-user", {
          method: "POST",
        });
        const result = await res.json();
        if (res.ok && result.found && result.user) {
          if (result.access_token) {
            await supabase.auth.setSession({
              access_token: result.access_token,
              refresh_token: result.refresh_token,
            });
          }
          user = result.user;
        }
      } catch (e) {
        console.error("resolve-google-user failed:", e);
      }
    }

    if (!user) {
      // Truly new user: create profile
      const { data: newProfile } = await supabase
        .from("users")
        .insert({
          id: data.user.id,
          line_user_id: `google-${data.user.id}`,
          google_email: data.user.email ?? null,
          display_name:
            data.user.user_metadata?.full_name ??
            data.user.email ??
            "ゲスト",
          avatar_url: data.user.user_metadata?.avatar_url ?? null,
        })
        .select()
        .single();
      user = newProfile;
    }

    // NOW check for conflict (user profile exists at this point)
    const resolvedUser = await handlePostSignIn("google", googleSub, user);
    if (!resolvedUser) {
      return { user: null, error: "__CONFLICT__" };
    }

    return { user: resolvedUser, error: null };
```

This preserves the existing orphan resolution flow while adding conflict check after profile is ready.

- [ ] **Step 3: Update signInWithApple similarly**

After `signInWithIdToken` succeeds, add the same pattern:

```typescript
    const appleSub = data.user.user_metadata?.sub ?? data.user.id;

    const resolvedUser = await handlePostSignIn("apple", appleSub, data.user);
    if (!resolvedUser) {
      return { user: null, error: "__CONFLICT__" };
    }
```

Then load profile normally.

- [ ] **Step 4: Update the caller (settings page / sign-in button) to handle __CONFLICT__**

Wherever `signInWithGoogle()` or `signInWithApple()` is called, add a check:

```typescript
const result = await signInWithGoogle();
if (result.error === "__CONFLICT__") {
  window.location.href = "/auth/resolve-conflict";
  return;
}
```

Check all callers — likely in the settings page and/or a login page component. Search for `signInWithGoogle` and `signInWithApple` calls.

- [ ] **Step 5: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/native-auth.ts
git commit -m "feat: integrate conflict check into native sign-in flows"
```

---

### Task 10: Integrate conflict check into account linking flow

**Files:**
- Modify: `src/app/settings/page.tsx`
- Modify: `src/app/auth/callback/route.ts`

Replace the existing merge page flow with the new resolve-conflict flow that shows data summaries.

- [ ] **Step 1: Update linkLine in settings page**

In `src/app/settings/page.tsx`, find the `linkLine` function inside `AccountLinking`. When `linkResult.needsConfirm` is true, instead of storing `merge_info` and going to `/auth/merge`, store `conflict_info` format and go to `/auth/resolve-conflict`:

```typescript
if (linkResult.needsConfirm) {
  // Fetch data summaries for both accounts
  const summaryRes = await apiFetch("/api/auth/data-summary");
  const currentSummary = summaryRes.ok ? await summaryRes.json() : { counts: { clubs: 0, practices: 0, accessories: 0 }, lastUpdated: null };

  sessionStorage.setItem("conflict_info", JSON.stringify({
    scenario: "account-linking",
    provider: "line",
    providerUserId: result.userId,
    sourceA: {
      label: "現在のアカウントのデータ",
      isNew: false,
      wid: user.id,
      lastUpdated: currentSummary.lastUpdated,
      counts: currentSummary.counts,
    },
    sourceB: {
      label: "LINEアカウントのデータ",
      isNew: true,
      wid: linkResult.existingAccount.id,
      lastUpdated: linkResult.existingAccount.lastUpdated ?? null,
      counts: linkResult.existingAccount.counts ?? { clubs: 0, practices: 0, accessories: 0 },
    },
  }));
  window.location.href = "/auth/resolve-conflict";
  return;
}
```

- [ ] **Step 2: Update the /api/auth/link POST to return data summaries in needsConfirm response**

In `src/app/api/auth/link/route.ts`, when returning `needsConfirm: true`, also include data summaries. Add calls to get counts:

```typescript
if (!body.confirmMerge) {
  // Get data summaries for both accounts
  const [currentCounts, existingCounts] = await Promise.all([
    getUserDataSummary(supabaseAdmin, currentUser.id),
    getUserDataSummary(supabaseAdmin, existingUser.id),
  ]);

  return NextResponse.json({
    needsConfirm: true,
    currentAccount: {
      id: currentUser.id,
      display_name: currentUser.display_name,
      ...currentCounts,
    },
    existingAccount: {
      id: existingUser.id,
      display_name: existingUser.display_name,
      ...existingCounts,
    },
  });
}
```

Add the `getUserDataSummary` helper to the file (same implementation as in check-conflict):

```typescript
async function getUserDataSummary(supabase: any, userId: string) {
  const [clubsRes, practicesRes, accessoriesRes] = await Promise.all([
    supabase.from("clubs").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("practice_sessions").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("accessories").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const [latestClub, latestPractice, latestAccessory] = await Promise.all([
    supabase.from("clubs").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("practice_sessions").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("accessories").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const dates = [
    latestClub.data?.created_at,
    latestPractice.data?.created_at,
    latestAccessory.data?.created_at,
  ].filter(Boolean) as string[];

  return {
    lastUpdated: dates.length > 0 ? dates.sort().reverse()[0] : null,
    counts: {
      clubs: clubsRes.count ?? 0,
      practices: practicesRes.count ?? 0,
      accessories: accessoriesRes.count ?? 0,
    },
  };
}
```

- [ ] **Step 3: Update handleGoogleLink in callback route**

In `src/app/auth/callback/route.ts`, when conflict is found (line ~96-103), instead of redirecting to `/auth/link-complete`, redirect to `/auth/resolve-conflict` with data summary info stored in a query param or cookie (since this is a server-side redirect, sessionStorage is not available).

Use a temporary URL-encoded query param approach:

```typescript
if (existingUser) {
  // Get data summaries
  const [currentSummary, existingSummary] = await Promise.all([
    getUserDataSummary(supabaseAdmin, originalUserId),
    getUserDataSummary(supabaseAdmin, existingUser.id),
  ]);

  const conflictInfo = JSON.stringify({
    scenario: "account-linking",
    provider: "google",
    providerUserId: googleId,
    sourceA: {
      label: "現在のアカウントのデータ",
      isNew: false,
      wid: originalUserId,
      lastUpdated: currentSummary.lastUpdated,
      counts: currentSummary.counts,
    },
    sourceB: {
      label: "Googleアカウントのデータ",
      isNew: true,
      wid: existingUser.id,
      lastUpdated: existingSummary.lastUpdated,
      counts: existingSummary.counts,
    },
  });

  // Store in a cookie for the client page to read
  const url = new URL(`${origin}/auth/resolve-conflict`);
  const response = NextResponse.redirect(url.toString());
  response.cookies.set("conflict_info", encodeURIComponent(conflictInfo), {
    path: "/",
    maxAge: 300, // 5 minutes
    httpOnly: false,
  });
  return response;
}
```

Then update `src/app/auth/resolve-conflict/page.tsx` to also read from the cookie:

In the `useEffect`, add cookie reading as fallback:

```typescript
useEffect(() => {
  let stored = sessionStorage.getItem("conflict_info");

  // Fallback: read from cookie (set by server-side redirect)
  if (!stored) {
    const cookieMatch = document.cookie.match(/conflict_info=([^;]+)/);
    if (cookieMatch) {
      stored = decodeURIComponent(cookieMatch[1]);
      // Move to sessionStorage and clear cookie
      sessionStorage.setItem("conflict_info", stored);
      document.cookie = "conflict_info=; path=/; max-age=0";
    }
  }

  if (stored) {
    setInfo(JSON.parse(stored));
  } else {
    window.location.href = "/";
  }
}, []);
```

Also add the same `getUserDataSummary` helper to `callback/route.ts`.

- [ ] **Step 4: Add /auth/resolve-conflict to linking flow skip list in auth-provider**

In `src/components/auth-provider.tsx`, add `/auth/resolve-conflict` to the `isLinkingFlow` check:

```typescript
const isLinkingFlow = typeof window !== "undefined" && (
  window.location.pathname.startsWith("/auth/link") ||
  window.location.pathname.startsWith("/auth/merge") ||
  window.location.pathname.startsWith("/auth/resolve-conflict") ||
  window.location.pathname.startsWith("/auth/line/callback")
);
```

- [ ] **Step 5: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/settings/page.tsx src/app/api/auth/link/route.ts src/app/auth/callback/route.ts src/app/auth/resolve-conflict/page.tsx src/components/auth-provider.tsx
git commit -m "feat: integrate conflict check into account linking flows"
```

---

### Task 11: Extract shared getUserDataSummary to avoid duplication

**Files:**
- Create: `src/lib/user-data-summary.ts`
- Modify: `src/app/api/auth/check-conflict/route.ts`
- Modify: `src/app/api/auth/resolve-conflict/route.ts`
- Modify: `src/app/api/auth/data-summary/route.ts`
- Modify: `src/app/api/auth/link/route.ts`
- Modify: `src/app/auth/callback/route.ts`

The `getUserDataSummary` function is duplicated across 4+ files. Extract it.

- [ ] **Step 1: Create shared module**

Create `src/lib/user-data-summary.ts`:

```typescript
/**
 * Shared helper to get data counts and last updated for a user.
 * Used by conflict-check, resolve-conflict, data-summary, and link APIs.
 */
export async function getUserDataSummary(supabase: any, userId: string) {
  const [clubsRes, practicesRes, accessoriesRes] = await Promise.all([
    supabase.from("clubs").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("practice_sessions").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("accessories").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const [latestClub, latestPractice, latestAccessory] = await Promise.all([
    supabase.from("clubs").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("practice_sessions").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("accessories").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const dates = [
    latestClub.data?.created_at,
    latestPractice.data?.created_at,
    latestAccessory.data?.created_at,
  ].filter(Boolean) as string[];

  return {
    lastUpdated: dates.length > 0 ? dates.sort().reverse()[0] : null,
    counts: {
      clubs: clubsRes.count ?? 0,
      practices: practicesRes.count ?? 0,
      accessories: accessoriesRes.count ?? 0,
    },
  };
}
```

- [ ] **Step 2: Replace all local copies with imports**

In each file that has a local `getUserDataSummary`, replace with:

```typescript
import { getUserDataSummary } from "@/lib/user-data-summary";
```

And delete the local function definition.

Files to update:
- `src/app/api/auth/check-conflict/route.ts`
- `src/app/api/auth/data-summary/route.ts`
- `src/app/api/auth/link/route.ts`
- `src/app/auth/callback/route.ts`

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/user-data-summary.ts src/app/api/auth/check-conflict/route.ts src/app/api/auth/data-summary/route.ts src/app/api/auth/link/route.ts src/app/auth/callback/route.ts
git commit -m "refactor: extract shared getUserDataSummary helper"
```

---

### Task 12: Manual integration testing

No automated E2E tests — verify the flows manually on the native app.

- [ ] **Step 1: Test first sign-in (no conflict)**

1. Clear app data / fresh install
2. Create some local clubs and accessories
3. Sign in with a Google account that has NO existing Waggly account
4. Verify: local data appears on server, no selection UI shown

- [ ] **Step 2: Test first sign-in (conflict)**

1. Clear app data / fresh install
2. Create some local clubs
3. Sign in with a Google account that HAS an existing Waggly account with different data
4. Verify: selection UI appears with correct counts and timestamps
5. Choose "local data" → verify local data replaces server data
6. Repeat and choose "server data" → verify server data preserved, local data gone

- [ ] **Step 3: Test account linking (conflict)**

1. Log in with LINE
2. Link a Google account that belongs to a different Waggly user
3. Verify: selection UI appears with data summaries for both accounts
4. Choose one → verify loser account is fully deleted, winner has the linked provider

- [ ] **Step 4: Test cancel**

1. Trigger conflict (either flow)
2. Press cancel
3. Verify: returned to previous state, no data changed

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during integration testing"
```
