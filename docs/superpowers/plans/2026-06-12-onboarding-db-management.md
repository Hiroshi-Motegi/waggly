# Onboarding DB Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move onboarding version tracking from localStorage to DB for cross-device/multi-account support

**Architecture:** Add `onboarding_version` column to users table (Supabase + SQLite), create API endpoint for completion, update app-shell to use `Math.max(localStorage, DB)` for flicker-free judgment, clear localStorage on logout to prevent cross-account leakage.

**Tech Stack:** TypeScript, Next.js, Supabase, SQLite (Capacitor), React

---

## File Structure

| File | Responsibility |
|---|---|
| Modify: `src/types/database.ts` | Add `onboarding_version` to User type |
| Modify: `src/lib/sqlite/schema.ts` | Add V5 migration for SQLite |
| Modify: `src/lib/sqlite/migrations.ts` | Register V5 migration |
| Create: `src/app/api/auth/onboarding-complete/route.ts` | API to record completion |
| Modify: `src/components/app-shell.tsx` | DB-based judgment + localStorage merge |
| Modify: `src/lib/liff.ts` | Clear localStorage on logout |

---

### Task 1: Schema changes (User type + SQLite migration)

**Files:**
- Modify: `src/types/database.ts:11-18`
- Modify: `src/lib/sqlite/schema.ts:1-2`
- Modify: `src/lib/sqlite/migrations.ts:2,4-9`

- [ ] **Step 1: Add onboarding_version to User type**

In `src/types/database.ts`, add the field to the User interface:

```typescript
// Before:
export interface User {
  id: string;
  display_name: string;
  avatar_url: string | null;
  google_email: string | null;
  agreed_terms_at: string | null;
  created_at: string;
}

// After:
export interface User {
  id: string;
  display_name: string;
  avatar_url: string | null;
  google_email: string | null;
  agreed_terms_at: string | null;
  onboarding_version: number;
  created_at: string;
}
```

- [ ] **Step 2: Add SQLite V5 migration**

In `src/lib/sqlite/schema.ts`, bump version and add migration:

```typescript
// Before:
/** Schema version — increment when adding migrations. */
export const SCHEMA_VERSION = 4;

// After:
/** Schema version — increment when adding migrations. */
export const SCHEMA_VERSION = 5;
```

Add after the `SCHEMA_V4` export:

```typescript
export const SCHEMA_V5 = `
ALTER TABLE users ADD COLUMN onboarding_version INTEGER DEFAULT 0;
UPDATE users SET onboarding_version = 2;
`;
```

Note: The `users` table in SCHEMA_V1 doesn't have this column, so V5 adds it. Existing local users get set to `2` (current ONBOARDING_VERSION) to avoid re-display.

- [ ] **Step 3: Register V5 migration**

In `src/lib/sqlite/migrations.ts`:

```typescript
// Before:
import { SCHEMA_VERSION, SCHEMA_V1, SCHEMA_V2, SCHEMA_V3, SCHEMA_V4 } from "./schema";

const MIGRATIONS: Record<number, string> = {
  1: SCHEMA_V1,
  2: SCHEMA_V2,
  3: SCHEMA_V3,
  4: SCHEMA_V4,
};

// After:
import { SCHEMA_VERSION, SCHEMA_V1, SCHEMA_V2, SCHEMA_V3, SCHEMA_V4, SCHEMA_V5 } from "./schema";

const MIGRATIONS: Record<number, string> = {
  1: SCHEMA_V1,
  2: SCHEMA_V2,
  3: SCHEMA_V3,
  4: SCHEMA_V4,
  5: SCHEMA_V5,
};
```

- [ ] **Step 4: Run Supabase migration**

Run this SQL on the Supabase dashboard (SQL Editor):

```sql
ALTER TABLE users ADD COLUMN onboarding_version INTEGER DEFAULT 0 NOT NULL;
UPDATE users SET onboarding_version = 2;
```

This is a manual step — not automated in code. Verify with:
```sql
SELECT id, display_name, onboarding_version FROM users LIMIT 5;
```

- [ ] **Step 5: Commit**

```bash
git add src/types/database.ts src/lib/sqlite/schema.ts src/lib/sqlite/migrations.ts
git commit -m "feat: add onboarding_version column to users table

Add to User type, SQLite V5 migration, Supabase migration (manual).
Existing users set to 2 (current ONBOARDING_VERSION)."
```

---

### Task 2: Create onboarding-complete API

**Files:**
- Create: `src/app/api/auth/onboarding-complete/route.ts`

- [ ] **Step 1: Create the API route**

```typescript
// src/app/api/auth/onboarding-complete/route.ts
import { NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { ONBOARDING_VERSION } from "@/lib/constants";

export async function POST() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();

  const { error } = await auth.supabase
    .from("users")
    .update({ onboarding_version: ONBOARDING_VERSION })
    .eq("id", auth.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, onboarding_version: ONBOARDING_VERSION });
}
```

- [ ] **Step 2: Build and verify**

Run: `npx next build 2>&1 | tail -5`

Expected: build succeeds

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/auth/onboarding-complete/route.ts"
git commit -m "feat: add POST /api/auth/onboarding-complete endpoint"
```

---

### Task 3: Update app-shell.tsx — DB-based judgment with localStorage merge

**Files:**
- Modify: `src/components/app-shell.tsx`

- [ ] **Step 1: Add useRef import and merge effect**

Add `useRef` to the React import:

```typescript
// Before:
import { useState, useEffect } from "react";

// After:
import { useState, useEffect, useRef } from "react";
```

- [ ] **Step 2: Add merge effect after the existing localStorage useEffect**

Add this after the `useEffect` that reads `onboarding_version` from localStorage (after line 26):

```typescript
  // Merge localStorage → DB on login (one-time)
  const mergedRef = useRef(false);
  useEffect(() => {
    if (!user || mergedRef.current) return;
    mergedRef.current = true;
    const localVersion = parseInt(localStorage.getItem("onboarding_version") || "0", 10);
    if (localVersion > (user.onboarding_version ?? 0)) {
      apiFetch("/api/auth/onboarding-complete", { method: "POST" }).catch(() => {});
    }
  }, [user]);
```

- [ ] **Step 3: Replace Gate 1 (onboarding) judgment logic**

Replace the current Gate 1 block (lines 98-110):

```typescript
  // Before:
  // Gate 1: Onboarding (app intro) — localStorage only, login state irrelevant
  if (!onboardingDone) {
    return (
      <div className={`min-h-dvh border-x border-border shadow-sm bg-background ${native ? "w-full" : "mx-auto max-w-md"}`}>
        <Onboarding
          onComplete={() => {
            localStorage.setItem("onboarding_version", String(ONBOARDING_VERSION));
            setOnboardingDone(true);
          }}
        />
      </div>
    );
  }

  // After:
  // Gate 1: Onboarding — use max(localStorage, DB) for flicker-free judgment
  const effectiveOnboardingVersion = user
    ? Math.max(
        parseInt(localStorage.getItem("onboarding_version") || "0", 10),
        user.onboarding_version ?? 0
      )
    : parseInt(localStorage.getItem("onboarding_version") || "0", 10);
  const needsOnboarding = effectiveOnboardingVersion < ONBOARDING_VERSION;

  // Wait for user data before judging (prevents flash of onboarding for logged-in users)
  if (!native && isLoading) {
    return (
      <div className="mx-auto max-w-md min-h-dvh flex items-center justify-center bg-[#ebf1eb]">
        <Loading />
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <div className={`min-h-dvh border-x border-border shadow-sm bg-background ${native ? "w-full" : "mx-auto max-w-md"}`}>
        <Onboarding
          onComplete={async () => {
            if (user) {
              try {
                await apiFetch("/api/auth/onboarding-complete", { method: "POST" });
                localStorage.setItem("onboarding_version", String(ONBOARDING_VERSION));
              } catch {
                // API failed — don't update localStorage, retry next time
              }
              window.location.reload();
            } else {
              localStorage.setItem("onboarding_version", String(ONBOARDING_VERSION));
              setOnboardingDone(true);
            }
          }}
        />
      </div>
    );
  }
```

- [ ] **Step 4: Remove the now-duplicate loading check**

The loading check was previously at lines 132-138. Since we now check `isLoading` before the onboarding gate, remove the duplicate:

```typescript
  // DELETE this block (it's now handled above):
  // Show loading (web only, after onboarding check)
  if (isLoading && !native) {
    return (
      <div className="mx-auto max-w-md min-h-dvh flex items-center justify-center bg-[#ebf1eb]">
        <Loading />
      </div>
    );
  }
```

- [ ] **Step 5: Build and verify**

Run: `npx next build 2>&1 | tail -5`

Expected: build succeeds

- [ ] **Step 6: Commit**

```bash
git add src/components/app-shell.tsx
git commit -m "feat: use DB onboarding_version with localStorage fallback

Use max(localStorage, DB) for flicker-free judgment.
Merge localStorage → DB on login (one-time via useRef).
API-first on completion: success → localStorage update.
Move loading check before onboarding gate to prevent flash."
```

---

### Task 4: Clear localStorage on logout

**Files:**
- Modify: `src/lib/liff.ts:53`

- [ ] **Step 1: Add localStorage cleanup**

In `src/lib/liff.ts`, add `onboarding_version` removal alongside existing cleanup:

```typescript
// Before (lines 52-54):
  // Clear login method and dev mode flags
  localStorage.removeItem("login_method");
  localStorage.setItem("dev-logged-in", "false");

// After:
  // Clear login method, dev mode, and onboarding flags
  localStorage.removeItem("login_method");
  localStorage.removeItem("onboarding_version");
  localStorage.setItem("dev-logged-in", "false");
```

- [ ] **Step 2: Build and verify**

Run: `npx next build 2>&1 | tail -5`

Expected: build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/lib/liff.ts
git commit -m "fix: clear onboarding_version from localStorage on logout

Prevents cross-account leakage when different users log in
on the same browser."
```
