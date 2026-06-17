# Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Waggly admin panel with a sidebar + table list + edit page CRUD pattern, replacing the current card-based UI.

**Architecture:** Admin layout with fixed dark sidebar (220px) + content area. List pages use TanStack Table with pagination/sort. Edit pages are separate routes (`/admin/specs/[id]`). Data flows through existing API routes via `apiFetch`, cached with SWR. Action logic (AI refresh, Rakuten lookup, etc.) extracted into reusable hooks.

**Tech Stack:** SWR (existing), @tanstack/react-table v8 (new), Tailwind CSS + existing shadcn components, Next.js App Router

**Spec:** `docs/superpowers/specs/2026-06-17-admin-panel-design.md`

---

## File Structure

### New files

```
src/app/admin/
  layout.tsx                          — Admin layout with sidebar
  page.tsx                            — Redirect to /admin/specs

src/components/admin/
  admin-sidebar.tsx                   — Sidebar navigation
  admin-table.tsx                     — TanStack Table wrapper (sort, pagination, empty state)
  admin-breadcrumb.tsx                — Breadcrumb navigation
  admin-form-section.tsx              — Section header + white card wrapper

src/hooks/admin/
  use-admin-list.ts                   — SWR hook for paginated lists
  use-spec-actions.ts                 — Spec action hooks (refresh, rakuten, lock)
  use-series-actions.ts               — Series action hooks

src/app/admin/specs/
  page.tsx                            — Specs table list (replaces current page.tsx + page-client.tsx)
  [id]/page.tsx                       — Spec edit page (new)

src/app/admin/series/
  page.tsx                            — Series table list (replaces current)
  [id]/page.tsx                       — Series edit page (new)

src/app/api/admin/specs/[id]/route.ts — GET single spec
src/app/api/admin/series/[id]/route.ts — GET single series
```

### Modified files

```
src/lib/supabase/middleware.ts        — Remove /admin from public routes
src/app/api/admin/specs/route.ts      — Add pagination/sort/filter to GET
src/app/api/admin/series/route.ts     — Add pagination to GET
```

### Deleted files (after all migrations complete)

```
src/app/admin/specs/page-client.tsx   — Replaced by new page.tsx + [id]/page.tsx
src/app/admin/series/page-client.tsx  — Replaced by new page.tsx + [id]/page.tsx
```

---

### Task 1: Install TanStack Table

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install package**

```bash
npm install @tanstack/react-table
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('@tanstack/react-table'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @tanstack/react-table for admin panel"
```

---

### Task 2: Add admin auth guard in middleware

**Files:**
- Modify: `src/lib/supabase/middleware.ts:35-46`

- [ ] **Step 1: Remove /admin from public routes**

In `src/lib/supabase/middleware.ts`, change the `isPublic` check. Remove the line `pathname.startsWith("/admin") ||`:

```typescript
    const isPublic =
      pathname === "/" ||
      pathname === "/login" ||
      pathname.startsWith("/auth/") ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/p/") ||
      pathname.startsWith("/help") ||
      pathname.startsWith("/report") ||
      pathname === "/terms" ||
      pathname === "/privacy" ||
      pathname === "/legal";
```

Now unauthenticated users hitting `/admin/*` will be redirected to `/`.

- [ ] **Step 2: Verify build**

```bash
npx next build 2>&1 | grep -E "error|Error|✓" | tail -5
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/middleware.ts
git commit -m "fix: protect /admin routes with auth middleware"
```

---

### Task 3: Admin layout + sidebar

**Files:**
- Create: `src/components/admin/admin-sidebar.tsx`
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`

- [ ] **Step 1: Create AdminSidebar component**

Create `src/components/admin/admin-sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const SPEC_CATEGORIES = [
  { value: "", label: "すべて" },
  { value: "driver", label: "ドライバー" },
  { value: "fairway_wood", label: "フェアウェイウッド" },
  { value: "utility", label: "ユーティリティ" },
  { value: "iron", label: "アイアン" },
  { value: "wedge", label: "ウェッジ" },
  { value: "putter", label: "パター" },
];

interface NavItem {
  href: string;
  label: string;
  match: (pathname: string, searchParams: URLSearchParams) => boolean;
}

export function AdminSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const specItems: NavItem[] = SPEC_CATEGORIES.map((cat) => ({
    href: cat.value ? `/admin/specs?category=${cat.value}` : "/admin/specs",
    label: cat.label,
    match: (p, sp) => p.startsWith("/admin/specs") && (sp.get("category") ?? "") === cat.value,
  }));

  const sections = [
    { title: "クラブスペック", items: specItems },
    {
      title: "シリーズ",
      items: [
        { href: "/admin/series", label: "シリーズ一覧", match: (p: string) => p.startsWith("/admin/series") },
      ],
    },
    {
      title: "その他",
      items: [
        { href: "/admin/knowledge", label: "ナレッジ", match: (p: string) => p.startsWith("/admin/knowledge") },
      ],
    },
  ];

  return (
    <aside className="w-[220px] shrink-0 bg-[#1a1a1a] text-white h-screen sticky top-0 overflow-y-auto">
      <div className="p-4">
        <Link href="/admin" className="text-sm font-bold text-[#7cb668]">
          Waggly Admin
        </Link>
      </div>
      <nav className="px-3 pb-4 space-y-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-[10px] uppercase text-[#888] px-2 mb-1">{section.title}</p>
            {section.items.map((item) => {
              const active = item.match(pathname, searchParams);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-2 py-1.5 rounded-md text-sm ${
                    active ? "bg-[#006728] text-white font-bold" : "text-[#ccc] hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Create admin layout**

Create `src/app/admin/layout.tsx`:

```tsx
import { Suspense } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f5f5f5]">
      <Suspense>
        <AdminSidebar />
      </Suspense>
      <main className="flex-1 min-w-0 p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Create admin index redirect**

Create `src/app/admin/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function AdminPage() {
  redirect("/admin/specs");
}
```

- [ ] **Step 4: Verify build and check sidebar renders**

```bash
npx next build 2>&1 | grep -E "error|Error|✓" | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/admin-sidebar.tsx src/app/admin/layout.tsx src/app/admin/page.tsx
git commit -m "feat: admin layout with sidebar navigation"
```

---

### Task 4: Shared admin components

**Files:**
- Create: `src/components/admin/admin-table.tsx`
- Create: `src/components/admin/admin-breadcrumb.tsx`
- Create: `src/components/admin/admin-form-section.tsx`

- [ ] **Step 1: Create AdminTable component**

Create `src/components/admin/admin-table.tsx`:

```tsx
"use client";

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";

interface AdminTableProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];
  total: number;
  page: number;
  pageSize: number;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  onPageChange: (page: number) => void;
}

export function AdminTable<T>({
  data,
  columns,
  total,
  page,
  pageSize,
  sorting,
  onSortingChange,
  onPageChange,
}: AdminTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    state: { sorting },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      onSortingChange(next);
    },
  });

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="bg-white rounded-lg border border-[#e5e5e5] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-[#e5e5e5] bg-[#fafafa]">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2 text-left text-[11px] text-[#888] font-medium cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string] ?? ""}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-[#8b8b8b]">
                  データがありません
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm text-[#888]">
          <span>{total}件中 {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)}件表示</span>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`px-2.5 py-1 rounded text-xs ${
                  p === page ? "bg-[#006728] text-white font-bold" : "border border-[#ddd] hover:bg-[#f5f5f5]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create AdminBreadcrumb component**

Create `src/components/admin/admin-breadcrumb.tsx`:

```tsx
import Link from "next/link";

interface Crumb {
  label: string;
  href?: string;
}

export function AdminBreadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="text-xs text-[#888] mb-2">
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-1">&gt;</span>}
          {item.href ? (
            <Link href={item.href} className="text-[#006728] hover:underline">{item.label}</Link>
          ) : (
            <span>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
```

- [ ] **Step 3: Create AdminFormSection component**

Create `src/components/admin/admin-form-section.tsx`:

```tsx
export function AdminFormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-[#e5e5e5] p-4 space-y-3">
      <h3 className="text-sm font-bold text-[#006728]">{title}</h3>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
npx next build 2>&1 | grep -E "error|Error|✓" | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/
git commit -m "feat: admin shared components (table, breadcrumb, form section)"
```

---

### Task 5: API route extensions (pagination, individual GET)

**Files:**
- Modify: `src/app/api/admin/specs/route.ts:12-28` (GET handler)
- Create: `src/app/api/admin/specs/[id]/route.ts`
- Modify: `src/app/api/admin/series/route.ts:12-29` (GET handler)
- Create: `src/app/api/admin/series/[id]/route.ts`

- [ ] **Step 1: Add pagination to specs GET**

Replace the GET handler in `src/app/api/admin/specs/route.ts`:

```typescript
export async function GET(request: NextRequest) {
  const admin = getAdmin();
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20", 10);
  const sort = url.searchParams.get("sort") ?? "maker";
  const order = url.searchParams.get("order") === "desc" ? false : true; // true = ascending
  const category = url.searchParams.get("category");

  let query = admin
    .from("club_specs")
    .select("*, series:club_spec_series(*)", { count: "exact" });

  if (category) query = query.eq("category", category);

  query = query
    .order(sort, { ascending: order })
    .order("model", { ascending: true })
    .order("club_number", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, pageSize });
}
```

Note: This changes the response shape from a flat array to `{ data, total, page, pageSize }`. The existing admin page-client.tsx will break — this is expected, as it will be replaced in Task 7.

Also add `NextRequest` import if missing (check existing imports — it's already imported for PATCH).

- [ ] **Step 2: Create individual spec GET route**

Create `src/app/api/admin/specs/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = getAdmin();
  const { data, error } = await admin
    .from("club_specs")
    .select("*, series:club_spec_series(*)")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
```

- [ ] **Step 3: Add pagination to series GET**

Replace the GET handler in `src/app/api/admin/series/route.ts`:

```typescript
export async function GET(request: NextRequest) {
  const admin = getAdmin();
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20", 10);
  const sort = url.searchParams.get("sort") ?? "maker";
  const order = url.searchParams.get("order") === "desc" ? false : true;

  const { data, error, count } = await admin
    .from("club_spec_series")
    .select("*, club_specs(id, category, club_number, loft, verified)", { count: "exact" })
    .order(sort, { ascending: order })
    .order("model", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = (data ?? []).map((s: any) => {
    const specs = (s.club_specs ?? []).sort((a: any, b: any) =>
      (a.club_number ?? "").localeCompare(b.club_number ?? "")
    );
    return { ...s, specs, spec_count: specs.length, club_specs: undefined };
  });
  return NextResponse.json({ data: result, total: count ?? 0, page, pageSize });
}
```

Add `NextRequest` to the import statement at the top of the file.

- [ ] **Step 4: Create individual series GET route**

Create `src/app/api/admin/series/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = getAdmin();
  const { data, error } = await admin
    .from("club_spec_series")
    .select("*, club_specs(id, category, club_number, loft, verified)")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const specs = (data.club_specs ?? []).sort((a: any, b: any) =>
    (a.club_number ?? "").localeCompare(b.club_number ?? "")
  );

  return NextResponse.json({ ...data, specs, spec_count: specs.length, club_specs: undefined });
}
```

- [ ] **Step 5: Verify build**

```bash
npx next build 2>&1 | grep -E "error|Error|✓" | tail -5
```

Note: Build may show warnings about the old page-client.tsx consuming the changed API shape. That's expected — it will be replaced in the next tasks.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/specs/ src/app/api/admin/series/
git commit -m "feat: admin API pagination, sort, filter + individual GET routes"
```

---

### Task 6: Admin data hooks

**Files:**
- Create: `src/hooks/admin/use-admin-list.ts`
- Create: `src/hooks/admin/use-spec-actions.ts`
- Create: `src/hooks/admin/use-series-actions.ts`

- [ ] **Step 1: Create useAdminList hook**

Create `src/hooks/admin/use-admin-list.ts`:

```typescript
import useSWR from "swr";
import { apiFetch } from "@/lib/api-client";

interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function useAdminList<T>(
  resource: string,
  params: Record<string, string | number> = {},
) {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== "" && v !== undefined) query.set(k, String(v));
  }
  const qs = query.toString();
  const key = `/api/admin/${resource}${qs ? `?${qs}` : ""}`;

  return useSWR<ListResponse<T>>(key, async (url: string) => {
    const res = await apiFetch(url);
    if (!res.ok) throw new Error("Fetch failed");
    return res.json();
  });
}

export function useAdminOne<T>(resource: string, id: string) {
  return useSWR<T>(id ? `/api/admin/${resource}/${id}` : null, async (url: string) => {
    const res = await apiFetch(url);
    if (!res.ok) throw new Error("Fetch failed");
    return res.json();
  });
}
```

- [ ] **Step 2: Create useSpecActions hook**

Create `src/hooks/admin/use-spec-actions.ts`:

```typescript
import { apiFetch } from "@/lib/api-client";

export function useSpecActions(specId: string, onSuccess?: () => void) {
  async function patchSpec(action: string, data?: Record<string, any>) {
    const res = await apiFetch("/api/admin/specs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: specId, action, data }),
    });
    if (res.ok && onSuccess) onSuccess();
    return res;
  }

  return {
    updateSpec: (data: Record<string, any>) => patchSpec("update", data),
    refreshSpec: () => patchSpec("refresh_spec"),
    refreshImage: () => patchSpec("refresh_image"),
    lookupRakuten: (url: string) => patchSpec("lookup_rakuten", { url }),
    toggleVerified: (current: boolean) => patchSpec("update", { verified: !current }),
  };
}
```

- [ ] **Step 3: Create useSeriesActions hook**

Create `src/hooks/admin/use-series-actions.ts`:

```typescript
import { apiFetch } from "@/lib/api-client";

export function useSeriesActions(seriesId: string, onSuccess?: () => void) {
  async function patchSeries(action: string, data?: Record<string, any>) {
    const res = await apiFetch("/api/admin/series", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: seriesId, action, data }),
    });
    if (res.ok && onSuccess) onSuccess();
    return res;
  }

  return {
    updateSeries: (data: Record<string, any>) => patchSeries("update", data),
    lookupRakuten: (url: string) => patchSeries("lookup_rakuten", { url }),
    toggleVerified: (current: boolean) => patchSeries("update", { verified: !current }),
    assignSpecs: () => patchSeries("assign_specs"),
  };
}
```

- [ ] **Step 4: Verify build**

```bash
npx next build 2>&1 | grep -E "error|Error|✓" | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/admin/
git commit -m "feat: admin data hooks (useAdminList, useSpecActions, useSeriesActions)"
```

---

### Task 7: Specs list page

**Files:**
- Rewrite: `src/app/admin/specs/page.tsx`
- Delete: `src/app/admin/specs/page-client.tsx`

- [ ] **Step 1: Rewrite specs list page**

Replace `src/app/admin/specs/page.tsx` with a client component that uses AdminTable + useAdminList. The page reads `?category=` from search params for sidebar filtering, and manages sort/page state.

Key column definitions:
- Thumbnail (40px, image from series fallback)
- メーカー (`maker`)
- モデル (`model`)
- カテゴリ (CATEGORY_LABELS map)
- 番手 (`club_number`)
- ロフト (`loft` + °)
- ライ角 (`lie` + °)
- 長さ (`length` + inch)
- 状態 (verified badge)
- 操作 (Link to `/admin/specs/[id]`)

Use `useAdminList("specs", { page, pageSize: 20, sort, order, category })`.

Column clicks trigger sort state change → URL update → SWR refetch.

- [ ] **Step 2: Delete old page-client.tsx**

```bash
rm src/app/admin/specs/page-client.tsx
```

- [ ] **Step 3: Verify build + visual check**

```bash
npx next build 2>&1 | grep -E "error|Error|✓" | tail -5
```

Start dev server and verify `/admin/specs` shows the table with sidebar.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/specs/
git commit -m "feat: specs list page with table, pagination, sort"
```

---

### Task 8: Spec edit page

**Files:**
- Create: `src/app/admin/specs/[id]/page.tsx`

- [ ] **Step 1: Create spec edit page**

This page uses:
- `useAdminOne("specs", id)` to load spec data
- `useSpecActions(id, () => mutate())` for actions
- `useAdminList("series", { pageSize: "100" })` to populate series dropdown
- `AdminBreadcrumb` for navigation
- `AdminFormSection` for each form group
- Existing `FieldInput`-style inputs (inline, not a separate component)

Layout: 2-column (image left 160px + form right).

Sections:
1. 基本情報: maker, model, category select, club_number, series select
2. スペック: 8 spec fields in 4-column grid
3. 画像・リンク (hidden when series_id set): rakuten lookup, image_url, affiliate_url

Bottom actions: AI再取得, 画像再取得, 楽天で見る, Google/楽天検索, 保存

- [ ] **Step 2: Verify build + visual check**

```bash
npx next build 2>&1 | grep -E "error|Error|✓" | tail -5
```

Navigate from specs list → click 編集 → verify edit page loads with data.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/specs/\[id\]/
git commit -m "feat: spec edit page with all fields and actions"
```

---

### Task 9: Series list + edit pages

**Files:**
- Rewrite: `src/app/admin/series/page.tsx`
- Delete: `src/app/admin/series/page-client.tsx`
- Create: `src/app/admin/series/[id]/page.tsx`

- [ ] **Step 1: Rewrite series list page**

Table columns: 画像 | メーカー | モデル | スペック数 | 状態 | 操作

Include a "新規作成" button at the top that POSTs to `/api/admin/series` with a form dialog or inline inputs.

- [ ] **Step 2: Create series edit page**

Same pattern as spec edit but simpler:
- 基本情報: maker, model
- 画像・リンク: rakuten lookup, image_url, affiliate_url
- 紐づきスペック: badge list with links to each spec edit page

- [ ] **Step 3: Delete old page-client.tsx**

```bash
rm src/app/admin/series/page-client.tsx
```

- [ ] **Step 4: Verify build**

```bash
npx next build 2>&1 | grep -E "error|Error|✓" | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/series/
git commit -m "feat: series list and edit pages"
```

---

### Task 10: Knowledge pages migration

**Files:**
- Rewrite: `src/app/admin/knowledge/page.tsx` (currently a client component, convert to table)
- Keep: `src/app/admin/knowledge/[id]/page.tsx` and `page-client.tsx` (edit page works, just needs layout adjustment)
- Keep: `src/app/admin/knowledge/detail/page.tsx` (create page)

- [ ] **Step 1: Rewrite knowledge list to use AdminTable**

Convert the current card-based list to a table. Keep the auto-collect button and latest run summary above the table.

Table columns: タイトル | カテゴリ | ステータス | ソース | 更新日 | 操作

Keep inline status change buttons (承認/却下/無効化) in the 操作 column.

Note: Knowledge API already supports `?category=&status=` query params and returns a flat array. Pagination is not critical here (items are few), but use the same AdminTable for consistency. If no pagination is needed, pass `total={data.length}` and `page={1}` and `pageSize={1000}`.

- [ ] **Step 2: Adjust knowledge edit/create pages for admin layout**

The edit page at `src/app/admin/knowledge/[id]/page-client.tsx` and create page at `src/app/admin/knowledge/detail/page.tsx` should work within the admin layout as-is since they already use `max-w-2xl mx-auto p-4`. Add AdminBreadcrumb at the top.

- [ ] **Step 3: Verify build**

```bash
npx next build 2>&1 | grep -E "error|Error|✓" | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/knowledge/
git commit -m "feat: knowledge list migrated to admin table layout"
```

---

### Task 11: Cleanup + final verification

**Files:**
- Possibly remove: unused imports, dead code in API routes

- [ ] **Step 1: Verify all admin pages**

Manually check:
- `/admin` → redirects to `/admin/specs`
- `/admin/specs` → table with pagination, sidebar category filter works
- `/admin/specs/[id]` → edit page loads, save works, actions work
- `/admin/series` → table list, create works
- `/admin/series/[id]` → edit page, linked specs shown
- `/admin/knowledge` → table list with filters
- `/admin/knowledge/[id]` → edit page works
- Unauthenticated user → redirected from `/admin/*`

- [ ] **Step 2: Full build**

```bash
npx next build 2>&1 | tail -20
```

Expected: No errors, all pages compile.

- [ ] **Step 3: Commit any cleanup**

```bash
git add -A
git commit -m "chore: admin panel cleanup"
```
