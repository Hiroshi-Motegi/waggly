# クラブVS比較ページ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** メーカー横断のクラブスペックVS比較ページを自動生成し、SEO流入を獲得する

**Architecture:** Supabase上に3層のカタログDB（catalog_series → catalog_models → catalog_specs）を構築。Next.js ISRで公開ページを動的生成。比較ページは2モデルの番手別スペックを横並びで表示。Admin APIでデータ投入。

**Tech Stack:** Next.js 16 (App Router, ISR), Supabase (PostgreSQL + PostgREST), Tailwind CSS 4, TypeScript

**Spec:** `docs/superpowers/specs/2026-06-17-vs-comparison-design.md`

---

## File Structure

### DB Migration
- Create: `supabase/migrations/225_catalog_tables.sql`

### Lib / Data Access
- Create: `src/lib/catalog.ts` — カタログDB読み取りクエリ集約

### Admin API（データ投入用）
- Create: `src/app/api/admin/catalog/series/route.ts` — シリーズCRUD
- Create: `src/app/api/admin/catalog/models/route.ts` — モデルCRUD
- Create: `src/app/api/admin/catalog/specs/route.ts` — スペックCRUD

### 公開ページ（カタログ系）
- Create: `src/app/catalog/page.tsx` — 全メーカー一覧
- Create: `src/app/catalog/[maker]/page.tsx` — メーカー内シリーズ一覧
- Create: `src/app/catalog/[maker]/[series]/page.tsx` — シリーズ内モデル一覧
- Create: `src/app/catalog/[maker]/[series]/[category]/page.tsx` — モデル詳細+スペック表

### 公開ページ（比較系）
- Create: `src/app/compare/[category]/page.tsx` — カテゴリ別比較インデックス
- Create: `src/app/compare/[category]/[slug]/page.tsx` — VS比較ページ

### 共通コンポーネント
- Create: `src/components/catalog/spec-table.tsx` — 番手別スペック表
- Create: `src/components/catalog/compare-table.tsx` — VS比較表
- Create: `src/components/catalog/model-card.tsx` — モデルカード（一覧用）

### SEO
- Modify: `src/app/sitemap.ts`（既存があれば修正、なければ作成）

### Admin UI
- Create: `src/app/admin/catalog/page.tsx` — カタログ管理トップ
- Modify: `src/components/admin/admin-sidebar.tsx` — カタログリンク追加

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/225_catalog_tables.sql`

- [ ] **Step 1: マイグレーションファイル作成**

```sql
-- catalog_series（シリーズ = G440, Paradym Ai Smoke等）
CREATE TABLE catalog_series (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  maker text NOT NULL,
  name text NOT NULL,
  maker_slug text NOT NULL,
  name_slug text NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_catalog_series_slug ON catalog_series(maker_slug, name_slug);
ALTER TABLE catalog_series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON catalog_series FOR SELECT USING (true);
CREATE POLICY "Service write" ON catalog_series FOR ALL USING (false);

-- catalog_models（モデル = G440アイアン, G440 MAXドライバー等）
CREATE TABLE catalog_models (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  series_id uuid NOT NULL REFERENCES catalog_series(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('driver','fairway_wood','utility','iron','wedge','putter')),
  category_slug text NOT NULL,
  head_material text,
  finish text,
  price integer,
  price_note text,
  release_year integer,
  shaft_names text[],
  grip_name text,
  url text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_catalog_models_series_cat ON catalog_models(series_id, category);
CREATE INDEX idx_catalog_models_category ON catalog_models(category);
ALTER TABLE catalog_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON catalog_models FOR SELECT USING (true);
CREATE POLICY "Service write" ON catalog_models FOR ALL USING (false);

-- catalog_specs（番手別スペック）
CREATE TABLE catalog_specs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id uuid NOT NULL REFERENCES catalog_models(id) ON DELETE CASCADE,
  club_number text NOT NULL,
  loft numeric,
  lie numeric,
  bounce numeric,
  length numeric,
  weight numeric,
  swing_weight text,
  head_volume numeric,
  head_weight numeric,
  face_angle numeric,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_catalog_specs_model_club ON catalog_specs(model_id, club_number);
ALTER TABLE catalog_specs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON catalog_specs FOR SELECT USING (true);
CREATE POLICY "Service write" ON catalog_specs FOR ALL USING (false);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER catalog_series_updated BEFORE UPDATE ON catalog_series
  FOR EACH ROW EXECUTE FUNCTION catalog_updated_at();
CREATE TRIGGER catalog_models_updated BEFORE UPDATE ON catalog_models
  FOR EACH ROW EXECUTE FUNCTION catalog_updated_at();
CREATE TRIGGER catalog_specs_updated BEFORE UPDATE ON catalog_specs
  FOR EACH ROW EXECUTE FUNCTION catalog_updated_at();
```

- [ ] **Step 2: Supabase SQL Editorで本番に適用**

SQL Editorに貼り付けて実行。全テーブルが作成されることを確認。

確認クエリ:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'catalog_%'
ORDER BY table_name;
```
Expected: `catalog_models`, `catalog_series`, `catalog_specs` の3行。

- [ ] **Step 3: テストデータ投入（PING G440アイアン）**

```sql
-- シリーズ
INSERT INTO catalog_series (maker, name, maker_slug, name_slug)
VALUES ('PING', 'G440', 'ping', 'g440');

-- モデル
INSERT INTO catalog_models (series_id, name, category, category_slug, head_material, finish, price, price_note, release_year, shaft_names, grip_name, url)
SELECT id, 'G440 アイアン', 'iron', 'iron',
  'ハイパー17-4ステンレススチール', 'ハイドロパールクローム仕上げ',
  31900, 'カーボン', 2025,
  ARRAY['ALTA J CB BLUE','AWT 3.0 LITE','PING TOUR 2.0 CHROME','DG EX TOUR ISSUE'],
  'GP360 LITE TOUR VELVET ROUND',
  'https://clubping.jp/product/product2025_g440_i.html'
FROM catalog_series WHERE maker_slug = 'ping' AND name_slug = 'g440';

-- スペック（番手別）
INSERT INTO catalog_specs (model_id, club_number, loft, lie, bounce, length, weight, swing_weight, sort_order)
SELECT m.id, v.club_number, v.loft, v.lie, v.bounce, v.length, v.weight, v.swing_weight, v.sort_order
FROM catalog_models m
CROSS JOIN (VALUES
  ('4I',  19,   60.5, 6,    39.25, 369, 'C9', 0),
  ('5I',  22,   61,   7,    38.5,  NULL, NULL, 1),
  ('6I',  25.5, 61.5, 8,    37.75, NULL, NULL, 2),
  ('7I',  29,   62,   9,    37,    369, 'C9',  3),
  ('8I',  33,   62.8, 10,   36.5,  NULL, NULL, 4),
  ('9I',  37,   63.5, 11.5, 36,    NULL, NULL, 5),
  ('PW',  42,   64.1, 13,   35.5,  NULL, NULL, 6),
  ('UW',  47,   64.1, 13,   35.5,  NULL, NULL, 7),
  ('52',  52,   64.1, 13,   35.5,  NULL, NULL, 8),
  ('56',  56,   64.4, 14,   35.25, NULL, NULL, 9)
) AS v(club_number, loft, lie, bounce, length, weight, swing_weight, sort_order)
WHERE m.category = 'iron' AND m.series_id = (SELECT id FROM catalog_series WHERE maker_slug = 'ping' AND name_slug = 'g440');
```

確認クエリ:
```sql
SELECT cs.club_number, cs.loft, cs.lie, cs.bounce, cs.length
FROM catalog_specs cs
JOIN catalog_models cm ON cs.model_id = cm.id
ORDER BY cs.sort_order;
```
Expected: 10行（4I〜56）が番手順に出る。

- [ ] **Step 4: マイグレーションファイルをコミット**

```bash
git add supabase/migrations/225_catalog_tables.sql
git commit -m "feat: add catalog DB tables (catalog_series, catalog_models, catalog_specs)"
```

---

## Task 2: データアクセス層

**Files:**
- Create: `src/lib/catalog.ts`

- [ ] **Step 1: カタログDBクエリ関数を作成**

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- Types ---

export type CatalogSeries = {
  id: string;
  maker: string;
  name: string;
  maker_slug: string;
  name_slug: string;
  image_url: string | null;
};

export type CatalogModel = {
  id: string;
  series_id: string;
  name: string;
  category: string;
  category_slug: string;
  head_material: string | null;
  finish: string | null;
  price: number | null;
  price_note: string | null;
  release_year: number | null;
  shaft_names: string[] | null;
  grip_name: string | null;
  url: string | null;
  image_url: string | null;
};

export type CatalogSpec = {
  id: string;
  model_id: string;
  club_number: string;
  loft: number | null;
  lie: number | null;
  bounce: number | null;
  length: number | null;
  weight: number | null;
  swing_weight: string | null;
  head_volume: number | null;
  head_weight: number | null;
  face_angle: number | null;
  sort_order: number;
};

export type CatalogModelWithSpecs = CatalogModel & {
  catalog_series: CatalogSeries;
  catalog_specs: CatalogSpec[];
};

// --- Queries ---

/** 全メーカー一覧（ユニークなmaker/maker_slug） */
export async function getMakers() {
  const { data } = await supabase
    .from("catalog_series")
    .select("maker, maker_slug")
    .order("maker");
  if (!data) return [];
  // dedupe by maker_slug
  const seen = new Set<string>();
  return data.filter((d) => {
    if (seen.has(d.maker_slug)) return false;
    seen.add(d.maker_slug);
    return true;
  });
}

/** メーカー内シリーズ一覧 */
export async function getSeriesByMaker(makerSlug: string) {
  const { data } = await supabase
    .from("catalog_series")
    .select("*")
    .eq("maker_slug", makerSlug)
    .order("name");
  return data ?? [];
}

/** シリーズ内モデル一覧 */
export async function getModelsBySeries(makerSlug: string, nameSlug: string) {
  const { data } = await supabase
    .from("catalog_models")
    .select("*, catalog_series!inner(*)")
    .eq("catalog_series.maker_slug", makerSlug)
    .eq("catalog_series.name_slug", nameSlug)
    .order("category");
  return (data ?? []) as (CatalogModel & { catalog_series: CatalogSeries })[];
}

/** モデル詳細 + スペック */
export async function getModelDetail(makerSlug: string, nameSlug: string, categorySlug: string) {
  const { data } = await supabase
    .from("catalog_models")
    .select("*, catalog_series!inner(*), catalog_specs(*)")
    .eq("catalog_series.maker_slug", makerSlug)
    .eq("catalog_series.name_slug", nameSlug)
    .eq("category_slug", categorySlug)
    .order("sort_order", { referencedTable: "catalog_specs" })
    .single();
  return data as CatalogModelWithSpecs | null;
}

/** カテゴリ内の全モデル一覧（比較インデックス用） */
export async function getModelsByCategory(categorySlug: string) {
  const { data } = await supabase
    .from("catalog_models")
    .select("*, catalog_series!inner(*)")
    .eq("category_slug", categorySlug)
    .order("name");
  return (data ?? []) as (CatalogModel & { catalog_series: CatalogSeries })[];
}

/** slugから2モデル取得（VS比較用） */
export async function getCompareModels(categorySlug: string, slugA: string, slugB: string) {
  // slugは "ping-g440" 形式 → maker_slug + name_slug に分解
  const parseSlug = (slug: string) => {
    const i = slug.indexOf("-");
    return { makerSlug: slug.slice(0, i), nameSlug: slug.slice(i + 1) };
  };
  const a = parseSlug(slugA);
  const b = parseSlug(slugB);

  const [modelA, modelB] = await Promise.all([
    getModelDetail(a.makerSlug, a.nameSlug, categorySlug),
    getModelDetail(b.makerSlug, b.nameSlug, categorySlug),
  ]);
  return { modelA, modelB };
}

/** モデルの比較用slug生成 */
export function modelSlug(series: CatalogSeries): string {
  return `${series.maker_slug}-${series.name_slug}`;
}
```

- [ ] **Step 2: コミット**

```bash
git add src/lib/catalog.ts
git commit -m "feat: add catalog data access layer"
```

---

## Task 3: Admin API

**Files:**
- Create: `src/app/api/admin/catalog/series/route.ts`
- Create: `src/app/api/admin/catalog/models/route.ts`
- Create: `src/app/api/admin/catalog/specs/route.ts`

- [ ] **Step 1: シリーズAPI**

```typescript
// src/app/api/admin/catalog/series/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("catalog_series")
    .select("*, catalog_models(id, name, category)")
    .order("maker")
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const maker_slug = body.maker?.toLowerCase().replace(/\s+/g, "-") ?? "";
  const name_slug = body.name?.toLowerCase().replace(/\s+/g, "-") ?? "";
  const { data, error } = await supabase
    .from("catalog_series")
    .insert({ ...body, maker_slug, name_slug })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
```

- [ ] **Step 2: モデルAPI**

```typescript
// src/app/api/admin/catalog/models/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const seriesId = request.nextUrl.searchParams.get("series_id");
  let query = supabase.from("catalog_models").select("*, catalog_series(*), catalog_specs(count)").order("category");
  if (seriesId) query = query.eq("series_id", seriesId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const category_slug = body.category ?? "";
  const { data, error } = await supabase
    .from("catalog_models")
    .insert({ ...body, category_slug })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
```

- [ ] **Step 3: スペックAPI**

```typescript
// src/app/api/admin/catalog/specs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const modelId = request.nextUrl.searchParams.get("model_id");
  if (!modelId) return NextResponse.json({ error: "model_id required" }, { status: 400 });
  const { data, error } = await supabase
    .from("catalog_specs")
    .select("*")
    .eq("model_id", modelId)
    .order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // 配列で複数番手を一括投入
  const rows = Array.isArray(body) ? body : [body];
  const { data, error } = await supabase
    .from("catalog_specs")
    .insert(rows)
    .select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
```

- [ ] **Step 4: コミット**

```bash
git add src/app/api/admin/catalog/
git commit -m "feat: add admin API for catalog series/models/specs"
```

---

## Task 4: スペック表コンポーネント

**Files:**
- Create: `src/components/catalog/spec-table.tsx`
- Create: `src/components/catalog/compare-table.tsx`
- Create: `src/components/catalog/model-card.tsx`

- [ ] **Step 1: スペック表コンポーネント**

```tsx
// src/components/catalog/spec-table.tsx
import type { CatalogSpec } from "@/lib/catalog";

const SPEC_LABELS: Record<string, { label: string; suffix?: string }> = {
  loft: { label: "ロフト角", suffix: "°" },
  lie: { label: "ライ角", suffix: "°" },
  bounce: { label: "バウンス角", suffix: "°" },
  length: { label: "クラブ長さ", suffix: "inch" },
  weight: { label: "総重量", suffix: "g" },
  swing_weight: { label: "バランス" },
  head_volume: { label: "ヘッド体積", suffix: "cc" },
  head_weight: { label: "ヘッド重量", suffix: "g" },
  face_angle: { label: "フェース角", suffix: "°" },
};

type SpecKey = keyof typeof SPEC_LABELS;

const CATEGORY_SPECS: Record<string, SpecKey[]> = {
  driver: ["loft", "lie", "length", "weight", "swing_weight", "head_volume", "head_weight", "face_angle"],
  fairway_wood: ["loft", "lie", "length", "weight", "swing_weight", "head_volume", "head_weight"],
  utility: ["loft", "lie", "length", "weight", "swing_weight"],
  iron: ["loft", "lie", "bounce", "length", "weight", "swing_weight"],
  wedge: ["loft", "lie", "bounce", "length", "weight", "swing_weight"],
  putter: ["loft", "lie", "length", "weight", "swing_weight"],
};

export function SpecTable({ specs, category }: { specs: CatalogSpec[]; category: string }) {
  const keys = CATEGORY_SPECS[category] ?? CATEGORY_SPECS.iron;
  if (specs.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-[#006728] text-white">
            <th className="px-3 py-2 text-left font-bold sticky left-0 bg-[#006728]">番手</th>
            {specs.map((s) => (
              <th key={s.id} className="px-3 py-2 text-center font-bold whitespace-nowrap">{s.club_number}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const info = SPEC_LABELS[key];
            const hasAny = specs.some((s) => (s as any)[key] != null);
            if (!hasAny) return null;
            return (
              <tr key={key} className="border-b border-[#e5e5e5]">
                <td className="px-3 py-2 font-bold text-[#333] whitespace-nowrap sticky left-0 bg-white">{info.label}</td>
                {specs.map((s) => {
                  const val = (s as any)[key];
                  return (
                    <td key={s.id} className="px-3 py-2 text-center text-[#333]">
                      {val != null ? `${val}${info.suffix ?? ""}` : "—"}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export { SPEC_LABELS, CATEGORY_SPECS };
export type { SpecKey };
```

- [ ] **Step 2: VS比較表コンポーネント**

```tsx
// src/components/catalog/compare-table.tsx
import type { CatalogSpec, CatalogModelWithSpecs } from "@/lib/catalog";
import { SPEC_LABELS, CATEGORY_SPECS, type SpecKey } from "./spec-table";

export function CompareTable({ modelA, modelB }: { modelA: CatalogModelWithSpecs; modelB: CatalogModelWithSpecs }) {
  const category = modelA.category;
  const keys = CATEGORY_SPECS[category] ?? CATEGORY_SPECS.iron;

  // 全番手をマージして順序付け
  const allNumbers = new Map<string, { a?: CatalogSpec; b?: CatalogSpec; sort: number }>();
  for (const s of modelA.catalog_specs) {
    allNumbers.set(s.club_number, { a: s, sort: s.sort_order });
  }
  for (const s of modelB.catalog_specs) {
    const existing = allNumbers.get(s.club_number);
    if (existing) {
      existing.b = s;
    } else {
      allNumbers.set(s.club_number, { b: s, sort: s.sort_order });
    }
  }
  const rows = [...allNumbers.entries()].sort((a, b) => a[1].sort - b[1].sort);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-[#006728] text-white">
            <th className="px-3 py-2 text-left font-bold sticky left-0 bg-[#006728]">項目</th>
            <th className="px-3 py-2 text-center font-bold">番手</th>
            <th className="px-3 py-2 text-center font-bold">{modelA.name}</th>
            <th className="px-3 py-2 text-center font-bold">{modelB.name}</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const info = SPEC_LABELS[key];
            return rows.map(([clubNumber, { a, b }], i) => {
              const valA = a ? (a as any)[key] : null;
              const valB = b ? (b as any)[key] : null;
              if (valA == null && valB == null) return null;
              return (
                <tr key={`${key}-${clubNumber}`} className="border-b border-[#e5e5e5]">
                  {i === 0 && (
                    <td className="px-3 py-2 font-bold text-[#333] whitespace-nowrap sticky left-0 bg-white" rowSpan={rows.length}>
                      {info.label}
                    </td>
                  )}
                  <td className="px-3 py-2 text-center font-bold text-[#666]">{clubNumber}</td>
                  <td className="px-3 py-2 text-center">{valA != null ? `${valA}${info.suffix ?? ""}` : "—"}</td>
                  <td className="px-3 py-2 text-center">{valB != null ? `${valB}${info.suffix ?? ""}` : "—"}</td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: モデルカードコンポーネント**

```tsx
// src/components/catalog/model-card.tsx
import Link from "next/link";
import type { CatalogModel, CatalogSeries } from "@/lib/catalog";

const categoryLabels: Record<string, string> = {
  driver: "ドライバー",
  fairway_wood: "フェアウェイウッド",
  utility: "ユーティリティ",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};

export function ModelCard({ model, series }: { model: CatalogModel; series: CatalogSeries }) {
  return (
    <Link href={`/catalog/${series.maker_slug}/${series.name_slug}/${model.category_slug}`}>
      <div className="rounded-lg border border-[#e5e5e5] p-4 hover:shadow-md transition-shadow">
        {model.image_url && (
          <img src={model.image_url} alt={model.name} className="w-full h-40 object-contain mb-3" />
        )}
        <p className="text-xs text-[#888] mb-1">{series.maker}</p>
        <p className="text-base font-bold text-[#333]">{model.name}</p>
        <p className="text-sm text-[#666] mt-1">{categoryLabels[model.category] ?? model.category}</p>
        {model.price && (
          <p className="text-sm text-[#006728] font-bold mt-2">¥{model.price.toLocaleString()}</p>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 4: コミット**

```bash
git add src/components/catalog/
git commit -m "feat: add catalog UI components (spec-table, compare-table, model-card)"
```

---

## Task 5: カタログ公開ページ

**Files:**
- Create: `src/app/catalog/page.tsx`
- Create: `src/app/catalog/[maker]/page.tsx`
- Create: `src/app/catalog/[maker]/[series]/page.tsx`
- Create: `src/app/catalog/[maker]/[series]/[category]/page.tsx`

- [ ] **Step 1: 全メーカー一覧**

```tsx
// src/app/catalog/page.tsx
import Link from "next/link";
import { getMakers } from "@/lib/catalog";

export const revalidate = 86400;

export default async function CatalogPage() {
  const makers = await getMakers();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">クラブカタログ</h1>
      <div className="grid grid-cols-2 gap-4">
        {makers.map((m) => (
          <Link key={m.maker_slug} href={`/catalog/${m.maker_slug}`}
            className="rounded-lg border border-[#e5e5e5] p-4 text-center hover:shadow-md transition-shadow">
            <p className="text-lg font-bold text-[#333]">{m.maker}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: メーカー内シリーズ一覧**

```tsx
// src/app/catalog/[maker]/page.tsx
import Link from "next/link";
import { getSeriesByMaker } from "@/lib/catalog";
import { notFound } from "next/navigation";

export const revalidate = 86400;

export default async function MakerPage({ params }: { params: Promise<{ maker: string }> }) {
  const { maker } = await params;
  const series = await getSeriesByMaker(maker);
  if (series.length === 0) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{series[0].maker}</h1>
      <div className="grid grid-cols-2 gap-4">
        {series.map((s) => (
          <Link key={s.id} href={`/catalog/${maker}/${s.name_slug}`}
            className="rounded-lg border border-[#e5e5e5] p-4 text-center hover:shadow-md transition-shadow">
            {s.image_url && <img src={s.image_url} alt={s.name} className="w-full h-32 object-contain mb-2" />}
            <p className="text-lg font-bold text-[#333]">{s.name}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: シリーズ内モデル一覧**

```tsx
// src/app/catalog/[maker]/[series]/page.tsx
import { getModelsBySeries } from "@/lib/catalog";
import { ModelCard } from "@/components/catalog/model-card";
import { notFound } from "next/navigation";

export const revalidate = 86400;

export default async function SeriesPage({ params }: { params: Promise<{ maker: string; series: string }> }) {
  const { maker, series } = await params;
  const models = await getModelsBySeries(maker, series);
  if (models.length === 0) notFound();

  const seriesInfo = models[0].catalog_series;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">{seriesInfo.maker} {seriesInfo.name}</h1>
      <p className="text-[#888] mb-6">ラインナップ</p>
      <div className="grid grid-cols-2 gap-4">
        {models.map((m) => (
          <ModelCard key={m.id} model={m} series={seriesInfo} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: モデル詳細 + スペック表**

```tsx
// src/app/catalog/[maker]/[series]/[category]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { getModelDetail, getModelsByCategory, modelSlug } from "@/lib/catalog";
import { SpecTable } from "@/components/catalog/spec-table";
import { notFound } from "next/navigation";

export const revalidate = 86400;

type Props = { params: Promise<{ maker: string; series: string; category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { maker, series, category } = await params;
  const model = await getModelDetail(maker, series, category);
  if (!model) return {};
  return {
    title: `${model.name} スペック | Waggly`,
    description: `${model.catalog_series.maker} ${model.name}の番手別スペック表。ロフト角・ライ角・クラブ長さを一覧で確認。`,
  };
}

export default async function ModelDetailPage({ params }: Props) {
  const { maker, series, category } = await params;
  const model = await getModelDetail(maker, series, category);
  if (!model) notFound();

  // 同カテゴリの他モデル（比較ボタン用）
  const others = await getModelsByCategory(category);
  const selfSlug = modelSlug(model.catalog_series);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <p className="text-sm text-[#888] mb-1">{model.catalog_series.maker}</p>
      <h1 className="text-2xl font-bold mb-4">{model.name}</h1>

      {/* 基本情報 */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-6">
        {model.head_material && <div><span className="text-[#888]">素材:</span> {model.head_material}</div>}
        {model.finish && <div><span className="text-[#888]">仕上げ:</span> {model.finish}</div>}
        {model.price && <div><span className="text-[#888]">価格:</span> ¥{model.price.toLocaleString()}{model.price_note ? ` (${model.price_note})` : ""}</div>}
        {model.release_year && <div><span className="text-[#888]">発売年:</span> {model.release_year}</div>}
      </div>

      {/* シャフト一覧 */}
      {model.shaft_names && model.shaft_names.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-2">標準シャフト</h2>
          <ul className="list-disc list-inside text-sm text-[#333]">
            {model.shaft_names.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
      )}

      {/* スペック表 */}
      <h2 className="text-lg font-bold mb-2">スペック表</h2>
      <SpecTable specs={model.catalog_specs} category={model.category} />

      {/* 他モデルと比較ボタン */}
      {others.length > 1 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-3">他モデルと比較</h2>
          <div className="flex flex-wrap gap-2">
            {others
              .filter((o) => modelSlug(o.catalog_series) !== selfSlug)
              .map((o) => {
                const otherSlug = modelSlug(o.catalog_series);
                const [a, b] = [selfSlug, otherSlug].sort();
                return (
                  <Link key={o.id} href={`/compare/${category}/${a}-vs-${b}`}
                    className="rounded-full border border-[#006728] px-4 py-2 text-sm text-[#006728] hover:bg-[#006728] hover:text-white transition-colors">
                    vs {o.catalog_series.maker} {o.name}
                  </Link>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: コミット**

```bash
git add src/app/catalog/
git commit -m "feat: add catalog public pages (maker, series, model detail)"
```

---

## Task 6: 比較ページ

**Files:**
- Create: `src/app/compare/[category]/page.tsx`
- Create: `src/app/compare/[category]/[slug]/page.tsx`

- [ ] **Step 1: 比較インデックスページ**

```tsx
// src/app/compare/[category]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { getModelsByCategory, modelSlug } from "@/lib/catalog";
import { notFound } from "next/navigation";

export const revalidate = 86400;

const categoryLabels: Record<string, string> = {
  driver: "ドライバー", fairway_wood: "フェアウェイウッド", utility: "ユーティリティ",
  iron: "アイアン", wedge: "ウェッジ", putter: "パター",
};

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const label = categoryLabels[category] ?? category;
  return {
    title: `${label}比較一覧 | Waggly`,
    description: `${label}のスペック比較一覧。メーカー横断でロフト角・ライ角・飛距離を比較。`,
  };
}

export default async function CompareIndexPage({ params }: Props) {
  const { category } = await params;
  const models = await getModelsByCategory(category);
  if (models.length < 2) notFound();

  const label = categoryLabels[category] ?? category;

  // 全組み合わせ生成
  const pairs: { a: typeof models[0]; b: typeof models[0]; href: string }[] = [];
  for (let i = 0; i < models.length; i++) {
    for (let j = i + 1; j < models.length; j++) {
      const slugA = modelSlug(models[i].catalog_series);
      const slugB = modelSlug(models[j].catalog_series);
      const [a, b] = slugA < slugB ? [slugA, slugB] : [slugB, slugA];
      pairs.push({
        a: models[i], b: models[j],
        href: `/compare/${category}/${a}-vs-${b}`,
      });
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{label}比較一覧</h1>
      <div className="flex flex-col gap-2">
        {pairs.map((p) => (
          <Link key={p.href} href={p.href}
            className="rounded-lg border border-[#e5e5e5] p-4 hover:shadow-md transition-shadow flex items-center justify-between">
            <span className="font-bold text-[#333]">{p.a.name}</span>
            <span className="text-[#006728] font-bold text-sm px-3">VS</span>
            <span className="font-bold text-[#333]">{p.b.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: VS比較ページ**

```tsx
// src/app/compare/[category]/[slug]/page.tsx
import type { Metadata } from "next";
import { getCompareModels } from "@/lib/catalog";
import { CompareTable } from "@/components/catalog/compare-table";
import { notFound } from "next/navigation";

export const revalidate = 86400;

type Props = { params: Promise<{ category: string; slug: string }> };

function parseVsSlug(slug: string): { slugA: string; slugB: string } | null {
  const parts = slug.split("-vs-");
  if (parts.length !== 2) return null;
  return { slugA: parts[0], slugB: parts[1] };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, slug } = await params;
  const parsed = parseVsSlug(slug);
  if (!parsed) return {};
  const { modelA, modelB } = await getCompareModels(category, parsed.slugA, parsed.slugB);
  if (!modelA || !modelB) return {};
  return {
    title: `${modelA.name} vs ${modelB.name} 比較 | Waggly`,
    description: `${modelA.catalog_series.maker} ${modelA.name}と${modelB.catalog_series.maker} ${modelB.name}の番手別スペック比較。ロフト角・ライ角・長さを並べて確認。`,
  };
}

export default async function ComparePage({ params }: Props) {
  const { category, slug } = await params;
  const parsed = parseVsSlug(slug);
  if (!parsed) notFound();

  const { modelA, modelB } = await getCompareModels(category, parsed.slugA, parsed.slugB);
  if (!modelA || !modelB) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{modelA.name} vs {modelB.name}</h1>

      {/* 基本情報比較 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[modelA, modelB].map((m) => (
          <div key={m.id} className="rounded-lg border border-[#e5e5e5] p-4">
            <p className="text-xs text-[#888]">{m.catalog_series.maker}</p>
            <p className="text-lg font-bold text-[#333] mb-2">{m.name}</p>
            {m.head_material && <p className="text-sm text-[#666]">{m.head_material}</p>}
            {m.price && <p className="text-sm text-[#006728] font-bold mt-1">¥{m.price.toLocaleString()}</p>}
          </div>
        ))}
      </div>

      {/* スペック比較表 */}
      <h2 className="text-lg font-bold mb-3">番手別スペック比較</h2>
      <CompareTable modelA={modelA} modelB={modelB} />
    </div>
  );
}
```

- [ ] **Step 3: コミット**

```bash
git add src/app/compare/
git commit -m "feat: add compare index and VS comparison pages"
```

---

## Task 7: Admin UIとサイドバー

**Files:**
- Create: `src/app/admin/catalog/page.tsx`
- Modify: `src/components/admin/admin-sidebar.tsx`

- [ ] **Step 1: Admin カタログ管理ページ**

```tsx
// src/app/admin/catalog/page.tsx
"use client";

import { useEffect, useState } from "react";

type Series = {
  id: string;
  maker: string;
  name: string;
  maker_slug: string;
  name_slug: string;
  catalog_models: { id: string; name: string; category: string }[];
};

export default function AdminCatalogPage() {
  const [series, setSeries] = useState<Series[]>([]);
  const [form, setForm] = useState({ maker: "", name: "" });

  async function load() {
    const res = await fetch("/api/admin/catalog/series");
    if (res.ok) setSeries(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function addSeries() {
    if (!form.maker || !form.name) return;
    const res = await fetch("/api/admin/catalog/series", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ maker: "", name: "" });
      load();
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">カタログ管理</h1>

      {/* シリーズ追加 */}
      <div className="flex gap-2 mb-6">
        <input placeholder="メーカー" value={form.maker} onChange={(e) => setForm({ ...form, maker: e.target.value })}
          className="border rounded px-3 py-1.5 text-sm" />
        <input placeholder="シリーズ名" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border rounded px-3 py-1.5 text-sm" />
        <button onClick={addSeries} className="bg-[#006728] text-white px-4 py-1.5 rounded text-sm font-bold">追加</button>
      </div>

      {/* シリーズ一覧 */}
      <div className="space-y-3">
        {series.map((s) => (
          <div key={s.id} className="border rounded-lg p-4">
            <p className="font-bold">{s.maker} / {s.name}</p>
            <p className="text-xs text-[#888]">/{s.maker_slug}/{s.name_slug}</p>
            {s.catalog_models.length > 0 && (
              <ul className="mt-2 text-sm text-[#666]">
                {s.catalog_models.map((m) => <li key={m.id}>• {m.name} ({m.category})</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: サイドバー更新**

`src/components/admin/admin-sidebar.tsx` の items配列にカタログを追加:

```tsx
  const items = [
    { href: "/admin/catalog", label: "カタログ", match: (p: string) => p.startsWith("/admin/catalog") },
    { href: "/admin/knowledge", label: "ナレッジ", match: (p: string) => p.startsWith("/admin/knowledge") },
  ];
```

- [ ] **Step 3: コミット**

```bash
git add src/app/admin/catalog/ src/components/admin/admin-sidebar.tsx
git commit -m "feat: add admin catalog management page and sidebar link"
```

---

## Task 8: SEO（sitemap）

**Files:**
- Create or modify: `src/app/sitemap.ts`

- [ ] **Step 1: sitemap生成**

既存のsitemap.tsがあるか確認し、なければ作成。カタログ・比較ページのURLを含める。

```typescript
// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BASE = "https://waggly.jp";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/catalog`, changeFrequency: "weekly", priority: 0.8 },
  ];

  // カタログページ
  const { data: models } = await supabase
    .from("catalog_models")
    .select("category_slug, catalog_series(maker_slug, name_slug)");

  if (models) {
    const makers = new Set<string>();
    const seriesSet = new Set<string>();

    for (const m of models) {
      const s = m.catalog_series as any;
      makers.add(s.maker_slug);
      seriesSet.add(`${s.maker_slug}/${s.name_slug}`);
      entries.push({
        url: `${BASE}/catalog/${s.maker_slug}/${s.name_slug}/${m.category_slug}`,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }

    for (const maker of makers) {
      entries.push({ url: `${BASE}/catalog/${maker}`, changeFrequency: "weekly", priority: 0.6 });
    }
    for (const series of seriesSet) {
      entries.push({ url: `${BASE}/catalog/${series}`, changeFrequency: "weekly", priority: 0.6 });
    }

    // 比較ページ
    const byCategory = new Map<string, { slug: string; makerSlug: string; nameSlug: string }[]>();
    for (const m of models) {
      const s = m.catalog_series as any;
      const list = byCategory.get(m.category_slug) ?? [];
      list.push({ slug: `${s.maker_slug}-${s.name_slug}`, makerSlug: s.maker_slug, nameSlug: s.name_slug });
      byCategory.set(m.category_slug, list);
    }

    for (const [cat, list] of byCategory) {
      if (list.length >= 2) {
        entries.push({ url: `${BASE}/compare/${cat}`, changeFrequency: "weekly", priority: 0.6 });
      }
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const [a, b] = [list[i].slug, list[j].slug].sort();
          entries.push({
            url: `${BASE}/compare/${cat}/${a}-vs-${b}`,
            changeFrequency: "monthly",
            priority: 0.7,
          });
        }
      }
    }
  }

  return entries;
}
```

- [ ] **Step 2: コミット**

```bash
git add src/app/sitemap.ts
git commit -m "feat: add sitemap with catalog and compare page URLs"
```

---

## Summary

| Task | 内容 | ファイル数 |
|------|------|:-:|
| 1 | DB Migration | 1 |
| 2 | データアクセス層 | 1 |
| 3 | Admin API | 3 |
| 4 | UIコンポーネント | 3 |
| 5 | カタログ公開ページ | 4 |
| 6 | 比較ページ | 2 |
| 7 | Admin UI + サイドバー | 2 |
| 8 | SEO sitemap | 1 |
| **合計** | | **17** |
