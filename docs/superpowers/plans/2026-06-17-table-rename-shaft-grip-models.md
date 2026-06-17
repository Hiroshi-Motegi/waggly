# テーブルリネーム + シャフト/グリップ親子化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 全テーブルをドメイン用語に統一リネームし、シャフト/グリップに親子構造（models→variants）を導入。

**Architecture:** 1つの大型マイグレーションで全テーブルリネーム + 新テーブル作成 + データ移行を行い、その後全APIルート・管理画面のテーブル参照を一括更新する。マイグレーションは1トランザクションで実行し、失敗時は全体ロールバック。

**Tech Stack:** PostgreSQL (Supabase), Next.js App Router, TypeScript, SWR

**Design Spec:** `docs/superpowers/specs/2026-06-17-table-rename-shaft-grip-models-design.md`

---

## File Map

### Modified files

| File | Changes |
|------|---------|
| `src/app/api/admin/specs/route.ts` | `club_spec_heads` → `heads`, `club_spec_configurations` → `clubs`, `club_spec_series` → `club_models`, `upsert_club_spec_head` → `upsert_head` |
| `src/app/api/admin/specs/[id]/route.ts` | Same table renames |
| `src/app/api/admin/specs/[id]/image/route.ts` | `club_spec_heads` → `heads`, `club_spec_series` → `club_models` |
| `src/app/api/admin/series/route.ts` | `club_spec_series` → `club_models`, `club_spec_heads` → `heads` |
| `src/app/api/admin/series/[id]/route.ts` | All table renames + shaft/grip model-level linking |
| `src/app/api/admin/series/[id]/image/route.ts` | `club_spec_series` → `club_models` |
| `src/app/api/admin/shafts/route.ts` | `shafts` → `shaft_variants` + JOIN `shaft_models` |
| `src/app/api/admin/grips/route.ts` | `grips` → `grip_variants` + JOIN `grip_models` |
| `src/app/api/clubs/autofill/route.ts` | Table renames + RPC rename |
| `scripts/collect-specs.mjs` | Table renames + RPC rename |
| `src/app/admin/shafts/page.tsx` | Model→variant UI restructure |
| `src/app/admin/grips/page.tsx` | Model→variant UI restructure |
| `src/app/admin/series/[id]/page.tsx` | Table type updates, shaft model-level linking |
| `src/app/admin/specs/page.tsx` | Type updates (series → model naming) |
| `src/app/admin/specs/[id]/page.tsx` | Type updates |
| `src/app/admin/series/page.tsx` | Type updates |
| `src/components/admin/admin-sidebar.tsx` | Label updates if needed |

### New files

| File | Purpose |
|------|---------|
| `supabase/migrations/215_table_rename_models.sql` | Full migration |

---

## Task 1: Migration SQL

**Files:**
- Create: `supabase/migrations/215_table_rename_models.sql`

This is the foundation — all other tasks depend on this migration being applied.

- [ ] **Step 1: Write the migration**

```sql
-- ============================================================
-- テーブルリネーム + シャフト/グリップ親子化
-- 1トランザクション。失敗時は全体ロールバック。
-- ============================================================

BEGIN;

-- ── 1. shaft_models 作成 ──

CREATE TABLE shaft_models (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  maker text NOT NULL,
  maker_normalized text NOT NULL,
  name text NOT NULL,
  name_normalized text NOT NULL,
  type text,
  image_url text,
  affiliate_url text,
  own_image_url text,
  source text NOT NULL DEFAULT 'ai',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_shaft_models_unique ON shaft_models(maker_normalized, name_normalized);

ALTER TABLE shaft_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all for non-service roles" ON shaft_models FOR ALL USING (false);

CREATE TRIGGER shaft_models_updated_at
  BEFORE UPDATE ON shaft_models
  FOR EACH ROW EXECUTE FUNCTION update_club_specs_updated_at();

-- ── 2. grip_models 作成 ──

CREATE TABLE grip_models (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  maker text NOT NULL,
  maker_normalized text NOT NULL,
  name text NOT NULL,
  name_normalized text NOT NULL,
  material text,
  image_url text,
  affiliate_url text,
  own_image_url text,
  source text NOT NULL DEFAULT 'ai',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_grip_models_unique ON grip_models(maker_normalized, name_normalized);

ALTER TABLE grip_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all for non-service roles" ON grip_models FOR ALL USING (false);

CREATE TRIGGER grip_models_updated_at
  BEFORE UPDATE ON grip_models
  FOR EACH ROW EXECUTE FUNCTION update_club_specs_updated_at();

-- ── 3. shafts → shaft_models データ移行 ──

INSERT INTO shaft_models (maker, maker_normalized, name, name_normalized, type, image_url, affiliate_url, own_image_url, source, verified)
SELECT DISTINCT ON (maker_normalized, name_normalized)
  maker, maker_normalized, name, name_normalized, type, image_url, affiliate_url, own_image_url, source, verified
FROM shafts
ORDER BY maker_normalized, name_normalized, created_at;

-- ── 4. grips → grip_models データ移行 ──

INSERT INTO grip_models (maker, maker_normalized, name, name_normalized, material, image_url, affiliate_url, own_image_url, source, verified)
SELECT DISTINCT ON (maker_normalized, name_normalized)
  maker, maker_normalized, name, name_normalized, material, image_url, affiliate_url, own_image_url, source, verified
FROM grips
ORDER BY maker_normalized, name_normalized, created_at;

-- ── 5. shafts: model_id 追加 + 共通カラム削除 → shaft_variants リネーム ──

ALTER TABLE shafts ADD COLUMN model_id uuid;

UPDATE shafts s SET model_id = sm.id
FROM shaft_models sm
WHERE s.maker_normalized = sm.maker_normalized AND s.name_normalized = sm.name_normalized;

ALTER TABLE shafts ALTER COLUMN model_id SET NOT NULL;
ALTER TABLE shafts ADD CONSTRAINT shafts_model_id_fkey
  FOREIGN KEY (model_id) REFERENCES shaft_models(id) ON DELETE CASCADE;

ALTER TABLE shafts DROP COLUMN maker;
ALTER TABLE shafts DROP COLUMN maker_normalized;
ALTER TABLE shafts DROP COLUMN name;
ALTER TABLE shafts DROP COLUMN name_normalized;
ALTER TABLE shafts DROP COLUMN type;
ALTER TABLE shafts DROP COLUMN image_url;
ALTER TABLE shafts DROP COLUMN affiliate_url;
ALTER TABLE shafts DROP COLUMN own_image_url;

-- Drop old unique index and create new one
DROP INDEX IF EXISTS idx_shafts_unique;
CREATE UNIQUE INDEX idx_shaft_variants_unique ON shafts(model_id, COALESCE(flex, ''));

ALTER TABLE shafts RENAME TO shaft_variants;

-- ── 6. grips: model_id 追加 + 共通カラム削除 → grip_variants リネーム ──

ALTER TABLE grips ADD COLUMN model_id uuid;

UPDATE grips g SET model_id = gm.id
FROM grip_models gm
WHERE g.maker_normalized = gm.maker_normalized AND g.name_normalized = gm.name_normalized;

ALTER TABLE grips ALTER COLUMN model_id SET NOT NULL;
ALTER TABLE grips ADD CONSTRAINT grips_model_id_fkey
  FOREIGN KEY (model_id) REFERENCES grip_models(id) ON DELETE CASCADE;

ALTER TABLE grips DROP COLUMN maker;
ALTER TABLE grips DROP COLUMN maker_normalized;
ALTER TABLE grips DROP COLUMN name;
ALTER TABLE grips DROP COLUMN name_normalized;
ALTER TABLE grips DROP COLUMN material;
ALTER TABLE grips DROP COLUMN image_url;
ALTER TABLE grips DROP COLUMN affiliate_url;
ALTER TABLE grips DROP COLUMN own_image_url;

DROP INDEX IF EXISTS idx_grips_unique;
CREATE UNIQUE INDEX idx_grip_variants_unique ON grips(model_id, COALESCE(size, ''));

ALTER TABLE grips RENAME TO grip_variants;

-- ── 7. club_spec_series → club_models ──

ALTER TABLE club_spec_series RENAME TO club_models;

-- ── 8. club_spec_heads → heads + series_id → model_id ──

ALTER TABLE club_spec_heads RENAME TO heads;
ALTER TABLE heads RENAME COLUMN series_id TO model_id;

-- ── 9. club_spec_configurations → clubs + grip_variant_id 追加 ──

ALTER TABLE club_spec_configurations RENAME TO clubs;
ALTER TABLE clubs RENAME COLUMN shaft_id TO shaft_variant_id;
ALTER TABLE clubs ADD COLUMN grip_variant_id uuid REFERENCES grip_variants(id) ON DELETE SET NULL;

-- clubs ユニーク制約を再作成
DROP INDEX IF EXISTS idx_configurations_head_shaft;
DROP INDEX IF EXISTS idx_configurations_head_null_shaft;

CREATE UNIQUE INDEX idx_clubs_head_shaft_grip
  ON clubs(head_id, shaft_variant_id, grip_variant_id)
  WHERE shaft_variant_id IS NOT NULL AND grip_variant_id IS NOT NULL;

CREATE UNIQUE INDEX idx_clubs_head_shaft_no_grip
  ON clubs(head_id, shaft_variant_id)
  WHERE shaft_variant_id IS NOT NULL AND grip_variant_id IS NULL;

CREATE UNIQUE INDEX idx_clubs_head_null_shaft
  ON clubs(head_id)
  WHERE shaft_variant_id IS NULL;

-- ── 10. 紐づけテーブルリネーム + モデルレベルリンクへ変換 ──

-- shafts 紐づけ: variant → model レベルに変換
ALTER TABLE club_spec_series_shafts ADD COLUMN shaft_model_id uuid;

UPDATE club_spec_series_shafts css SET shaft_model_id = sv.model_id
FROM shaft_variants sv WHERE css.shaft_id = sv.id;

-- 重複排除（同じ club_model + shaft_model の組み合わせを1つに）
DELETE FROM club_spec_series_shafts a
USING club_spec_series_shafts b
WHERE a.id > b.id
  AND a.series_id = b.series_id
  AND a.shaft_model_id = b.shaft_model_id;

ALTER TABLE club_spec_series_shafts DROP COLUMN shaft_id;
ALTER TABLE club_spec_series_shafts ALTER COLUMN shaft_model_id SET NOT NULL;
ALTER TABLE club_spec_series_shafts ADD CONSTRAINT club_model_shafts_shaft_model_id_fkey
  FOREIGN KEY (shaft_model_id) REFERENCES shaft_models(id) ON DELETE CASCADE;
ALTER TABLE club_spec_series_shafts RENAME COLUMN series_id TO model_id;
DROP INDEX IF EXISTS idx_series_shafts_unique;
CREATE UNIQUE INDEX idx_club_model_shafts_unique ON club_spec_series_shafts(model_id, shaft_model_id);
ALTER TABLE club_spec_series_shafts RENAME TO club_model_shafts;

-- grips 紐づけ: variant → model レベルに変換
ALTER TABLE club_spec_series_grips ADD COLUMN grip_model_id uuid;

UPDATE club_spec_series_grips csg SET grip_model_id = gv.model_id
FROM grip_variants gv WHERE csg.grip_id = gv.id;

DELETE FROM club_spec_series_grips a
USING club_spec_series_grips b
WHERE a.id > b.id
  AND a.series_id = b.series_id
  AND a.grip_model_id = b.grip_model_id;

ALTER TABLE club_spec_series_grips DROP COLUMN grip_id;
ALTER TABLE club_spec_series_grips ALTER COLUMN grip_model_id SET NOT NULL;
ALTER TABLE club_spec_series_grips ADD CONSTRAINT club_model_grips_grip_model_id_fkey
  FOREIGN KEY (grip_model_id) REFERENCES grip_models(id) ON DELETE CASCADE;
ALTER TABLE club_spec_series_grips RENAME COLUMN series_id TO model_id;
DROP INDEX IF EXISTS idx_series_grips_unique;
CREATE UNIQUE INDEX idx_club_model_grips_unique ON club_spec_series_grips(model_id, grip_model_id);
ALTER TABLE club_spec_series_grips RENAME TO club_model_grips;

-- ── 11. RLS ポリシー再作成（旧名drop + 新名） ──

DROP POLICY IF EXISTS "Deny all for non-service roles" ON club_models;
CREATE POLICY "Deny all for non-service roles" ON club_models FOR ALL USING (false);

DROP POLICY IF EXISTS "Deny all for non-service roles" ON heads;
CREATE POLICY "Deny all for non-service roles" ON heads FOR ALL USING (false);

DROP POLICY IF EXISTS "Deny all for non-service roles" ON clubs;
CREATE POLICY "Deny all for non-service roles" ON clubs FOR ALL USING (false);

DROP POLICY IF EXISTS "Deny all for non-service roles" ON shaft_variants;
CREATE POLICY "Deny all for non-service roles" ON shaft_variants FOR ALL USING (false);

DROP POLICY IF EXISTS "Deny all for non-service roles" ON grip_variants;
CREATE POLICY "Deny all for non-service roles" ON grip_variants FOR ALL USING (false);

DROP POLICY IF EXISTS "Deny all for non-service roles" ON club_model_shafts;
CREATE POLICY "Deny all for non-service roles" ON club_model_shafts FOR ALL USING (false);

DROP POLICY IF EXISTS "Deny all for non-service roles" ON club_model_grips;
CREATE POLICY "Deny all for non-service roles" ON club_model_grips FOR ALL USING (false);

-- ── 12. upsert 関数再作成 ──

DROP FUNCTION IF EXISTS upsert_club_spec_head CASCADE;

CREATE OR REPLACE FUNCTION upsert_head(
  p_maker text,
  p_model text,
  p_category text,
  p_club_number text,
  p_maker_normalized text,
  p_model_normalized text,
  p_loft numeric,
  p_lie numeric,
  p_head_volume numeric,
  p_head_weight numeric,
  p_distance numeric,
  p_image_url text,
  p_affiliate_url text
) RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO heads (
    maker, model, category, club_number,
    maker_normalized, model_normalized,
    loft, lie, head_volume, head_weight, distance,
    image_url, affiliate_url, source, verified
  ) VALUES (
    p_maker, p_model, p_category, p_club_number,
    p_maker_normalized, p_model_normalized,
    p_loft, p_lie, p_head_volume, p_head_weight, p_distance,
    p_image_url, p_affiliate_url, 'ai', false
  )
  ON CONFLICT (maker_normalized, model_normalized, category, COALESCE(club_number, ''))
  DO UPDATE SET
    loft = EXCLUDED.loft,
    lie = EXCLUDED.lie,
    head_volume = EXCLUDED.head_volume,
    head_weight = EXCLUDED.head_weight,
    distance = EXCLUDED.distance,
    image_url = EXCLUDED.image_url,
    affiliate_url = EXCLUDED.affiliate_url
  WHERE heads.verified = false
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM heads
    WHERE maker_normalized = p_maker_normalized
      AND model_normalized = p_model_normalized
      AND category = p_category
      AND COALESCE(club_number, '') = COALESCE(p_club_number, '');
  END IF;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
```

- [ ] **Step 2: Commit the migration**

```bash
git add supabase/migrations/215_table_rename_models.sql
git commit -m "feat: migration for table rename + shaft/grip parent-child"
```

---

## Task 2: Update all admin API routes — table name replacement

**Files:**
- Modify: `src/app/api/admin/specs/route.ts`
- Modify: `src/app/api/admin/specs/[id]/route.ts`
- Modify: `src/app/api/admin/specs/[id]/image/route.ts`
- Modify: `src/app/api/admin/series/route.ts`
- Modify: `src/app/api/admin/series/[id]/route.ts`
- Modify: `src/app/api/admin/series/[id]/image/route.ts`

All these files need the same mechanical replacements:

| Old | New |
|-----|-----|
| `club_spec_heads` | `heads` |
| `club_spec_series` | `club_models` |
| `club_spec_configurations` | `clubs` |
| `club_spec_series_shafts` | `club_model_shafts` |
| `club_spec_series_grips` | `club_model_grips` |
| `upsert_club_spec_head` | `upsert_head` |

- [ ] **Step 1: Replace in specs/route.ts**

Read the file, then replace all occurrences of the old table names with new ones. Also update the `computeSortOrder` function's return type comment if it references old names.

- [ ] **Step 2: Replace in specs/[id]/route.ts**

Same replacements.

- [ ] **Step 3: Replace in specs/[id]/image/route.ts**

Same replacements.

- [ ] **Step 4: Replace in series/route.ts**

Same replacements. Note: this file also has `normalizeClubName` import which stays.

- [ ] **Step 5: Replace in series/[id]/route.ts**

This file has more complex queries with shaft/grip joins. Replace table names AND update the shaft linking to use `shaft_model_id` instead of `shaft_id`:

The `series_shafts` select becomes:
```typescript
series_shafts:club_model_shafts(id, is_default, shaft_model:shaft_models(id, maker, name, type,
  variants:shaft_variants(id, flex, weight, torque, kick_point)
))
```

The `add_shaft` action changes to use `shaft_model_id` instead of `shaft_id`:
```typescript
if (action === "add_shaft") {
  const { shaft_model_id, is_default } = body;
  const { data, error } = await admin
    .from("club_model_shafts")
    .insert({ model_id: seriesId, shaft_model_id, is_default: is_default ?? false })
    ...
```

The `remove_shaft` action — when removing a shaft model link, also remove clubs entries for all variants of that model:
```typescript
if (action === "remove_shaft") {
  const { link_id, shaft_model_id } = body;
  await admin.from("club_model_shafts").delete().eq("id", link_id);
  // Remove clubs for all variants of this shaft model under this series' heads
  const { data: variants } = await admin.from("shaft_variants").select("id").eq("model_id", shaft_model_id);
  if (variants && variants.length > 0) {
    const variantIds = variants.map((v: any) => v.id);
    const { data: heads } = await admin.from("heads").select("id").eq("model_id", seriesId);
    if (heads && heads.length > 0) {
      const headIds = heads.map((h: any) => h.id);
      await admin.from("clubs").delete()
        .in("shaft_variant_id", variantIds)
        .in("head_id", headIds);
    }
  }
  return NextResponse.json({ ok: true });
}
```

The `upsert_config` action: `shaft_id` → `shaft_variant_id` in the clubs query.

- [ ] **Step 6: Replace in series/[id]/image/route.ts**

`club_spec_series` → `club_models`

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 8: Commit**

```bash
git add src/app/api/admin/
git commit -m "refactor: rename all admin API table references to new names"
```

---

## Task 3: Update shafts admin API for model→variant structure

**Files:**
- Modify: `src/app/api/admin/shafts/route.ts`

The shafts API needs a complete restructure: it now manages shaft_models (parent) and shaft_variants (children) instead of a flat shafts table.

- [ ] **Step 1: Rewrite shafts API**

The new API operates at the model level for listing/creating, and supports variant CRUD via actions:

**GET**: List shaft_models with variants joined
```typescript
const query = admin
  .from("shaft_models")
  .select("*, variants:shaft_variants(id, flex, weight, torque, kick_point, source, verified)", { count: "exact" });
```

**POST**: Create a new shaft_model (not a variant)
```typescript
const { data, error } = await admin
  .from("shaft_models")
  .insert({
    maker: body.maker,
    maker_normalized: normalizeClubName(body.maker),
    name: body.name,
    name_normalized: normalizeClubName(body.name),
    type: body.type || null,
  })
  .select()
  .single();
```

**PATCH**: Update shaft_model fields OR manage variants
```typescript
// action: "update" — update model fields
// action: "add_variant" — add a new flex variant
// action: "update_variant" — update a variant's fields
// action: "delete_variant" — remove a variant
```

For `add_variant`:
```typescript
if (action === "add_variant") {
  const { model_id, flex, weight, torque, kick_point } = body;
  const { data, error } = await admin
    .from("shaft_variants")
    .insert({ model_id, flex: flex || null, weight, torque, kick_point })
    .select().single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "既に存在するバリアントです" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
```

For `update_variant`:
```typescript
if (action === "update_variant") {
  const { variant_id, data: updateData } = body;
  const ALLOWED = ["flex", "weight", "torque", "kick_point", "verified"];
  const fields: Record<string, any> = {};
  for (const key of ALLOWED) {
    if (key in updateData) fields[key] = updateData[key];
  }
  await admin.from("shaft_variants").update(fields).eq("id", variant_id);
  const { data: updated } = await admin.from("shaft_variants").select("*").eq("id", variant_id).single();
  return NextResponse.json(updated);
}
```

**DELETE**: Delete a shaft_model (CASCADE deletes variants)

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/shafts/route.ts
git commit -m "refactor: restructure shafts API for model→variant pattern"
```

---

## Task 4: Update grips admin API for model→variant structure

**Files:**
- Modify: `src/app/api/admin/grips/route.ts`

Same pattern as Task 3 but for grips. Replace `shaft_models` → `grip_models`, `shaft_variants` → `grip_variants`, `flex` → `size`, `torque`/`kick_point` → (none, grips only have weight).

- [ ] **Step 1: Rewrite grips API**

Same structure as shafts: GET lists grip_models with variants, POST creates model, PATCH manages variants, DELETE removes model.

Variant fields for grips: `size`, `weight`.

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/grips/route.ts
git commit -m "refactor: restructure grips API for model→variant pattern"
```

---

## Task 5: Update autofill API + collect-specs.mjs

**Files:**
- Modify: `src/app/api/clubs/autofill/route.ts`
- Modify: `scripts/collect-specs.mjs`

- [ ] **Step 1: Update autofill API**

Mechanical replacements:
- `club_spec_heads` → `heads`
- `club_spec_configurations` → `clubs`
- `club_spec_series` → `club_models`
- `upsert_club_spec_head` → `upsert_head`
- In the clubs upsert section: `shaft_id` → `shaft_variant_id`

- [ ] **Step 2: Update collect-specs.mjs**

Same replacements:
- `.from("club_spec_heads")` → `.from("heads")`
- `upsert_club_spec_head` → `upsert_head`
- `.from("club_spec_configurations")` → `.from("clubs")`
- `shaft_id` → `shaft_variant_id` in clubs upsert

- [ ] **Step 3: Commit**

```bash
git add src/app/api/clubs/autofill/route.ts scripts/collect-specs.mjs
git commit -m "refactor: update autofill + collect-specs for new table names"
```

---

## Task 6: Update admin UI pages — type updates + table renames

**Files:**
- Modify: `src/app/admin/specs/page.tsx`
- Modify: `src/app/admin/specs/[id]/page.tsx`
- Modify: `src/app/admin/series/page.tsx`
- Modify: `src/app/admin/series/[id]/page.tsx`

These pages use `useAdminList` and `useAdminOne` hooks which derive the API URL from the resource name. The resource names ("specs", "series") don't change, so the hooks still work. The main changes are type definitions that reference old table structures.

- [ ] **Step 1: Update series/[id]/page.tsx**

This is the most complex page. Update:
1. `SeriesShaft` type: restructure for model→variants nesting
```typescript
interface ShaftModel {
  id: string;
  maker: string;
  name: string;
  type: string | null;
  variants: {
    id: string;
    flex: string | null;
    weight: number | null;
    torque: number | null;
    kick_point: string | null;
  }[];
}

interface SeriesShaft {
  link_id: string;    // club_model_shafts.id
  is_default: boolean;
  shaft_model: ShaftModel;
}
```

2. ShaftLinker component: update to search shaft_models, add by shaft_model_id
3. ConfigurationsMatrix: update to display shaft_models with variant sub-columns

The shaft linking API calls change:
- `add_shaft`: `{ action: "add_shaft", shaft_model_id: "..." }` (was shaft_id)
- `remove_shaft`: `{ action: "remove_shaft", link_id: "...", shaft_model_id: "..." }` (was shaft_id)

The configurations matrix columns come from shaft_variants within linked shaft_models.

- [ ] **Step 2: Update specs/page.tsx, specs/[id]/page.tsx, series/page.tsx**

Minimal changes — just ensure any type references to `series` fields still work (the API response shape doesn't change for these pages since the rename is on the DB side).

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/
git commit -m "refactor: update admin UI for new table names and shaft model→variant structure"
```

---

## Task 7: Restructure shafts admin page for model→variant UI

**Files:**
- Modify: `src/app/admin/shafts/page.tsx`

- [ ] **Step 1: Rewrite shafts page**

The page now shows shaft_models as rows. Each row expands to show variants (flex options).

Model list shows: maker, name, type, variant count, verified status.

Expanded model shows variants table: flex, weight, torque, kick_point + inline edit.

Create form: creates a model first (maker, name, type), then add variants.

The API resource is still "shafts" (`useAdminList<ShaftModel>("shafts", ...)`).

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/shafts/page.tsx
git commit -m "feat: restructure shafts page for model→variant hierarchy"
```

---

## Task 8: Restructure grips admin page for model→variant UI

**Files:**
- Modify: `src/app/admin/grips/page.tsx`

- [ ] **Step 1: Rewrite grips page**

Same pattern as Task 7. Model shows: maker, name, material, variant count. Variants show: size, weight.

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/grips/page.tsx
git commit -m "feat: restructure grips page for model→variant hierarchy"
```

---

## Task 9: Build verification

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit 2>&1 | head -50`

- [ ] **Step 2: Run build**

Run: `npm run build 2>&1 | tail -30`

- [ ] **Step 3: Grep for any remaining old table names in code**

```bash
grep -rn "club_spec_series\|club_spec_heads\|club_spec_configurations\|club_spec_series_shafts\|club_spec_series_grips" src/ scripts/ --include="*.ts" --include="*.tsx" --include="*.mjs" | grep -v node_modules
```

Should return zero results.

Also check for old RPC name:
```bash
grep -rn "upsert_club_spec_head" src/ scripts/ --include="*.ts" --include="*.tsx" --include="*.mjs"
```

Should return zero results.

- [ ] **Step 4: Fix any issues and commit**

```bash
git add -A
git commit -m "fix: resolve build errors from table rename"
```
