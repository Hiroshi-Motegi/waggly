# ギア管理強化（Phase 1a）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** クラブの詳細スペック（重量等）をプログレッシブに入力可能にし、飛距離階段グラフ・重量フローグラフをビジュアル化する。

**Architecture:** 既存の Club 型に詳細フィールドを追加し、クラブフォームに折りたたみ式の「詳細スペック」セクションを追加。recharts で2種のグラフ（飛距離階段・重量フロー）をマイバッグ画面に表示。入力されたデータに応じてグラフが解放される設計。

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase (PostgreSQL), Tailwind CSS, recharts, Vitest

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/types/database.ts` | Club 型に詳細フィールド追加 |
| Create | `supabase/migrations/007_add_club_detail_specs.sql` | DB カラム追加 |
| Modify | `src/components/club/club-form.tsx` | 詳細スペック折りたたみセクション追加 |
| Create | `src/components/club/club-detail-specs.tsx` | 詳細スペック入力フォーム（分離コンポーネント） |
| Modify | `src/app/bag/[clubId]/page.tsx` | クラブ詳細画面に詳細スペック表示追加 |
| Create | `src/components/charts/distance-staircase.tsx` | 飛距離階段グラフ |
| Create | `src/components/charts/weight-flow.tsx` | 重量フローグラフ |
| Modify | `src/app/bag/page.tsx` | マイバッグ画面にグラフタブ/セクション追加 |
| Modify | `src/lib/gap-analysis.ts` | グラフ用のデータ整形関数追加 |
| Create | `__tests__/lib/gap-analysis-chart-data.test.ts` | グラフデータ整形のテスト |
| Create | `__tests__/components/charts/distance-staircase.test.tsx` | 飛距離階段グラフのテスト |
| Create | `__tests__/components/charts/weight-flow.test.tsx` | 重量フローグラフのテスト |

---

### Task 1: recharts のインストール

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install recharts**

```bash
npm install recharts
```

- [ ] **Step 2: Verify installation**

Run: `npm ls recharts`
Expected: `recharts@2.x.x` が表示される

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add recharts for gear analysis charts"
```

---

### Task 2: DB マイグレーション — クラブ詳細スペックカラム追加

**Files:**
- Create: `supabase/migrations/007_add_club_detail_specs.sql`

- [ ] **Step 1: Create migration file**

```sql
-- 詳細スペック: プログレッシブディスクロージャー（詳細層）
-- 基本層（既存）: category, club_number, maker, model, shaft_name, shaft_flex, loft, lie, length, distance
-- 詳細層（新規）: weight, swing_weight, frequency, kick_point, head_volume, head_weight

ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS weight numeric;          -- 総重量 (g)
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS swing_weight text;       -- バランス (D0, D1, D2 等)
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS frequency integer;       -- 振動数 (cpm)
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS kick_point text;         -- キックポイント (先調子/中調子/元調子)
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS head_volume integer;     -- ヘッド体積 (cc)
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS head_weight numeric;     -- ヘッド重量 (g)
```

- [ ] **Step 2: Apply migration to local Supabase**

Run: `npx supabase db push` or apply via Supabase Dashboard SQL editor
Expected: 6 columns added to clubs table

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/007_add_club_detail_specs.sql
git commit -m "feat: add club detail spec columns (weight, frequency, etc.)"
```

---

### Task 3: TypeScript 型定義の更新

**Files:**
- Modify: `src/types/database.ts`

- [ ] **Step 1: Add detail fields to Club interface**

`src/types/database.ts` の Club interface に以下を追加（`created_at` の直前）:

```typescript
  // 詳細スペック（プログレッシブディスクロージャー: 詳細層）
  weight: number | null;          // 総重量 (g)
  swing_weight: string | null;    // バランス (D0, D1, D2 等)
  frequency: number | null;       // 振動数 (cpm)
  kick_point: string | null;      // キックポイント
  head_volume: number | null;     // ヘッド体積 (cc)
  head_weight: number | null;     // ヘッド重量 (g)
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: ビルド成功（新フィールドは全て nullable なので既存コードに影響なし）

- [ ] **Step 3: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: add detail spec fields to Club type"
```

---

### Task 4: グラフ用データ整形関数 — テストファースト

**Files:**
- Modify: `src/lib/gap-analysis.ts`
- Create: `__tests__/lib/gap-analysis-chart-data.test.ts`

- [ ] **Step 1: Write failing tests for chart data functions**

```typescript
// __tests__/lib/gap-analysis-chart-data.test.ts
import { describe, it, expect } from "vitest";
import {
  getDistanceStaircaseData,
  getWeightFlowData,
} from "@/lib/gap-analysis";
import type { Club } from "@/types/database";

function makeClub(overrides: Partial<Club>): Club {
  return {
    id: "1",
    user_id: "u1",
    category: "iron",
    club_number: "7I",
    maker: null,
    model: null,
    shaft_name: null,
    shaft_flex: null,
    loft: null,
    lie: null,
    length: null,
    distance: null,
    release_year: null,
    memo: null,
    purchase_date: null,
    purchase_shop: null,
    purchase_price: null,
    status: "bag",
    bag_number: 1,
    sort_order: 0,
    weight: null,
    swing_weight: null,
    frequency: null,
    kick_point: null,
    head_volume: null,
    head_weight: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("getDistanceStaircaseData", () => {
  it("returns clubs sorted by distance descending with gap flags", () => {
    const clubs = [
      makeClub({ id: "1", club_number: "7I", distance: 150, sort_order: 4 }),
      makeClub({ id: "2", club_number: "Dr", distance: 230, sort_order: 1, category: "driver" }),
      makeClub({ id: "3", club_number: "PW", distance: 120, sort_order: 5, category: "wedge" }),
      makeClub({ id: "4", club_number: "5W", distance: 200, sort_order: 2, category: "fairway_wood" }),
    ];
    const result = getDistanceStaircaseData(clubs);
    expect(result).toHaveLength(4);
    // Sorted by distance descending
    expect(result[0].club_number).toBe("Dr");
    expect(result[0].distance).toBe(230);
    expect(result[1].club_number).toBe("5W");
    expect(result[1].distance).toBe(200);
    // Gap between Dr(230) and 5W(200) = 30 > 20 → hasGap
    expect(result[0].hasGap).toBe(true);
    // Gap between 5W(200) and 7I(150) = 50 > 20 → hasGap
    expect(result[1].hasGap).toBe(true);
    // Gap between 7I(150) and PW(120) = 30 > 20 → hasGap
    expect(result[2].hasGap).toBe(true);
    // Last item never has gap
    expect(result[3].hasGap).toBe(false);
  });

  it("excludes clubs without distance", () => {
    const clubs = [
      makeClub({ id: "1", club_number: "7I", distance: 150, sort_order: 1 }),
      makeClub({ id: "2", club_number: "8I", distance: null, sort_order: 2 }),
    ];
    const result = getDistanceStaircaseData(clubs);
    expect(result).toHaveLength(1);
    expect(result[0].club_number).toBe("7I");
  });

  it("returns empty array for no clubs", () => {
    expect(getDistanceStaircaseData([])).toEqual([]);
  });
});

describe("getWeightFlowData", () => {
  it("returns clubs with weight sorted by sort_order", () => {
    const clubs = [
      makeClub({ id: "1", club_number: "Dr", weight: 310, sort_order: 1, category: "driver" }),
      makeClub({ id: "2", club_number: "5W", weight: 330, sort_order: 2, category: "fairway_wood" }),
      makeClub({ id: "3", club_number: "7I", weight: 420, sort_order: 3 }),
    ];
    const result = getWeightFlowData(clubs);
    expect(result).toHaveLength(3);
    expect(result[0].club_number).toBe("Dr");
    expect(result[0].weight).toBe(310);
    expect(result[2].club_number).toBe("7I");
    expect(result[2].weight).toBe(420);
    // Weight should increase → isFlowCorrect
    expect(result[0].isFlowCorrect).toBe(true);
    expect(result[1].isFlowCorrect).toBe(true);
    expect(result[2].isFlowCorrect).toBe(true);
  });

  it("flags reversed weight flow", () => {
    const clubs = [
      makeClub({ id: "1", club_number: "Dr", weight: 310, sort_order: 1, category: "driver" }),
      makeClub({ id: "2", club_number: "5W", weight: 300, sort_order: 2, category: "fairway_wood" }),
    ];
    const result = getWeightFlowData(clubs);
    // 5W(300) is lighter than Dr(310) → flow issue
    expect(result[1].isFlowCorrect).toBe(false);
  });

  it("excludes clubs without weight", () => {
    const clubs = [
      makeClub({ id: "1", club_number: "Dr", weight: 310, sort_order: 1, category: "driver" }),
      makeClub({ id: "2", club_number: "5W", weight: null, sort_order: 2, category: "fairway_wood" }),
    ];
    const result = getWeightFlowData(clubs);
    expect(result).toHaveLength(1);
  });

  it("returns empty array for no clubs with weight", () => {
    const clubs = [
      makeClub({ id: "1", club_number: "7I", weight: null, sort_order: 1 }),
    ];
    expect(getWeightFlowData(clubs)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/lib/gap-analysis-chart-data.test.ts`
Expected: FAIL — `getDistanceStaircaseData` と `getWeightFlowData` が存在しない

- [ ] **Step 3: Implement chart data functions**

`src/lib/gap-analysis.ts` の末尾に追加:

```typescript
// --- Chart data types ---

export interface DistanceStaircaseItem {
  club_number: string;
  distance: number;
  hasGap: boolean; // Gap to next club > 20yd
}

export interface WeightFlowItem {
  club_number: string;
  weight: number;
  isFlowCorrect: boolean; // Weight increases from previous club
}

// --- Chart data functions ---

export function getDistanceStaircaseData(clubs: Club[]): DistanceStaircaseItem[] {
  const withDistance = clubs.filter((c) => c.distance != null);
  const sorted = [...withDistance].sort((a, b) => b.distance! - a.distance!);

  return sorted.map((club, i) => {
    const next = sorted[i + 1];
    const hasGap = next != null && club.distance! - next.distance! > GAP_THRESHOLD_YD;
    return {
      club_number: club.club_number,
      distance: club.distance!,
      hasGap,
    };
  });
}

export function getWeightFlowData(clubs: Club[]): WeightFlowItem[] {
  const withWeight = clubs.filter((c) => c.weight != null);
  const sorted = [...withWeight].sort((a, b) => a.sort_order - b.sort_order);

  return sorted.map((club, i) => {
    const prev = sorted[i - 1];
    const isFlowCorrect = prev == null || club.weight! >= prev.weight!;
    return {
      club_number: club.club_number,
      weight: club.weight!,
      isFlowCorrect,
    };
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/lib/gap-analysis-chart-data.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/gap-analysis.ts __tests__/lib/gap-analysis-chart-data.test.ts
git commit -m "feat: add distance staircase and weight flow data functions with tests"
```

---

### Task 5: 飛距離階段グラフコンポーネント

**Files:**
- Create: `src/components/charts/distance-staircase.tsx`

- [ ] **Step 1: Create the chart component**

```tsx
// src/components/charts/distance-staircase.tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, ReferenceLine } from "recharts";
import type { DistanceStaircaseItem } from "@/lib/gap-analysis";

interface Props {
  data: DistanceStaircaseItem[];
}

export function DistanceStaircase({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[#8b8b8b]">
        飛距離を入力するとグラフが表示されます
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="club_number" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} unit="yd" />
        <Tooltip
          formatter={(value: number) => [`${value} yd`, "飛距離"]}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="distance" radius={[4, 4, 0, 0]}>
          {data.map((item, i) => (
            <Cell
              key={i}
              fill={item.hasGap ? "#e74c3c" : "#006728"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: ビルド成功

- [ ] **Step 3: Commit**

```bash
git add src/components/charts/distance-staircase.tsx
git commit -m "feat: add distance staircase bar chart component"
```

---

### Task 6: 重量フローグラフコンポーネント

**Files:**
- Create: `src/components/charts/weight-flow.tsx`

- [ ] **Step 1: Create the chart component**

```tsx
// src/components/charts/weight-flow.tsx
"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Dot } from "recharts";
import type { WeightFlowItem } from "@/lib/gap-analysis";

interface Props {
  data: WeightFlowItem[];
}

function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={5}
      fill={payload.isFlowCorrect ? "#006728" : "#e74c3c"}
      stroke="white"
      strokeWidth={2}
    />
  );
}

export function WeightFlow({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[#8b8b8b]">
        詳細スペックで重量を入力するとグラフが表示されます
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="club_number" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} unit="g" />
        <Tooltip
          formatter={(value: number) => [`${value} g`, "重量"]}
          contentStyle={{ fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#006728"
          strokeWidth={2}
          dot={<CustomDot />}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: ビルド成功

- [ ] **Step 3: Commit**

```bash
git add src/components/charts/weight-flow.tsx
git commit -m "feat: add weight flow line chart component"
```

---

### Task 7: クラブフォームに詳細スペックセクション追加

**Files:**
- Create: `src/components/club/club-detail-specs.tsx`
- Modify: `src/components/club/club-form.tsx`

- [ ] **Step 1: Create detail specs sub-component**

```tsx
// src/components/club/club-detail-specs.tsx
"use client";

import { useState } from "react";
import type { Club } from "@/types/database";

const inputClass =
  "w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]";

const kickPointOptions = ["先調子", "先中調子", "中調子", "中元調子", "元調子"];

interface Props {
  form: Partial<Club>;
  onChange: <K extends keyof Club>(key: K, value: Club[K] | undefined) => void;
}

export function ClubDetailSpecs({ form, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(
    // Auto-open if any detail field already has data
    form.weight != null ||
    form.swing_weight != null ||
    form.frequency != null ||
    form.kick_point != null ||
    form.head_volume != null ||
    form.head_weight != null
  );

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-2 text-xs text-[#8b8b8b]"
      >
        <span>詳細スペック（任意）</span>
        <span className="text-base">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="flex flex-col gap-3 pb-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-0.5">
              <label className="text-xs text-[#8b8b8b]">総重量 (g)</label>
              <input
                type="number"
                step="0.1"
                value={form.weight ?? ""}
                onChange={(e) => onChange("weight", e.target.value ? Number(e.target.value) : undefined)}
                placeholder=""
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-xs text-[#8b8b8b]">バランス</label>
              <input
                type="text"
                value={form.swing_weight ?? ""}
                onChange={(e) => onChange("swing_weight", e.target.value || undefined)}
                placeholder="例: D2"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-0.5">
              <label className="text-xs text-[#8b8b8b]">振動数 (cpm)</label>
              <input
                type="number"
                value={form.frequency ?? ""}
                onChange={(e) => onChange("frequency", e.target.value ? Number(e.target.value) : undefined)}
                placeholder=""
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-xs text-[#8b8b8b]">キックポイント</label>
              <select
                value={form.kick_point ?? ""}
                onChange={(e) => onChange("kick_point", e.target.value || undefined)}
                className={inputClass}
              >
                <option value="">—</option>
                {kickPointOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-0.5">
              <label className="text-xs text-[#8b8b8b]">ヘッド体積 (cc)</label>
              <input
                type="number"
                value={form.head_volume ?? ""}
                onChange={(e) => onChange("head_volume", e.target.value ? Number(e.target.value) : undefined)}
                placeholder=""
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-xs text-[#8b8b8b]">ヘッド重量 (g)</label>
              <input
                type="number"
                step="0.1"
                value={form.head_weight ?? ""}
                onChange={(e) => onChange("head_weight", e.target.value ? Number(e.target.value) : undefined)}
                placeholder=""
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Integrate into ClubForm**

`src/components/club/club-form.tsx` を修正:

1. import を追加:
```typescript
import { ClubDetailSpecs } from "@/components/club/club-detail-specs";
```

2. `form` state の初期値に新フィールドを追加:
```typescript
weight: undefined,
swing_weight: "",
frequency: undefined,
kick_point: "",
head_volume: undefined,
head_weight: undefined,
```

3. スペックセクション（Section 2: スペック）の閉じ `</div>` の直前に追加:
```tsx
<ClubDetailSpecs form={form} onChange={update} />
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`
- `/bag/new` にアクセス
- 「詳細スペック（任意）」の折りたたみが表示される
- 開くと6フィールドが表示される
- デフォルトは閉じた状態

- [ ] **Step 4: Commit**

```bash
git add src/components/club/club-detail-specs.tsx src/components/club/club-form.tsx
git commit -m "feat: add progressive disclosure detail specs section to club form"
```

---

### Task 8: クラブ詳細画面に詳細スペック表示を追加

**Files:**
- Modify: `src/app/bag/[clubId]/page.tsx`

- [ ] **Step 1: Add detail specs display section**

`src/app/bag/[clubId]/page.tsx` のスペックグリッド（shaft_name, shaft_flex, loft, lie, length を表示している箇所）の下に、詳細スペックがある場合のみ表示するセクションを追加:

```tsx
{/* 詳細スペック（入力済みの場合のみ表示） */}
{(club.weight != null || club.swing_weight || club.frequency != null || club.kick_point || club.head_volume != null || club.head_weight != null) && (
  <div className="border-t border-[#e8e8e8] pt-3 mt-3">
    <p className="text-xs text-[#8b8b8b] mb-2">詳細スペック</p>
    <div className="grid grid-cols-3 gap-2 text-sm">
      {club.weight != null && (
        <div>
          <span className="text-xs text-[#8b8b8b]">重量</span>
          <p className="font-medium">{club.weight}g</p>
        </div>
      )}
      {club.swing_weight && (
        <div>
          <span className="text-xs text-[#8b8b8b]">バランス</span>
          <p className="font-medium">{club.swing_weight}</p>
        </div>
      )}
      {club.frequency != null && (
        <div>
          <span className="text-xs text-[#8b8b8b]">振動数</span>
          <p className="font-medium">{club.frequency}cpm</p>
        </div>
      )}
      {club.kick_point && (
        <div>
          <span className="text-xs text-[#8b8b8b]">キックポイント</span>
          <p className="font-medium">{club.kick_point}</p>
        </div>
      )}
      {club.head_volume != null && (
        <div>
          <span className="text-xs text-[#8b8b8b]">ヘッド体積</span>
          <p className="font-medium">{club.head_volume}cc</p>
        </div>
      )}
      {club.head_weight != null && (
        <div>
          <span className="text-xs text-[#8b8b8b]">ヘッド重量</span>
          <p className="font-medium">{club.head_weight}g</p>
        </div>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 2: Verify in browser**

- 既存クラブ（詳細スペックなし）→ 詳細スペックセクションは非表示
- クラブ編集で重量等を入力 → 保存 → 詳細スペックが表示される

- [ ] **Step 3: Commit**

```bash
git add src/app/bag/[clubId]/page.tsx
git commit -m "feat: show detail specs on club detail page when present"
```

---

### Task 9: マイバッグ画面にグラフセクション追加

**Files:**
- Modify: `src/app/bag/page.tsx`

- [ ] **Step 1: Import chart components and data functions**

`src/app/bag/page.tsx` に import を追加:

```typescript
import { getDistanceStaircaseData, getWeightFlowData } from "@/lib/gap-analysis";
import { DistanceStaircase } from "@/components/charts/distance-staircase";
import { WeightFlow } from "@/components/charts/weight-flow";
```

- [ ] **Step 2: Add chart tab state**

コンポーネント内に state を追加:

```typescript
const [chartTab, setChartTab] = useState<"distance" | "weight">("distance");
```

- [ ] **Step 3: Compute chart data from filtered clubs**

フィルタ後のクラブリストからグラフデータを生成（bag1/bag2 フィルタ時のみ表示）:

```typescript
const bagClubs = clubs.filter((c) => c.status === "bag" && c.bag_number === (filter === "bag2" ? 2 : 1));
const distanceData = getDistanceStaircaseData(bagClubs);
const weightData = getWeightFlowData(bagClubs);
const showCharts = filter === "bag1" || filter === "bag2";
```

- [ ] **Step 4: Add chart section to page**

フィルタタブの下、クラブリストの上に追加:

```tsx
{showCharts && (
  <div className="rounded-lg bg-white p-3">
    <div className="flex gap-2 mb-2">
      <button
        onClick={() => setChartTab("distance")}
        className={`rounded-full px-3 py-1 text-xs font-bold ${
          chartTab === "distance"
            ? "bg-[#006728] text-white"
            : "bg-[#f0f0f0] text-[#666]"
        }`}
      >
        飛距離階段
      </button>
      <button
        onClick={() => setChartTab("weight")}
        className={`rounded-full px-3 py-1 text-xs font-bold ${
          chartTab === "weight"
            ? "bg-[#006728] text-white"
            : "bg-[#f0f0f0] text-[#666]"
        }`}
      >
        重量フロー
      </button>
    </div>
    {chartTab === "distance" ? (
      <DistanceStaircase data={distanceData} />
    ) : (
      <WeightFlow data={weightData} />
    )}
  </div>
)}
```

- [ ] **Step 5: Verify in browser**

- `/bag` にアクセス（マイバッグタブ）
- グラフセクションが表示される
- 飛距離入力済みのクラブがあれば飛距離階段グラフが表示
- 「重量フロー」タブ切り替え → 重量未入力なら「詳細スペックで重量を入力するとグラフが表示されます」メッセージ
- 「すべて」「予備」「アーカイブ」タブではグラフ非表示

- [ ] **Step 6: Commit**

```bash
git add src/app/bag/page.tsx
git commit -m "feat: add distance staircase and weight flow charts to bag page"
```

---

### Task 10: 既存テストの修正 — Club 型変更への対応

**Files:**
- Modify: `__tests__/lib/gap-analysis.test.ts`
- Modify: `__tests__/lib/ai/system-prompt.test.ts`

- [ ] **Step 1: Check existing tests pass**

Run: `npx vitest run`
Expected: 既存テストが Club 型の新フィールド不足で失敗する可能性がある

- [ ] **Step 2: Fix any failing tests**

既存テストで Club オブジェクトを生成している箇所に、新しいフィールドのデフォルト値を追加:

```typescript
weight: null,
swing_weight: null,
frequency: null,
kick_point: null,
head_volume: null,
head_weight: null,
```

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add __tests__/
git commit -m "fix: update existing tests for new Club detail spec fields"
```

---

### Task 11: 最終確認

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: ビルド成功、エラーなし

- [ ] **Step 3: Manual verification**

ブラウザで以下を確認:
1. `/bag/new` — 詳細スペック折りたたみが動作する
2. `/bag/[clubId]/edit` — 既存クラブの編集で詳細スペックが保存できる
3. `/bag/[clubId]` — 詳細スペック入力済みなら表示される
4. `/bag` — マイバッグタブで飛距離階段グラフが表示される
5. `/bag` — 重量フロータブ切り替えが動作する
