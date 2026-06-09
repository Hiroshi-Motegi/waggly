# 構造化メモUI + ギア起点表示（Phase 1c）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 練習後のクラブ別メモを構造化タグ（症状・感覚・ギアの気づき）で記録し、クラブ詳細画面にギア起点のサマリー（使用履歴・傾向・直近メモ）を表示する。

**Architecture:** `club_memos` テーブルに構造化フィールド（condition, symptom_tags, feeling_tags, gear_tags）を追加。メモ入力UIをタグ選択式に変更。クラブ詳細画面にサマリーセクションを追加し、蓄積されたタグからクラブの傾向を表示。ナレッジベースから症状に応じた参考情報を表示。

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase (PostgreSQL), Tailwind CSS, Vitest

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/008_structured_memos.sql` | club_memos テーブルに構造化フィールド追加 |
| Modify | `src/types/database.ts` | ClubMemo 型に構造化フィールド追加 |
| Create | `src/lib/memo-tags.ts` | タグ定義マスター（症状・感覚・ギアの気づき） |
| Create | `src/components/club/structured-memo-form.tsx` | 構造化メモ入力フォーム |
| Modify | `src/app/bag/[clubId]/memos/page.tsx` | メモ入力画面を構造化フォームに置き換え |
| Create | `src/components/club/club-usage-summary.tsx` | クラブ使用サマリー表示コンポーネント |
| Modify | `src/app/bag/[clubId]/page.tsx` | クラブ詳細画面にサマリーセクション追加 |
| Create | `src/app/api/clubs/[clubId]/summary/route.ts` | クラブ使用サマリーAPI |
| Modify | `src/app/api/clubs/[clubId]/memos/route.ts` | 構造化フィールドの保存に対応 |
| Create | `__tests__/lib/memo-tags.test.ts` | タグ関連ユーティリティのテスト |

---

### Task 1: DB マイグレーション — 構造化メモフィールド追加

**Files:**
- Create: `supabase/migrations/008_structured_memos.sql`

- [ ] **Step 1: Create migration file**

```sql
-- 構造化メモ: タグベースのクラブ別フィードバック
-- condition: 調子（good/normal/bad）
-- symptom_tags: 症状タグ（JSON配列）
-- feeling_tags: 体の感覚タグ（JSON配列）
-- gear_tags: ギアの気づきタグ（JSON配列）

ALTER TABLE public.club_memos ADD COLUMN IF NOT EXISTS condition text CHECK (condition IN ('good', 'normal', 'bad'));
ALTER TABLE public.club_memos ADD COLUMN IF NOT EXISTS symptom_tags jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.club_memos ADD COLUMN IF NOT EXISTS feeling_tags jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.club_memos ADD COLUMN IF NOT EXISTS gear_tags jsonb DEFAULT '[]'::jsonb;

-- practice_sessions に rating カラム追加（既存UIで収集しているが未保存）
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS rating integer CHECK (rating BETWEEN 1 AND 5);
```

- [ ] **Step 2: Apply migration**

Supabase Dashboard SQL Editor で実行。

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/008_structured_memos.sql
git commit -m "feat: add structured memo fields and practice rating column"
```

---

### Task 2: TypeScript 型定義の更新

**Files:**
- Modify: `src/types/database.ts`

- [ ] **Step 1: Update ClubMemo interface**

`src/types/database.ts` の `ClubMemo` interface を更新:

```typescript
export type MemoCondition = "good" | "normal" | "bad";

export interface ClubMemo {
  id: string;
  club_id: string;
  distance: number | null;
  memo: string | null;
  condition: MemoCondition | null;
  symptom_tags: string[];
  feeling_tags: string[];
  gear_tags: string[];
  created_at: string;
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: add structured fields to ClubMemo type"
```

---

### Task 3: タグ定義マスター

**Files:**
- Create: `src/lib/memo-tags.ts`
- Create: `__tests__/lib/memo-tags.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// __tests__/lib/memo-tags.test.ts
import { describe, it, expect } from "vitest";
import {
  SYMPTOM_TAGS,
  FEELING_TAGS,
  GEAR_TAGS,
  GOOD_TAGS,
  getTagsByCondition,
} from "@/lib/memo-tags";

describe("memo-tags", () => {
  it("SYMPTOM_TAGS has categories with tags", () => {
    expect(SYMPTOM_TAGS.length).toBeGreaterThan(0);
    SYMPTOM_TAGS.forEach((cat) => {
      expect(cat.label).toBeTruthy();
      expect(cat.tags.length).toBeGreaterThan(0);
    });
  });

  it("FEELING_TAGS is a flat array", () => {
    expect(FEELING_TAGS.length).toBeGreaterThan(0);
    FEELING_TAGS.forEach((tag) => expect(typeof tag).toBe("string"));
  });

  it("GEAR_TAGS is a flat array", () => {
    expect(GEAR_TAGS.length).toBeGreaterThan(0);
  });

  it("GOOD_TAGS is a flat array", () => {
    expect(GOOD_TAGS.length).toBeGreaterThan(0);
  });

  it("getTagsByCondition returns correct tags for bad", () => {
    const result = getTagsByCondition("bad");
    expect(result.symptomTags).toBe(SYMPTOM_TAGS);
    expect(result.feelingTags).toBe(FEELING_TAGS);
    expect(result.gearTags).toBe(GEAR_TAGS);
    expect(result.goodTags).toBeUndefined();
  });

  it("getTagsByCondition returns correct tags for good", () => {
    const result = getTagsByCondition("good");
    expect(result.goodTags).toBe(GOOD_TAGS);
    expect(result.symptomTags).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/lib/memo-tags.test.ts`

- [ ] **Step 3: Implement tag definitions**

```typescript
// src/lib/memo-tags.ts

export interface TagCategory {
  label: string;
  tags: string[];
}

// 症状タグ（悩み時）— カテゴリ分け
export const SYMPTOM_TAGS: TagCategory[] = [
  { label: "球筋", tags: ["右に出る", "左に出る", "スライス", "フック", "バラつく"] },
  { label: "弾道", tags: ["高すぎ", "低すぎ", "吹き上がる", "ドロップ"] },
  { label: "ミス", tags: ["トップ", "ダフリ", "シャンク", "テンプラ", "飛距離不足"] },
];

// 体の感覚タグ（悩み時）
export const FEELING_TAGS = [
  "力んだ", "芯に当たらない", "リズム悪い", "疲れ", "振り切れない", "手打ち感",
];

// ギアの気づきタグ（悩み時）
export const GEAR_TAGS = [
  "硬い", "柔い", "重い", "軽い", "グリップ滑る", "構えにくい",
];

// 好調時タグ
export const GOOD_TAGS = [
  "距離感", "方向性", "打感", "高さ", "安定性", "スピン",
];

// 調子に応じたタグセットを返す
export function getTagsByCondition(condition: "good" | "normal" | "bad"): {
  symptomTags?: TagCategory[];
  feelingTags?: string[];
  gearTags?: string[];
  goodTags?: string[];
} {
  if (condition === "good") {
    return { goodTags: GOOD_TAGS };
  }
  if (condition === "bad") {
    return { symptomTags: SYMPTOM_TAGS, feelingTags: FEELING_TAGS, gearTags: GEAR_TAGS };
  }
  // normal: 全部表示（任意）
  return { symptomTags: SYMPTOM_TAGS, feelingTags: FEELING_TAGS, gearTags: GEAR_TAGS, goodTags: GOOD_TAGS };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run __tests__/lib/memo-tags.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/memo-tags.ts __tests__/lib/memo-tags.test.ts
git commit -m "feat: add memo tag definitions with tests"
```

---

### Task 4: 構造化メモ入力フォーム

**Files:**
- Create: `src/components/club/structured-memo-form.tsx`

- [ ] **Step 1: Create the form component**

```tsx
// src/components/club/structured-memo-form.tsx
"use client";

import { useState } from "react";
import type { MemoCondition } from "@/types/database";
import { SYMPTOM_TAGS, FEELING_TAGS, GEAR_TAGS, GOOD_TAGS, getTagsByCondition } from "@/lib/memo-tags";

interface Props {
  clubId: string;
  clubNumber: string;
  clubModel?: string | null;
  onSaved: () => void;
  onCancel: () => void;
}

const conditionOptions: { value: MemoCondition; emoji: string; label: string }[] = [
  { value: "bad", emoji: "😣", label: "悩み" },
  { value: "normal", emoji: "😐", label: "普通" },
  { value: "good", emoji: "😊", label: "好調" },
];

export function StructuredMemoForm({ clubId, clubNumber, clubModel, onSaved, onCancel }: Props) {
  const [condition, setCondition] = useState<MemoCondition | null>(null);
  const [symptomTags, setSymptomTags] = useState<string[]>([]);
  const [feelingTags, setFeelingTags] = useState<string[]>([]);
  const [gearTags, setGearTags] = useState<string[]>([]);
  const [distance, setDistance] = useState<string>("");
  const [memo, setMemo] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function toggleTag(tag: string, current: string[], setter: (v: string[]) => void) {
    setter(current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]);
  }

  async function handleSubmit() {
    if (!condition) return;
    setIsSaving(true);
    try {
      // good の場合、goodTags を symptom_tags に格納（DB上は同じカラムを流用）
      const allSymptomTags = condition === "good" ? symptomTags : symptomTags;
      await fetch(`/api/clubs/${clubId}/memos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distance: distance ? Number(distance) : null,
          memo: memo || null,
          condition,
          symptom_tags: allSymptomTags,
          feeling_tags: condition === "good" ? [] : feelingTags,
          gear_tags: condition === "good" ? [] : gearTags,
        }),
      });
      onSaved();
    } finally {
      setIsSaving(false);
    }
  }

  const tagSet = condition ? getTagsByCondition(condition) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="font-bold text-sm">{clubNumber}</span>
        {clubModel && <span className="text-xs text-[#8b8b8b]">{clubModel}</span>}
      </div>

      {/* Condition */}
      <div>
        <p className="text-xs font-bold mb-2">調子は？</p>
        <div className="flex gap-2">
          {conditionOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setCondition(opt.value);
                setSymptomTags([]);
                setFeelingTags([]);
                setGearTags([]);
              }}
              className={`flex-1 rounded-lg border-2 py-2 text-center ${
                condition === opt.value
                  ? opt.value === "bad" ? "border-[#e74c3c] bg-[#ffeaea]"
                    : opt.value === "good" ? "border-[#27ae60] bg-[#eafbea]"
                    : "border-[#f39c12] bg-[#fff8e1]"
                  : "border-[#ddd] bg-white"
              }`}
            >
              <div className="text-xl">{opt.emoji}</div>
              <div className="text-xs mt-0.5">{opt.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tags based on condition */}
      {condition && tagSet && (
        <>
          {/* Good: 何が良かった？ */}
          {tagSet.goodTags && condition === "good" && (
            <div>
              <p className="text-xs font-bold mb-2">何が良かった？</p>
              <div className="flex flex-wrap gap-1.5">
                {tagSet.goodTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag, symptomTags, setSymptomTags)}
                    className={`rounded-full px-3 py-1 text-xs ${
                      symptomTags.includes(tag)
                        ? "bg-[#27ae60] text-white"
                        : "border border-[#ddd] bg-white text-[#333]"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bad/Normal: 症状 */}
          {tagSet.symptomTags && condition !== "good" && (
            <div>
              <p className="text-xs font-bold mb-2">何が起きた？</p>
              {tagSet.symptomTags.map((cat) => (
                <div key={cat.label} className="mb-2">
                  <p className="text-[11px] text-[#8b8b8b] mb-1">{cat.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag, symptomTags, setSymptomTags)}
                        className={`rounded-full px-3 py-1 text-xs ${
                          symptomTags.includes(tag)
                            ? "bg-[#006728] text-white"
                            : "border border-[#ddd] bg-white text-[#333]"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bad/Normal: 体の感覚 */}
          {tagSet.feelingTags && condition !== "good" && (
            <div>
              <p className="text-xs font-bold mb-2">体の感覚</p>
              <div className="flex flex-wrap gap-1.5">
                {tagSet.feelingTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag, feelingTags, setFeelingTags)}
                    className={`rounded-full px-3 py-1 text-xs ${
                      feelingTags.includes(tag)
                        ? "bg-[#006728] text-white"
                        : "border border-[#ddd] bg-white text-[#333]"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bad/Normal: ギアの気づき */}
          {tagSet.gearTags && condition !== "good" && (
            <div>
              <p className="text-xs font-bold mb-2">ギアの気づき</p>
              <div className="flex flex-wrap gap-1.5">
                {tagSet.gearTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag, gearTags, setGearTags)}
                    className={`rounded-full px-3 py-1 text-xs ${
                      gearTags.includes(tag)
                        ? "bg-[#006728] text-white"
                        : "border border-[#ddd] bg-white text-[#333]"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Distance */}
      <div className="flex items-center gap-2">
        <span className="text-xs">飛距離</span>
        <input
          type="number"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          placeholder=""
          className="w-[77px] border-b border-[#c4c4c4] bg-white px-3 py-1 text-center text-sm focus-visible:outline-none"
        />
        <span className="text-xs">yd</span>
      </div>

      {/* Free memo */}
      <div>
        <p className="text-xs font-bold mb-1">メモ（任意）</p>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 rounded-full border border-[#c4c4c4] py-2 text-sm font-bold text-[#666]">
          キャンセル
        </button>
        <button
          onClick={handleSubmit}
          disabled={!condition || isSaving}
          className="flex-1 rounded-full bg-[#006728] py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {isSaving ? "保存中..." : "保存"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/club/structured-memo-form.tsx
git commit -m "feat: add structured memo form with tag selection"
```

---

### Task 5: メモAPI更新 — 構造化フィールド対応

**Files:**
- Modify: `src/app/api/clubs/[clubId]/memos/route.ts`

- [ ] **Step 1: Update POST handler to accept structured fields**

既存の POST ハンドラに `condition`, `symptom_tags`, `feeling_tags`, `gear_tags` を追加。読み取りとバリデーションして insert に含める。

既存コードを読んで、`supabase.from("club_memos").insert(...)` の部分に新フィールドを追加:

```typescript
const { condition, symptom_tags, feeling_tags, gear_tags, distance, memo } = await request.json();

// insert に追加
const { data, error } = await supabase.from("club_memos").insert({
  club_id: clubId,
  distance: distance ?? null,
  memo: memo ?? null,
  condition: condition ?? null,
  symptom_tags: symptom_tags ?? [],
  feeling_tags: feeling_tags ?? [],
  gear_tags: gear_tags ?? [],
}).select().single();
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/clubs/[clubId]/memos/route.ts
git commit -m "feat: accept structured memo fields in memos API"
```

---

### Task 6: メモ入力画面の更新

**Files:**
- Modify: `src/app/bag/[clubId]/memos/page.tsx`

- [ ] **Step 1: Replace memo form with StructuredMemoForm**

既存のメモ入力フォーム（distance + memo のシンプルフォーム）を `StructuredMemoForm` コンポーネントに置き換え。

URL パラメータ `?add=1` で追加モード、それ以外はメモ一覧表示。

既存ページを読んで、フォーム部分を `StructuredMemoForm` に差し替える。一覧表示部分は維持し、各メモに condition アイコン + タグを表示するよう更新。

- [ ] **Step 2: Update memo list display**

メモ一覧で各メモに:
- 調子アイコン（😣/😐/😊）
- 選択されたタグ（ピル表示）
- 飛距離
- 自由メモ
- 日付

を表示。

- [ ] **Step 3: Verify in browser**

- `/bag/[clubId]/memos?add=1` → 構造化フォームが表示される
- 調子を選択 → 対応するタグが表示される
- タグ選択 → 保存 → メモ一覧に構造化データが表示される

- [ ] **Step 4: Commit**

```bash
git add src/app/bag/[clubId]/memos/page.tsx
git commit -m "feat: replace memo form with structured memo UI"
```

---

### Task 7: クラブ使用サマリーAPI

**Files:**
- Create: `src/app/api/clubs/[clubId]/summary/route.ts`

- [ ] **Step 1: Create summary API**

```typescript
// src/app/api/clubs/[clubId]/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase } = auth;
  const { clubId } = await params;

  // 直近3ヶ月の練習クラブデータ
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const { data: practiceClubs } = await supabase
    .from("practice_clubs")
    .select("balls, avg_distance, session_id, practice_sessions!inner(practiced_at)")
    .eq("club_id", clubId)
    .gte("practice_sessions.practiced_at", threeMonthsAgo.toISOString().split("T")[0]);

  // 直近3ヶ月のメモ
  const { data: memos } = await supabase
    .from("club_memos")
    .select("*")
    .eq("club_id", clubId)
    .gte("created_at", threeMonthsAgo.toISOString())
    .order("created_at", { ascending: false });

  // 集計
  const totalBalls = (practiceClubs ?? []).reduce((sum: number, pc: any) => sum + (pc.balls ?? 0), 0);
  const distances = (practiceClubs ?? [])
    .map((pc: any) => pc.avg_distance)
    .filter((d: any) => d != null);
  const avgDistance = distances.length > 0
    ? Math.round(distances.reduce((a: number, b: number) => a + b, 0) / distances.length)
    : null;

  // タグ集計
  const tagCounts: Record<string, number> = {};
  const conditionCounts = { good: 0, normal: 0, bad: 0 };

  (memos ?? []).forEach((m: any) => {
    if (m.condition) conditionCounts[m.condition as keyof typeof conditionCounts]++;
    [...(m.symptom_tags ?? []), ...(m.feeling_tags ?? []), ...(m.gear_tags ?? [])].forEach((tag: string) => {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    });
  });

  // タグを出現回数順にソート
  const topTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));

  return NextResponse.json({
    totalBalls,
    avgDistance,
    memoCount: (memos ?? []).length,
    conditionCounts,
    topTags,
    recentMemos: (memos ?? []).slice(0, 5),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/clubs/[clubId]/summary/route.ts
git commit -m "feat: add club usage summary API endpoint"
```

---

### Task 8: クラブ使用サマリー表示コンポーネント

**Files:**
- Create: `src/components/club/club-usage-summary.tsx`

- [ ] **Step 1: Create summary component**

```tsx
// src/components/club/club-usage-summary.tsx
"use client";

import { useEffect, useState } from "react";
import type { MemoCondition, ClubMemo } from "@/types/database";

interface SummaryData {
  totalBalls: number;
  avgDistance: number | null;
  memoCount: number;
  conditionCounts: Record<MemoCondition, number>;
  topTags: { tag: string; count: number }[];
  recentMemos: ClubMemo[];
}

const conditionEmoji: Record<MemoCondition, string> = {
  good: "😊",
  normal: "😐",
  bad: "😣",
};

interface Props {
  clubId: string;
}

export function ClubUsageSummary({ clubId }: Props) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      const res = await fetch(`/api/clubs/${clubId}/summary`);
      if (res.ok) setData(await res.json());
      setIsLoading(false);
    }
    fetchSummary();
  }, [clubId]);

  if (isLoading) return <div className="py-4 text-center text-xs text-[#8b8b8b]">読み込み中...</div>;
  if (!data || (data.totalBalls === 0 && data.memoCount === 0)) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* Usage stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-bold text-[#006728]">{data.totalBalls}</p>
          <p className="text-[10px] text-[#8b8b8b]">球（3ヶ月）</p>
        </div>
        <div>
          <p className="text-lg font-bold text-[#006728]">{data.avgDistance ?? "—"}</p>
          <p className="text-[10px] text-[#8b8b8b]">平均飛距離(yd)</p>
        </div>
        <div>
          <p className="text-lg font-bold text-[#006728]">{data.memoCount}</p>
          <p className="text-[10px] text-[#8b8b8b]">メモ数</p>
        </div>
      </div>

      {/* Top tags */}
      {data.topTags.length > 0 && (
        <div>
          <p className="text-xs font-bold mb-1">よく出るキーワード</p>
          <div className="flex flex-wrap gap-1.5">
            {data.topTags.map(({ tag, count }) => (
              <span key={tag} className="rounded-full bg-[#f0f0f0] px-2.5 py-0.5 text-xs text-[#333]">
                {tag} ×{count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent memos */}
      {data.recentMemos.length > 0 && (
        <div>
          <p className="text-xs font-bold mb-1">直近のメモ</p>
          <div className="flex flex-col gap-1.5">
            {data.recentMemos.slice(0, 3).map((m) => (
              <div
                key={m.id}
                className={`rounded-lg border-l-3 pl-2.5 py-1.5 text-xs ${
                  m.condition === "bad" ? "border-l-[#e74c3c]"
                    : m.condition === "good" ? "border-l-[#27ae60]"
                    : "border-l-[#f39c12]"
                }`}
              >
                <div className="flex items-center gap-1">
                  <span>{m.condition ? conditionEmoji[m.condition] : ""}</span>
                  <span className="text-[#8b8b8b]">
                    {new Date(m.created_at).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                  </span>
                </div>
                {[...(m.symptom_tags ?? []), ...(m.feeling_tags ?? []), ...(m.gear_tags ?? [])].length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {[...(m.symptom_tags ?? []), ...(m.feeling_tags ?? []), ...(m.gear_tags ?? [])].map((tag) => (
                      <span key={tag} className="rounded-full bg-[#f0f0f0] px-2 py-0.5 text-[10px]">{tag}</span>
                    ))}
                  </div>
                )}
                {m.memo && <p className="text-[#666] mt-0.5">{m.memo}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/club/club-usage-summary.tsx
git commit -m "feat: add club usage summary component with tags and recent memos"
```

---

### Task 9: クラブ詳細画面にサマリーセクション追加

**Files:**
- Modify: `src/app/bag/[clubId]/page.tsx`

- [ ] **Step 1: Add ClubUsageSummary to detail page**

既存のアクティビティセクションの上に、新しい「使用サマリー」カードを追加:

```tsx
import { ClubUsageSummary } from "@/components/club/club-usage-summary";
```

アクティビティセクションの前に:

```tsx
{/* 使用サマリー */}
<div className="rounded-lg bg-white p-3">
  <h3 className="text-sm font-bold mb-2">使用サマリー（3ヶ月）</h3>
  <ClubUsageSummary clubId={clubId} />
</div>
```

- [ ] **Step 2: Verify in browser**

- クラブ詳細画面に使用サマリーが表示される
- メモが0件の場合はサマリーセクション非表示
- タグが蓄積されると「よく出るキーワード」が表示される

- [ ] **Step 3: Commit**

```bash
git add src/app/bag/[clubId]/page.tsx
git commit -m "feat: add usage summary section to club detail page"
```

---

### Task 10: 最終確認

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: ビルド成功

- [ ] **Step 3: Manual verification**

1. `/bag/[clubId]/memos?add=1` → 構造化メモフォームが表示
2. 調子「悩み」→ 症状/感覚/ギアのタグが表示
3. 調子「好調」→「何が良かった？」タグが表示
4. タグ選択 + 保存 → メモ一覧に反映
5. `/bag/[clubId]` → 使用サマリーにタグ傾向が表示
