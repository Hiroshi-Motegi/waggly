# Performance + Security Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix SQL injection vulnerabilities and improve query/rendering performance in the Waggly app

**Architecture:** Four independent changes to `api-client.ts` (security + N+1), one to `bag/[clubId]/page-client.tsx` (API parallelization), one to `bag/page.tsx` (useMemo). All are internal changes with no UI impact.

**Tech Stack:** TypeScript, SQLite (Capacitor), React, SWR

---

### Task 1: Fix SQL injection — parameterize all string-interpolated queries

**Files:**
- Modify: `src/lib/api-client.ts:108-124,440-447`

- [ ] **Step 1: Fix clubs GET handler (lines 108-124)**

Replace the clubs GET handler query building:

```typescript
// Before (lines 114-115):
if (status) conds.push(`status = '${status}'`);
if (bagNum) conds.push(`bag_number = ${bagNum}`);
// ...
const clubs = await q(sql);

// After:
const values: any[] = [];
if (status) { conds.push("status = ?"); values.push(status); }
if (bagNum) { conds.push("bag_number = ?"); values.push(Number(bagNum)); }
if (conds.length) sql += " WHERE " + conds.join(" AND ");
sql += " ORDER BY sort_order ASC";
const clubs = await q(sql, values);
```

- [ ] **Step 2: Fix accessories GET handler (lines 440-447)**

Replace the accessories GET handler:

```typescript
// Before (lines 444-447):
if (status) sql += ` WHERE status = '${status}'`;
sql += " ORDER BY created_at DESC";
return q(sql);

// After:
const params2: any[] = [];
if (status) { sql += " WHERE status = ?"; params2.push(status); }
sql += " ORDER BY created_at DESC";
return q(sql, params2);
```

- [ ] **Step 3: Add column whitelist to clubs PATCH handler (lines 152-163)**

```typescript
// Before (line 155):
const fields = Object.keys(body).filter((k) => k !== "id");

// After:
const CLUB_COLUMNS = new Set([
  "category", "club_number", "maker", "model", "shaft_name", "shaft_flex",
  "loft", "lie", "length", "distance", "release_year", "memo",
  "purchase_date", "purchase_shop", "purchase_price", "status", "bag_number",
  "weight", "swing_weight", "frequency", "kick_point", "head_volume",
  "head_weight", "rating", "sort_order",
]);
const fields = Object.keys(body).filter((k) => k !== "id" && CLUB_COLUMNS.has(k));
```

- [ ] **Step 4: Add column whitelist to accessories PATCH handler (lines 469-479)**

```typescript
// Before (line 471):
const fields = Object.keys(body).filter((k) => k !== "id");

// After:
const ACCESSORY_COLUMNS = new Set([
  "category", "brand", "model", "memo", "rating", "status", "purchase_url", "image_url",
]);
const fields = Object.keys(body).filter((k) => k !== "id" && ACCESSORY_COLUMNS.has(k));
```

- [ ] **Step 5: Run existing tests**

Run: `npx vitest run __tests__/lib/api-client.test.ts`

Expected: existing tests still pass (query string changes should not affect test behavior since tests mock the query function)

- [ ] **Step 6: Commit**

```bash
git add src/lib/api-client.ts
git commit -m "security: parameterize SQL queries and add column whitelists

Fix string interpolation in clubs/accessories GET handlers.
Add CLUB_COLUMNS/ACCESSORY_COLUMNS whitelists to PATCH handlers
to prevent column-name injection."
```

---

### Task 2: Fix N+1 queries — batch image fetching and parallelize single club fetch

**Files:**
- Modify: `src/lib/api-client.ts:118-124,142-149`

- [ ] **Step 1: Replace N+1 image loop with batch IN query (lines 118-124)**

```typescript
// Before (lines 118-124):
// Attach images for each club
for (const c of clubs) {
  const imgs = await q("SELECT * FROM club_images WHERE club_id = ? ORDER BY is_primary DESC", [c.id]);
  c.club_images = imgs;
}
return clubs;

// After:
// Batch-fetch all images in one query
const clubIds = clubs.map((c: any) => c.id);
if (clubIds.length > 0) {
  const placeholders = clubIds.map(() => "?").join(",");
  const allImages = await q(
    `SELECT * FROM club_images WHERE club_id IN (${placeholders}) ORDER BY is_primary DESC`,
    clubIds
  );
  const imagesByClub = new Map<string, any[]>();
  for (const img of allImages) {
    if (!imagesByClub.has(img.club_id)) imagesByClub.set(img.club_id, []);
    imagesByClub.get(img.club_id)!.push(img);
  }
  for (const c of clubs) {
    c.club_images = imagesByClub.get(c.id) ?? [];
  }
} else {
  for (const c of clubs) c.club_images = [];
}
return clubs;
```

- [ ] **Step 2: Parallelize single club fetch (lines 142-149)**

```typescript
// Before (lines 144-149):
const rows = await q("SELECT * FROM clubs WHERE id = ?", [match[1]]);
if (!rows.length) return null;
const images = await q("SELECT * FROM club_images WHERE club_id = ? ORDER BY is_primary DESC", [match[1]]);
const maintenances = await q("SELECT * FROM maintenances WHERE club_id = ? ORDER BY done_at DESC", [match[1]]);
return { ...rows[0], club_images: images, maintenances };

// After:
const rows = await q("SELECT * FROM clubs WHERE id = ?", [match[1]]);
if (!rows.length) return null;
const [images, maintenances] = await Promise.all([
  q("SELECT * FROM club_images WHERE club_id = ? ORDER BY is_primary DESC", [match[1]]),
  q("SELECT * FROM maintenances WHERE club_id = ? ORDER BY done_at DESC", [match[1]]),
]);
return { ...rows[0], club_images: images, maintenances };
```

- [ ] **Step 3: Run existing tests**

Run: `npx vitest run __tests__/lib/api-client.test.ts`

Expected: pass

- [ ] **Step 4: Commit**

```bash
git add src/lib/api-client.ts
git commit -m "perf: batch club image queries and parallelize single club fetch

Replace N+1 image loop (14 queries) with single IN query.
Parallelize image + maintenance fetch for single club detail."
```

---

### Task 3: Parallelize API calls on club detail page

**Files:**
- Modify: `src/app/bag/[clubId]/page-client.tsx:83-106`

- [ ] **Step 1: Replace fire-and-forget calls with Promise.all**

```typescript
// Before (lines 83-106):
useEffect(() => {
  if (!club) return;
  apiFetch(`/api/clubs/${clubId}/summary`)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data && (data.totalBalls > 0 || data.memoCount > 0)) setHasSummary(true);
    })
    .catch(() => {});
  apiFetch(`/api/clubs/${clubId}/history`)
    .then((res) => (res.ok ? res.json() : []))
    .then((data: ActivityItem[]) => {
      setActivityCount(data.length);
      setActivity(data.slice(0, 3));
      const dist = data.find((d) =>
        (d.type === "memo" && d.distance != null) ||
        (d.type === "practice" && d.avg_distance != null)
      );
      if (dist) {
        setLatestDistance(dist.type === "memo" ? dist.distance! : dist.avg_distance!);
      }
    })
    .catch(() => {})
    .finally(() => setActivityLoading(false));
}, [clubId, club]);

// After:
useEffect(() => {
  if (!club) return;
  Promise.all([
    apiFetch(`/api/clubs/${clubId}/summary`).then((r) => r.ok ? r.json() : null),
    apiFetch(`/api/clubs/${clubId}/history`).then((r) => r.ok ? r.json() : []),
  ]).then(([summaryData, historyData]) => {
    if (summaryData && (summaryData.totalBalls > 0 || summaryData.memoCount > 0)) {
      setHasSummary(true);
    }
    const data = historyData as ActivityItem[];
    setActivityCount(data.length);
    setActivity(data.slice(0, 3));
    const dist = data.find((d) =>
      (d.type === "memo" && d.distance != null) ||
      (d.type === "practice" && d.avg_distance != null)
    );
    if (dist) {
      setLatestDistance(dist.type === "memo" ? dist.distance! : dist.avg_distance!);
    }
  }).catch(() => {}).finally(() => setActivityLoading(false));
}, [clubId, club]);
```

- [ ] **Step 2: Build and verify**

Run: `npx next build 2>&1 | tail -5`

Expected: build succeeds

- [ ] **Step 3: Commit**

```bash
git add "src/app/bag/[clubId]/page-client.tsx"
git commit -m "perf: parallelize summary/history API calls on club detail page

Replace fire-and-forget x2 with Promise.all so loading state
correctly waits for both requests to complete."
```

---

### Task 4: Add useMemo to chart data computations

**Files:**
- Modify: `src/app/bag/page.tsx:4,187-191`

- [ ] **Step 1: Add useMemo import**

```typescript
// Before (line 4):
import { useState } from "react";

// After:
import { useMemo, useState } from "react";
```

- [ ] **Step 2: Memoize bagClubs and downstream computations (lines 187-191)**

```typescript
// Before (lines 187-191):
const bagClubs = clubs.filter((c) => c.status === "bag" && c.bag_number === (statusFilter === "bag2" ? 2 : 1));
const distanceData = getDistanceStaircaseData(bagClubs);
const weightData = getWeightFlowData(bagClubs);
const distanceInsights = getDistanceInsights(distanceData);
const weightInsights = getWeightInsights(weightData);

// After:
const bagClubs = useMemo(
  () => clubs.filter((c) => c.status === "bag" && c.bag_number === (statusFilter === "bag2" ? 2 : 1)),
  [clubs, statusFilter]
);
const distanceData = useMemo(() => getDistanceStaircaseData(bagClubs), [bagClubs]);
const weightData = useMemo(() => getWeightFlowData(bagClubs), [bagClubs]);
const distanceInsights = useMemo(() => getDistanceInsights(distanceData), [distanceData]);
const weightInsights = useMemo(() => getWeightInsights(weightData), [weightData]);
```

- [ ] **Step 3: Build and verify**

Run: `npx next build 2>&1 | tail -5`

Expected: build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/app/bag/page.tsx
git commit -m "perf: memoize bagClubs filter and chart data computations

Add useMemo to bagClubs (prevents new array on every render) and
chain memoization through chart data + insights calculations."
```
