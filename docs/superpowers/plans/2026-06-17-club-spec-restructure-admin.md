# Club Spec DB Restructure — Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update all admin API routes, UI pages, and data pipeline scripts to use the new DB structure (club_spec_heads + configurations + shafts + grips), replacing all references to the dropped `club_specs` table.

**Architecture:** The DB migration (212) has already been applied. The old `club_specs` table no longer exists — replaced by `club_spec_heads` (head-only data) + `club_spec_configurations` (shaft-specific length/total_weight/swing_weight). New tables `shafts` and `grips` are product masters. API routes return flattened responses for backwards-compatible UI consumption, with the server-side JOIN handling the new table structure.

**Tech Stack:** Next.js App Router, Supabase (service role client for admin), SWR for data fetching, TanStack Table for admin lists, TypeScript.

**Design Spec:** `docs/superpowers/specs/2026-06-17-club-spec-restructure-design.md`

---

## File Map

### Modified files

| File | Responsibility |
|------|---------------|
| `src/app/api/admin/specs/route.ts` | Specs list GET + PATCH (update/refresh/rakuten) — `club_specs` → `club_spec_heads` + configurations JOIN |
| `src/app/api/admin/specs/[id]/route.ts` | Single spec GET — `club_specs` → `club_spec_heads` + configurations JOIN |
| `src/app/api/admin/specs/[id]/image/route.ts` | Spec image upload/delete — `club_specs` → `club_spec_heads` |
| `src/app/api/admin/series/route.ts` | Series list/create/update — `club_specs` references + maker/model連動更新 |
| `src/app/api/admin/series/[id]/route.ts` | Single series GET — `club_specs` → `club_spec_heads` + configurations |
| `src/app/admin/specs/page.tsx` | Specs list UI — type changes (`weight` → `total_weight`), configurations fields |
| `src/app/admin/specs/[id]/page.tsx` | Spec edit UI — form split (head fields vs configuration fields) |
| `src/app/admin/series/[id]/page.tsx` | Series edit UI — heads table + shaft/grip linking + configurations table |
| `src/components/admin/admin-sidebar.tsx` | Add シャフト/グリップ navigation items |
| `src/app/api/clubs/autofill/route.ts` | Autofill cache — `club_specs` → `club_spec_heads` + configurations, `upsert_club_spec` → `upsert_club_spec_head` |
| `scripts/collect-specs.mjs` | Batch collector — same table/RPC changes + configurations insert |

### New files

| File | Responsibility |
|------|---------------|
| `src/app/api/admin/shafts/route.ts` | Shafts CRUD API (GET list + POST create + PATCH update + DELETE) |
| `src/app/api/admin/grips/route.ts` | Grips CRUD API (GET list + POST create + PATCH update + DELETE) |
| `src/app/admin/shafts/page.tsx` | Shafts admin list + inline create |
| `src/app/admin/grips/page.tsx` | Grips admin list + inline create |

---

## Phase 1: Core API — Make Existing Admin Work

### Task 1: Update specs list API route

**Files:**
- Modify: `src/app/api/admin/specs/route.ts`

The core pattern: `club_specs` → `club_spec_heads`, and configuration fields (length, total_weight, swing_weight) come from a LEFT JOIN with `club_spec_configurations` where `shaft_id IS NULL`.

- [ ] **Step 1: Update GET handler — table name + configurations JOIN**

Replace the GET handler query. The select includes configurations via Supabase's relational query:

```typescript
let query = admin
  .from("club_spec_heads")
  .select("*, series:club_spec_series(*), configurations:club_spec_configurations(*)", { count: "exact" });
```

After fetching, flatten the default configuration (shaft_id === null) into the response:

```typescript
const result = (data ?? []).map((head: any) => {
  const defaultConfig = (head.configurations ?? []).find((c: any) => c.shaft_id === null);
  return {
    ...head,
    length: defaultConfig?.length ?? null,
    total_weight: defaultConfig?.total_weight ?? null,
    swing_weight: defaultConfig?.swing_weight ?? null,
    configuration_id: defaultConfig?.id ?? null,
    configurations: undefined,
  };
});

return NextResponse.json({ data: result, total: count ?? 0, page, pageSize });
```

- [ ] **Step 2: Update PATCH handler — all `club_specs` references → `club_spec_heads`**

In the PATCH handler, every `.from("club_specs")` becomes `.from("club_spec_heads")`. The select for returning updated data becomes:

```typescript
const { data: updated } = await admin
  .from("club_spec_heads")
  .select("*, series:club_spec_series(*), configurations:club_spec_configurations(*)")
  .eq("id", id)
  .single();

// Flatten configuration
const defaultConfig = (updated?.configurations ?? []).find((c: any) => c.shaft_id === null);
const flat = {
  ...updated,
  length: defaultConfig?.length ?? null,
  total_weight: defaultConfig?.total_weight ?? null,
  swing_weight: defaultConfig?.swing_weight ?? null,
  configuration_id: defaultConfig?.id ?? null,
  configurations: undefined,
};
return NextResponse.json(flat);
```

Extract this return-with-flatten pattern into a helper function `fetchHeadFlat(admin, id)` at the top of the file since it's used in every action branch.

- [ ] **Step 3: Update PATCH "update" action — split head vs configuration fields**

The "update" action's ALLOWED list and update logic must split between two tables:

```typescript
if (action === "update" && updateData) {
  const HEAD_FIELDS = [
    "maker", "model", "category", "club_number",
    "loft", "lie", "head_volume", "head_weight", "distance",
    "image_url", "affiliate_url", "verified", "series_id",
  ];
  const CONFIG_FIELDS = ["length", "total_weight", "swing_weight"];

  // Head fields
  const headUpdate: Record<string, any> = {};
  for (const key of HEAD_FIELDS) {
    if (key in updateData) headUpdate[key] = updateData[key];
  }
  if ("maker" in headUpdate) headUpdate.maker_normalized = normalizeClubName(headUpdate.maker);
  if ("model" in headUpdate) headUpdate.model_normalized = normalizeClubName(headUpdate.model);
  if (!("verified" in headUpdate)) headUpdate.source = "manual";

  if (Object.keys(headUpdate).length > 0) {
    await admin.from("club_spec_heads").update(headUpdate).eq("id", id);
  }

  // Configuration fields (upsert for shaft_id IS NULL)
  const configUpdate: Record<string, any> = {};
  for (const key of CONFIG_FIELDS) {
    if (key in updateData) configUpdate[key] = updateData[key];
  }
  if (Object.keys(configUpdate).length > 0) {
    configUpdate.source = "manual";
    const { data: existingConfig } = await admin
      .from("club_spec_configurations")
      .select("id")
      .eq("head_id", id)
      .is("shaft_id", null)
      .maybeSingle();

    if (existingConfig) {
      await admin.from("club_spec_configurations").update(configUpdate).eq("id", existingConfig.id);
    } else {
      await admin.from("club_spec_configurations").insert({ head_id: id, ...configUpdate });
    }
  }

  return NextResponse.json(await fetchHeadFlat(admin, id));
}
```

- [ ] **Step 4: Update PATCH "refresh_spec" action — split AI results between tables**

The refresh_spec action's Claude prompt requests `weight` and `length` — these now go to configurations. Keep the prompt unchanged (AI still returns `weight`), but map `specs.weight` → `total_weight` when saving to configurations:

```typescript
// Save head fields
await admin.from("club_spec_heads").update({
  loft: specs.loft ?? null,
  lie: specs.lie ?? null,
  distance: specs.distance ?? null,
  head_volume: specs.head_volume ?? null,
  head_weight: specs.head_weight ?? null,
}).eq("id", id);

// Save configuration fields
const configFields: Record<string, any> = {};
if (specs.length != null) configFields.length = specs.length;
if (specs.weight != null) configFields.total_weight = specs.weight;  // AI returns "weight", DB uses "total_weight"
if (specs.swing_weight != null) configFields.swing_weight = specs.swing_weight;

if (Object.keys(configFields).length > 0) {
  const { data: existingConfig } = await admin
    .from("club_spec_configurations")
    .select("id")
    .eq("head_id", id)
    .is("shaft_id", null)
    .maybeSingle();

  if (existingConfig) {
    await admin.from("club_spec_configurations").update(configFields).eq("id", existingConfig.id);
  } else {
    await admin.from("club_spec_configurations").insert({ head_id: id, ...configFields });
  }
}
```

- [ ] **Step 5: Verify the route compiles**

Run: `npx tsc --noEmit src/app/api/admin/specs/route.ts 2>&1 | head -30`

If type errors exist, fix them. Common issues: missing fields in selects, wrong field names.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/specs/route.ts
git commit -m "refactor: update specs API to use club_spec_heads + configurations"
```

### Task 2: Update single spec API route

**Files:**
- Modify: `src/app/api/admin/specs/[id]/route.ts`

- [ ] **Step 1: Update GET — table name + configurations JOIN + flatten**

```typescript
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = getAdmin();
  const { data, error } = await admin
    .from("club_spec_heads")
    .select("*, series:club_spec_series(*), configurations:club_spec_configurations(*)")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const defaultConfig = (data.configurations ?? []).find((c: any) => c.shaft_id === null);
  return NextResponse.json({
    ...data,
    length: defaultConfig?.length ?? null,
    total_weight: defaultConfig?.total_weight ?? null,
    swing_weight: defaultConfig?.swing_weight ?? null,
    configuration_id: defaultConfig?.id ?? null,
    configurations: undefined,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/specs/[id]/route.ts
git commit -m "refactor: update specs/[id] API to use club_spec_heads + configurations"
```

### Task 3: Update spec image API route

**Files:**
- Modify: `src/app/api/admin/specs/[id]/image/route.ts`

- [ ] **Step 1: Replace all `club_specs` → `club_spec_heads`**

Three occurrences:
1. Line 37: `.from("club_specs").update(...)` → `.from("club_spec_heads").update(...)`
2. Lines 39-43: `.from("club_specs").select(...)` → `.from("club_spec_heads").select(...)`
3. Line 53: `.from("club_specs").update(...)` → `.from("club_spec_heads").update(...)`
4. Lines 55-59: `.from("club_specs").select(...)` → `.from("club_spec_heads").select(...)`

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/specs/[id]/image/route.ts
git commit -m "refactor: update spec image API to use club_spec_heads"
```

### Task 4: Update series API routes

**Files:**
- Modify: `src/app/api/admin/series/route.ts`
- Modify: `src/app/api/admin/series/[id]/route.ts`

- [ ] **Step 1: Update series list GET — `club_specs(...)` → `club_spec_heads(...)`**

In `route.ts` GET handler, change the select:

```typescript
.select("*, club_spec_heads(id, category, club_number, loft, verified)", { count: "exact" })
```

And the mapping:

```typescript
const result = (data ?? []).map((s: any) => {
  const specs = (s.club_spec_heads ?? []).sort((a: any, b: any) =>
    (a.club_number ?? "").localeCompare(b.club_number ?? "")
  );
  return { ...s, specs, spec_count: specs.length, club_spec_heads: undefined };
});
```

- [ ] **Step 2: Update series PATCH "assign_specs" action — `club_specs` → `club_spec_heads`**

```typescript
if (action === "assign_specs") {
  const { count } = await admin
    .from("club_spec_heads")
    .update({ series_id: id })
    .eq("maker", series.maker)
    .eq("model", series.model);

  const { data: updated } = await admin.from("club_spec_series").select("*").eq("id", id).single();
  return NextResponse.json({ ...updated, assigned: count });
}
```

- [ ] **Step 3: Add maker/model連動更新 to series PATCH "update" action**

When series maker or model is updated, all linked heads must be updated too (per design spec):

```typescript
if (action === "update" && updateData) {
  // ... existing ALLOWED/fields logic ...

  await admin.from("club_spec_series").update(fields).eq("id", id);

  // 連動更新: series.maker/model変更時にheadsも更新
  if ("maker" in fields || "model" in fields) {
    const headUpdate: Record<string, any> = {};
    if ("maker" in fields) {
      headUpdate.maker = fields.maker;
      headUpdate.maker_normalized = normalizeClubName(fields.maker);
    }
    if ("model" in fields) {
      headUpdate.model = fields.model;
      headUpdate.model_normalized = normalizeClubName(fields.model);
    }
    await admin.from("club_spec_heads").update(headUpdate).eq("series_id", id);
  }

  const { data: updated } = await admin.from("club_spec_series").select("*").eq("id", id).single();
  return NextResponse.json(updated);
}
```

Add `import { normalizeClubName } from "@/lib/normalize";` at the top.

- [ ] **Step 4: Update series/[id] GET — `club_specs(...)` → `club_spec_heads(...)` with configurations**

In `[id]/route.ts`:

```typescript
const { data, error } = await admin
  .from("club_spec_series")
  .select("*, club_spec_heads(id, category, club_number, loft, lie, head_volume, head_weight, distance, verified, configurations:club_spec_configurations(length, total_weight, swing_weight, shaft_id))")
  .eq("id", id)
  .single();

if (error || !data) {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

const specs = (data.club_spec_heads ?? [])
  .map((head: any) => {
    const defaultConfig = (head.configurations ?? []).find((c: any) => c.shaft_id === null);
    return {
      ...head,
      length: defaultConfig?.length ?? null,
      total_weight: defaultConfig?.total_weight ?? null,
      swing_weight: defaultConfig?.swing_weight ?? null,
      configurations: undefined,
    };
  })
  .sort((a: any, b: any) => (a.club_number ?? "").localeCompare(b.club_number ?? ""));

return NextResponse.json({ ...data, specs, spec_count: specs.length, club_spec_heads: undefined });
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/series/route.ts src/app/api/admin/series/[id]/route.ts
git commit -m "refactor: update series API to use club_spec_heads + configurations + maker/model sync"
```

### Task 5: Update specs list page UI

**Files:**
- Modify: `src/app/admin/specs/page.tsx`

- [ ] **Step 1: Update ClubSpec type — `weight` → `total_weight`**

```typescript
interface ClubSpec {
  id: string;
  maker: string;
  model: string;
  category: string;
  club_number: string | null;
  loft: number | null;
  lie: number | null;
  length: number | null;        // from configurations (flattened by API)
  distance: number | null;
  total_weight: number | null;  // renamed from weight
  swing_weight: string | null;  // from configurations (flattened by API)
  head_volume: number | null;
  head_weight: number | null;
  image_url: string | null;
  affiliate_url: string | null;
  source: string;
  verified: boolean;
  series_id: string | null;
  series: { id: string; image_url: string | null; affiliate_url: string | null } | null;
}
```

- [ ] **Step 2: Update view columns — `weight` accessor → `total_weight`**

```typescript
{
  accessorKey: "total_weight", header: "重量", enableSorting: false,
  cell: ({ getValue }) => { const v = getValue() as number | null; return v != null ? `${v}g` : "-"; },
},
```

- [ ] **Step 3: Update edit columns — `weight` field → `total_weight`**

Change the edit column:
```typescript
{ id: "total_weight_edit", header: "重量", enableSorting: false, cell: ({ row }) => <EditNumField spec={row.original} field="total_weight" suffix="g" /> },
```

- [ ] **Step 4: Update handleBulkSave — `weight` → `total_weight`**

In the bulk save mapping:
```typescript
if ("total_weight" in changes) payload.total_weight = parseNum(changes.total_weight);
```

Remove the old `"weight" in changes` line.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/specs/page.tsx
git commit -m "refactor: update specs list page for club_spec_heads (weight → total_weight)"
```

### Task 6: Update spec edit page UI

**Files:**
- Modify: `src/app/admin/specs/[id]/page.tsx`

- [ ] **Step 1: Update ClubSpec type — `weight` → `total_weight`**

Same rename as the list page type. Remove `length`, `weight`, `swing_weight` from the head type and note they come flattened from API:

```typescript
interface ClubSpec {
  id: string;
  maker: string;
  model: string;
  category: string;
  club_number: string | null;
  loft: number | null;
  lie: number | null;
  length: number | null;        // from configurations
  distance: number | null;
  total_weight: number | null;  // renamed from weight
  swing_weight: string | null;  // from configurations
  head_volume: number | null;
  head_weight: number | null;
  image_url: string | null;
  own_image_url: string | null;
  affiliate_url: string | null;
  source: string;
  verified: boolean;
  series_id: string | null;
  series: { id: string; maker: string; model: string; image_url: string | null; own_image_url: string | null; affiliate_url: string | null } | null;
}
```

- [ ] **Step 2: Update FormState — `weight` → `total_weight`**

```typescript
interface FormState {
  maker: string;
  model: string;
  category: string;
  club_number: string;
  loft: string;
  lie: string;
  length: string;
  total_weight: string;  // renamed
  swing_weight: string;
  head_volume: string;
  head_weight: string;
  distance: string;
  image_url: string;
  affiliate_url: string;
  series_id: string;
}
```

- [ ] **Step 3: Update specToForm — `weight` → `total_weight`**

```typescript
function specToForm(spec: ClubSpec): FormState {
  return {
    // ... other fields same ...
    total_weight: spec.total_weight != null ? String(spec.total_weight) : "",
    // ... rest same ...
  };
}
```

- [ ] **Step 4: Update handleSave — `weight` → `total_weight`**

```typescript
const payload: Record<string, any> = {
  maker: form.maker,
  model: form.model,
  category: form.category,
  club_number: form.club_number || null,
  loft: parseNum(form.loft),
  lie: parseNum(form.lie),
  length: parseNum(form.length),
  total_weight: parseNum(form.total_weight),
  swing_weight: form.swing_weight || null,
  head_volume: parseNum(form.head_volume),
  head_weight: parseNum(form.head_weight),
  distance: parseNum(form.distance),
  series_id: form.series_id || null,
};
```

- [ ] **Step 5: Update form JSX — weight field**

Change the label and updateField call:
```tsx
<div className="flex flex-col gap-0.5">
  <label className="text-[10px] text-[#8b8b8b]">総重量 (g)</label>
  <input
    type="number"
    value={form.total_weight}
    onChange={(e) => updateField("total_weight", e.target.value)}
    className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
    placeholder="-"
  />
</div>
```

- [ ] **Step 6: Update initial form state in useState**

```typescript
const [form, setForm] = useState<FormState>({
  maker: "", model: "", category: "driver", club_number: "",
  loft: "", lie: "", length: "", total_weight: "", swing_weight: "",
  head_volume: "", head_weight: "", distance: "",
  image_url: "", affiliate_url: "", series_id: "",
});
```

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/specs/[id]/page.tsx
git commit -m "refactor: update spec edit page for club_spec_heads (weight → total_weight)"
```

### Task 7: Update series edit page UI

**Files:**
- Modify: `src/app/admin/series/[id]/page.tsx`

- [ ] **Step 1: Update Series type — `weight` → `total_weight` in specs array**

```typescript
interface Series {
  id: string;
  maker: string;
  model: string;
  image_url: string | null;
  affiliate_url: string | null;
  verified: boolean;
  source: string;
  spec_count: number;
  specs: {
    id: string;
    category: string;
    club_number: string | null;
    loft: number | null;
    lie: number | null;
    length: number | null;
    total_weight: number | null;
    swing_weight: string | null;
    head_volume: number | null;
    head_weight: number | null;
    distance: number | null;
    verified: boolean;
  }[];
}
```

- [ ] **Step 2: Update specs table — add head_volume, head_weight, distance columns + rename weight → total_weight**

Update the table headers and cells:

```tsx
<tr className="border-b border-[#e5e5e5] bg-[#fafafa]">
  <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">番手</th>
  <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">ロフト</th>
  <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">ライ角</th>
  <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">体積</th>
  <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">長さ</th>
  <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">重量</th>
  <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">バランス</th>
  <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">飛距離</th>
  <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium">状態</th>
  <th className="px-3 py-2 text-left text-[11px] text-[#888] font-medium"></th>
</tr>
```

And the body cells:

```tsx
<td className="px-3 py-2">{sp.loft != null ? `${sp.loft}°` : "-"}</td>
<td className="px-3 py-2">{sp.lie != null ? `${sp.lie}°` : "-"}</td>
<td className="px-3 py-2">{sp.head_volume != null ? `${sp.head_volume}cc` : "-"}</td>
<td className="px-3 py-2">{sp.length != null ? `${sp.length}"` : "-"}</td>
<td className="px-3 py-2">{sp.total_weight != null ? `${sp.total_weight}g` : "-"}</td>
<td className="px-3 py-2">{sp.swing_weight ?? "-"}</td>
<td className="px-3 py-2">{sp.distance != null ? `${sp.distance}yd` : "-"}</td>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/series/[id]/page.tsx
git commit -m "refactor: update series edit page for club_spec_heads (weight → total_weight)"
```

---

## Phase 2: New Admin Features — Shafts & Grips

### Task 8: Update sidebar navigation

**Files:**
- Modify: `src/components/admin/admin-sidebar.tsx`

- [ ] **Step 1: Restructure sections per design spec**

Replace the current `sections` array. Per the design spec, the sidebar should be:
- シリーズ (完成品管理)
- シャフト (製品マスタ)
- グリップ (製品マスタ)
- ナレッジ

Remove the クラブスペック section with category filters (heads are now managed within series). Add shafts/grips:

```typescript
const sections = [
  {
    title: "シリーズ",
    items: [
      { href: "/admin/series", label: "シリーズ一覧", match: (p: string) => p.startsWith("/admin/series") },
    ],
  },
  {
    title: "ヘッドスペック",
    items: specItems,
  },
  {
    title: "シャフト",
    items: [
      { href: "/admin/shafts", label: "シャフト一覧", match: (p: string) => p.startsWith("/admin/shafts") },
    ],
  },
  {
    title: "グリップ",
    items: [
      { href: "/admin/grips", label: "グリップ一覧", match: (p: string) => p.startsWith("/admin/grips") },
    ],
  },
  {
    title: "その他",
    items: [
      { href: "/admin/knowledge", label: "ナレッジ", match: (p: string) => p.startsWith("/admin/knowledge") },
    ],
  },
];
```

Keep the spec category filter items — they're still useful for browsing heads by category.

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/admin-sidebar.tsx
git commit -m "feat: add shafts/grips navigation to admin sidebar"
```

### Task 9: Create shafts admin API

**Files:**
- Create: `src/app/api/admin/shafts/route.ts`

- [ ] **Step 1: Create the API route file**

Follow the existing pattern from `series/route.ts`. The shafts API supports:
- GET: list with pagination, search, sort
- POST: create new shaft
- PATCH: update shaft fields
- DELETE: delete shaft

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeClubName } from "@/lib/normalize";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(request: NextRequest) {
  const admin = getAdmin();
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20", 10);
  const sort = url.searchParams.get("sort") ?? "maker";
  const order = url.searchParams.get("order") === "desc" ? false : true;
  const search = url.searchParams.get("search") ?? "";

  let query = admin
    .from("shafts")
    .select("*", { count: "exact" });

  if (search) {
    const norm = normalizeClubName(search);
    query = query.or(`maker_normalized.ilike.%${norm}%,name_normalized.ilike.%${norm}%`);
  }

  query = query
    .order(sort, { ascending: order })
    .order("name", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, pageSize });
}

export async function POST(request: NextRequest) {
  const admin = getAdmin();
  const body = await request.json();

  if (!body.maker || !body.name) {
    return NextResponse.json({ error: "maker and name required" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("shafts")
    .insert({
      maker: body.maker,
      maker_normalized: normalizeClubName(body.maker),
      name: body.name,
      name_normalized: normalizeClubName(body.name),
      type: body.type || null,
      flex: body.flex || null,
      weight: body.weight != null ? Number(body.weight) : null,
      torque: body.torque != null ? Number(body.torque) : null,
      kick_point: body.kick_point || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "既に存在するシャフトです" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const admin = getAdmin();
  const { id, data: updateData } = await request.json();

  if (!id || !updateData) return NextResponse.json({ error: "id and data required" }, { status: 400 });

  const ALLOWED = ["maker", "name", "type", "flex", "weight", "torque", "kick_point", "image_url", "affiliate_url", "verified"];
  const fields: Record<string, any> = {};
  for (const key of ALLOWED) {
    if (key in updateData) fields[key] = updateData[key];
  }
  if ("maker" in fields) fields.maker_normalized = normalizeClubName(fields.maker);
  if ("name" in fields) fields.name_normalized = normalizeClubName(fields.name);

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  await admin.from("shafts").update(fields).eq("id", id);
  const { data: updated } = await admin.from("shafts").select("*").eq("id", id).single();
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const admin = getAdmin();
  const { id } = await request.json();
  await admin.from("shafts").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/shafts/route.ts
git commit -m "feat: add shafts admin CRUD API"
```

### Task 10: Create shafts admin page

**Files:**
- Create: `src/app/admin/shafts/page.tsx`

- [ ] **Step 1: Create the page**

Follow the pattern from `series/page.tsx`: list with TanStack table + create form. Columns: maker, name, type, flex, weight, torque, kick_point, verified.

```typescript
"use client";

import { useState } from "react";
import { type SortingState, type ColumnDef } from "@tanstack/react-table";
import { AdminTable } from "@/components/admin/admin-table";
import { useAdminList } from "@/hooks/admin/use-admin-list";
import { apiFetch } from "@/lib/api-client";

interface Shaft {
  id: string;
  maker: string;
  name: string;
  type: string | null;
  flex: string | null;
  weight: number | null;
  torque: number | null;
  kick_point: string | null;
  verified: boolean;
}

const columns: ColumnDef<Shaft, any>[] = [
  { accessorKey: "maker", header: "メーカー", enableSorting: true },
  { accessorKey: "name", header: "製品名", enableSorting: true },
  {
    accessorKey: "type", header: "素材", enableSorting: false,
    cell: ({ getValue }) => getValue() ?? "-",
  },
  { accessorKey: "flex", header: "フレックス", enableSorting: false, cell: ({ getValue }) => getValue() ?? "-" },
  {
    accessorKey: "weight", header: "重量", enableSorting: false,
    cell: ({ getValue }) => { const v = getValue() as number | null; return v != null ? `${v}g` : "-"; },
  },
  {
    accessorKey: "torque", header: "トルク", enableSorting: false,
    cell: ({ getValue }) => { const v = getValue() as number | null; return v != null ? `${v}°` : "-"; },
  },
  {
    accessorKey: "kick_point", header: "調子", enableSorting: false,
    cell: ({ getValue }) => getValue() ?? "-",
  },
  {
    id: "verified", header: "状態", enableSorting: false,
    cell: ({ row }) =>
      row.original.verified
        ? <span className="rounded-full bg-[#006728] px-2 py-0.5 text-[10px] font-bold text-white">確認済</span>
        : <span className="text-[10px] text-[#8b8b8b]">未確認</span>,
  },
];

export default function AdminShaftsPage() {
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [creating, setCreating] = useState(false);
  const [newMaker, setNewMaker] = useState("");
  const [newName, setNewName] = useState("");
  const [newFlex, setNewFlex] = useState("");

  const sort = sorting[0]?.id ?? "";
  const order = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : "";

  const { data, isLoading, mutate } = useAdminList<Shaft>("shafts", {
    page, pageSize: 20,
    ...(sort ? { sort, order } : {}),
  });

  async function handleCreate() {
    if (!newMaker.trim() || !newName.trim()) return;
    setCreating(true);
    try {
      const res = await apiFetch("/api/admin/shafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maker: newMaker.trim(), name: newName.trim(), flex: newFlex.trim() || null }),
      });
      if (res.ok) {
        setNewMaker("");
        setNewName("");
        setNewFlex("");
        await mutate();
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">
        シャフト一覧
        {data && <span className="ml-2 text-base font-normal text-[#888]">({data.total}件)</span>}
      </h1>

      {/* Create form */}
      <div className="flex items-end gap-2 rounded-lg bg-[#fafafa] p-3">
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-[#8b8b8b]">メーカー</label>
          <input type="text" value={newMaker} onChange={(e) => setNewMaker(e.target.value)}
            className="w-40 rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm outline-none focus:border-[#006728]"
            placeholder="日本シャフト" />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-[#8b8b8b]">製品名</label>
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
            className="w-56 rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm outline-none focus:border-[#006728]"
            placeholder="N.S. Pro 950GH neo" />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-[#8b8b8b]">フレックス</label>
          <input type="text" value={newFlex} onChange={(e) => setNewFlex(e.target.value)}
            className="w-16 rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm outline-none focus:border-[#006728]"
            placeholder="S" />
        </div>
        <button onClick={handleCreate} disabled={creating || !newMaker.trim() || !newName.trim()}
          className="rounded-full bg-[#006728] px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40">
          {creating ? "作成中..." : "追加"}
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-lg bg-white p-8 text-center text-sm text-[#8b8b8b]">読み込み中...</div>
      ) : (
        <AdminTable<Shaft>
          data={data?.data ?? []}
          columns={columns}
          total={data?.total ?? 0}
          page={page}
          pageSize={20}
          sorting={sorting}
          onSortingChange={setSorting}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/shafts/page.tsx
git commit -m "feat: add shafts admin list page"
```

### Task 11: Create grips admin API

**Files:**
- Create: `src/app/api/admin/grips/route.ts`

- [ ] **Step 1: Create the API route file**

Same pattern as shafts. Different fields: maker, name, weight, size, material.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeClubName } from "@/lib/normalize";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(request: NextRequest) {
  const admin = getAdmin();
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20", 10);
  const sort = url.searchParams.get("sort") ?? "maker";
  const order = url.searchParams.get("order") === "desc" ? false : true;
  const search = url.searchParams.get("search") ?? "";

  let query = admin
    .from("grips")
    .select("*", { count: "exact" });

  if (search) {
    const norm = normalizeClubName(search);
    query = query.or(`maker_normalized.ilike.%${norm}%,name_normalized.ilike.%${norm}%`);
  }

  query = query
    .order(sort, { ascending: order })
    .order("name", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, pageSize });
}

export async function POST(request: NextRequest) {
  const admin = getAdmin();
  const body = await request.json();

  if (!body.maker || !body.name) {
    return NextResponse.json({ error: "maker and name required" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("grips")
    .insert({
      maker: body.maker,
      maker_normalized: normalizeClubName(body.maker),
      name: body.name,
      name_normalized: normalizeClubName(body.name),
      weight: body.weight != null ? Number(body.weight) : null,
      size: body.size || null,
      material: body.material || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "既に存在するグリップです" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const admin = getAdmin();
  const { id, data: updateData } = await request.json();

  if (!id || !updateData) return NextResponse.json({ error: "id and data required" }, { status: 400 });

  const ALLOWED = ["maker", "name", "weight", "size", "material", "image_url", "affiliate_url", "verified"];
  const fields: Record<string, any> = {};
  for (const key of ALLOWED) {
    if (key in updateData) fields[key] = updateData[key];
  }
  if ("maker" in fields) fields.maker_normalized = normalizeClubName(fields.maker);
  if ("name" in fields) fields.name_normalized = normalizeClubName(fields.name);

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  await admin.from("grips").update(fields).eq("id", id);
  const { data: updated } = await admin.from("grips").select("*").eq("id", id).single();
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const admin = getAdmin();
  const { id } = await request.json();
  await admin.from("grips").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/grips/route.ts
git commit -m "feat: add grips admin CRUD API"
```

### Task 12: Create grips admin page

**Files:**
- Create: `src/app/admin/grips/page.tsx`

- [ ] **Step 1: Create the page**

Same pattern as shafts page. Columns: maker, name, weight, size, material, verified.

```typescript
"use client";

import { useState } from "react";
import { type SortingState, type ColumnDef } from "@tanstack/react-table";
import { AdminTable } from "@/components/admin/admin-table";
import { useAdminList } from "@/hooks/admin/use-admin-list";
import { apiFetch } from "@/lib/api-client";

interface Grip {
  id: string;
  maker: string;
  name: string;
  weight: number | null;
  size: string | null;
  material: string | null;
  verified: boolean;
}

const columns: ColumnDef<Grip, any>[] = [
  { accessorKey: "maker", header: "メーカー", enableSorting: true },
  { accessorKey: "name", header: "製品名", enableSorting: true },
  {
    accessorKey: "weight", header: "重量", enableSorting: false,
    cell: ({ getValue }) => { const v = getValue() as number | null; return v != null ? `${v}g` : "-"; },
  },
  { accessorKey: "size", header: "サイズ", enableSorting: false, cell: ({ getValue }) => getValue() ?? "-" },
  { accessorKey: "material", header: "素材", enableSorting: false, cell: ({ getValue }) => getValue() ?? "-" },
  {
    id: "verified", header: "状態", enableSorting: false,
    cell: ({ row }) =>
      row.original.verified
        ? <span className="rounded-full bg-[#006728] px-2 py-0.5 text-[10px] font-bold text-white">確認済</span>
        : <span className="text-[10px] text-[#8b8b8b]">未確認</span>,
  },
];

export default function AdminGripsPage() {
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [creating, setCreating] = useState(false);
  const [newMaker, setNewMaker] = useState("");
  const [newName, setNewName] = useState("");

  const sort = sorting[0]?.id ?? "";
  const order = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : "";

  const { data, isLoading, mutate } = useAdminList<Grip>("grips", {
    page, pageSize: 20,
    ...(sort ? { sort, order } : {}),
  });

  async function handleCreate() {
    if (!newMaker.trim() || !newName.trim()) return;
    setCreating(true);
    try {
      const res = await apiFetch("/api/admin/grips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maker: newMaker.trim(), name: newName.trim() }),
      });
      if (res.ok) {
        setNewMaker("");
        setNewName("");
        await mutate();
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">
        グリップ一覧
        {data && <span className="ml-2 text-base font-normal text-[#888]">({data.total}件)</span>}
      </h1>

      {/* Create form */}
      <div className="flex items-end gap-2 rounded-lg bg-[#fafafa] p-3">
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-[#8b8b8b]">メーカー</label>
          <input type="text" value={newMaker} onChange={(e) => setNewMaker(e.target.value)}
            className="w-40 rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm outline-none focus:border-[#006728]"
            placeholder="Golf Pride" />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-[#8b8b8b]">製品名</label>
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
            className="w-56 rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm outline-none focus:border-[#006728]"
            placeholder="Tour Velvet" />
        </div>
        <button onClick={handleCreate} disabled={creating || !newMaker.trim() || !newName.trim()}
          className="rounded-full bg-[#006728] px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40">
          {creating ? "作成中..." : "追加"}
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-lg bg-white p-8 text-center text-sm text-[#8b8b8b]">読み込み中...</div>
      ) : (
        <AdminTable<Grip>
          data={data?.data ?? []}
          columns={columns}
          total={data?.total ?? 0}
          page={page}
          pageSize={20}
          sorting={sorting}
          onSortingChange={setSorting}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/grips/page.tsx
git commit -m "feat: add grips admin list page"
```

---

## Deferred to Follow-Up Plan

The following items from the design spec are **intentionally deferred** as they require shafts/grips data to be populated first and represent a significant standalone UI effort:

- **Series edit page: shaft/grip linking UI + configurations table** — Adding shaft selector, grip selector, and per-shaft configurations matrix to the series edit page
- **assumed_grip_weight auto-set** — Automatic population when creating configurations with a linked default grip
- **AI prompt enhancement for shaft-specific data collection** — Teaching the AI to collect multiple shaft variants per model

These should be implemented in a follow-up plan after the shafts/grips master data starts being populated.

---

## Phase 3: Data Pipeline Updates

### Task 13: Update autofill API

**Files:**
- Modify: `src/app/api/clubs/autofill/route.ts`

- [ ] **Step 1: Update cache check — `club_specs` → `club_spec_heads` + configurations JOIN**

Replace the cache lookup query (around lines 42-54):

```typescript
// 1. Check head cache
const headQuery = admin
  .from("club_spec_heads")
  .select("*, configurations:club_spec_configurations(length, total_weight, swing_weight, shaft_id)")
  .eq("maker_normalized", makerNorm)
  .eq("model_normalized", modelNorm)
  .eq("category", category ?? "");

if (club_number) {
  headQuery.eq("club_number", club_number);
} else {
  headQuery.is("club_number", null);
}

const { data: cached } = await headQuery.maybeSingle();
```

And update the cache hit response (lines 57-83):

```typescript
if (cached) {
  const defaultConfig = (cached.configurations ?? []).find((c: any) => c.shaft_id === null);

  let imageUrl = cached.image_url;
  let affiliateUrl = cached.affiliate_url;
  if (cached.series_id && (!imageUrl || !affiliateUrl)) {
    const { data: series } = await admin
      .from("club_spec_series")
      .select("image_url, affiliate_url")
      .eq("id", cached.series_id)
      .single();
    if (series) {
      imageUrl = imageUrl ?? series.image_url;
      affiliateUrl = affiliateUrl ?? series.affiliate_url;
    }
  }
  return NextResponse.json({
    loft: cached.loft,
    lie: cached.lie,
    length: defaultConfig?.length ?? null,
    distance: cached.distance,
    weight: defaultConfig?.total_weight ?? null,   // response keeps "weight" for frontend compat
    swing_weight: defaultConfig?.swing_weight ?? null,
    head_volume: cached.head_volume,
    head_weight: cached.head_weight,
    image_url: imageUrl,
    affiliate_url: affiliateUrl,
  });
}
```

Note: The autofill response keeps `weight` (not `total_weight`) for frontend compatibility — the club-form.tsx expects `weight`.

- [ ] **Step 2: Update cache save — `upsert_club_spec` → `upsert_club_spec_head` + configurations insert**

Replace the RPC call (around lines 187-204):

```typescript
// 4. Save head to cache (UPSERT, skip if verified=true)
const { data: headId, error: headError } = await admin.rpc("upsert_club_spec_head", {
  p_maker: maker,
  p_model: model,
  p_category: category ?? "",
  p_club_number: club_number ?? null,
  p_maker_normalized: makerNorm,
  p_model_normalized: modelNorm,
  p_loft: specs.loft ?? null,
  p_lie: specs.lie ?? null,
  p_head_volume: specs.head_volume ?? null,
  p_head_weight: specs.head_weight ?? null,
  p_distance: specs.distance ?? null,
  p_image_url: rakutenResult.imageUrl,
  p_affiliate_url: rakutenResult.affiliateUrl,
});
if (headError) console.error("[autofill] Head cache error:", headError.message);

// Save configuration (length, weight, swing_weight) for shaft_id=null
if (headId && (specs.length != null || specs.weight != null || specs.swing_weight != null)) {
  const configFields: Record<string, any> = {
    head_id: headId,
    length: specs.length ?? null,
    total_weight: specs.weight ?? null,
    swing_weight: specs.swing_weight ?? null,
    source: "ai",
  };
  const { data: existingConfig } = await admin
    .from("club_spec_configurations")
    .select("id, verified")
    .eq("head_id", headId)
    .is("shaft_id", null)
    .maybeSingle();

  if (existingConfig && !existingConfig.verified) {
    await admin.from("club_spec_configurations").update(configFields).eq("id", existingConfig.id);
  } else if (!existingConfig) {
    await admin.from("club_spec_configurations").insert(configFields);
  }
  // If existingConfig.verified=true, skip update (same logic as head upsert)
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/clubs/autofill/route.ts
git commit -m "refactor: update autofill API for club_spec_heads + configurations"
```

### Task 14: Update collect-specs.mjs

**Files:**
- Modify: `scripts/collect-specs.mjs`

- [ ] **Step 1: Update collectOne — cache check table name**

Change lines 195-203:

```javascript
const query = supabase
  .from("club_spec_heads")
  .select("id")
  .eq("maker_normalized", makerNorm)
  .eq("model_normalized", modelNorm)
  .eq("category", category);
```

- [ ] **Step 2: Update collectOne — upsert RPC + configurations insert**

Replace the upsert section (lines 218-236):

```javascript
// Upsert head
const { data: headId, error: headError } = await supabase.rpc("upsert_club_spec_head", {
  p_maker: maker,
  p_model: model,
  p_category: category,
  p_club_number: clubNumber ?? null,
  p_maker_normalized: makerNorm,
  p_model_normalized: modelNorm,
  p_loft: specs.loft ?? null,
  p_lie: specs.lie ?? null,
  p_head_volume: specs.head_volume ?? null,
  p_head_weight: specs.head_weight ?? null,
  p_distance: specs.distance ?? null,
  p_image_url: rakuten.imageUrl,
  p_affiliate_url: rakuten.affiliateUrl,
});
if (headError) throw new Error(`Head upsert error: ${headError.message}`);

// Upsert default configuration (shaft_id=null)
if (headId && (specs.length != null || specs.weight != null || specs.swing_weight != null)) {
  const { data: existingConfig } = await supabase
    .from("club_spec_configurations")
    .select("id, verified")
    .eq("head_id", headId)
    .is("shaft_id", null)
    .maybeSingle();

  const configFields = {
    head_id: headId,
    length: specs.length ?? null,
    total_weight: specs.weight ?? null,
    swing_weight: specs.swing_weight ?? null,
    source: "ai",
  };

  if (existingConfig && !existingConfig.verified) {
    const { error } = await supabase.from("club_spec_configurations").update(configFields).eq("id", existingConfig.id);
    if (error) console.error(`  WARN  config update: ${error.message}`);
  } else if (!existingConfig) {
    const { error } = await supabase.from("club_spec_configurations").insert(configFields);
    if (error) console.error(`  WARN  config insert: ${error.message}`);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add scripts/collect-specs.mjs
git commit -m "refactor: update collect-specs.mjs for club_spec_heads + configurations"
```

---

## Phase 4: Build Verification

### Task 15: Verify build

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit 2>&1 | head -50`

Fix any type errors found.

- [ ] **Step 2: Run build**

Run: `npm run build 2>&1 | tail -30`

Fix any build errors found.

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: resolve build errors from club spec restructure"
```
