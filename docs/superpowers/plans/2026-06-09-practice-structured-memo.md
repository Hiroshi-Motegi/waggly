# 練習記録×構造化メモ統合 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 練習記録の作成・編集・詳細画面に、クラブごとの構造化メモ（condition / tags）をインライン入力できるようにする

**Architecture:** `club_memos` テーブルに `practice_session_id` を追加し、練習記録とクラブメモを紐づける。新規の `InlineClubMemo` 制御コンポーネントを作成し、`ClubBallsInput` に統合する。API は練習セッション保存時にメモも一緒に INSERT/UPDATE/DELETE する。

**Tech Stack:** Next.js (App Router), Supabase, TypeScript, React

---

## File Structure

| ファイル | 種別 | 責務 |
|---|---|---|
| `supabase/migrations/009_practice_memo_link.sql` | 新規 | `club_memos` に `practice_session_id` カラム追加 |
| `src/types/database.ts` | 変更 | `ClubMemo` に `practice_session_id` 追加、`PracticeSessionWithClubs` 拡張 |
| `src/components/club/inline-club-memo.tsx` | 新規 | 制御コンポーネント: condition + tags 入力 UI（保存ボタンなし） |
| `src/components/practice/club-balls-input.tsx` | 変更 | 各クラブにメモ展開トグル + `InlineClubMemo` 統合 |
| `src/components/practice/session-form.tsx` | 変更 | クラブごとの memo state 管理、submit データにメモ含める |
| `src/app/api/practice/route.ts` | 変更 | POST にメモ保存ロジック追加 |
| `src/app/api/practice/[sessionId]/route.ts` | 変更 | GET にメモ JOIN、PATCH にメモ更新ロジック追加 |
| `src/app/practice/[sessionId]/page.tsx` | 変更 | クラブ別セクションにメモ表示 |
| `src/app/practice/[sessionId]/edit/page.tsx` | 変更 | 初期データにメモ情報を含める |
| `src/hooks/use-practice.ts` | 変更 | `CreateSessionData` 型にメモ追加 |

---

### Task 1: マイグレーション — `club_memos` に `practice_session_id` 追加

**Files:**
- Create: `supabase/migrations/009_practice_memo_link.sql`

- [ ] **Step 1: マイグレーションファイルを作成**

```sql
-- Link club_memos to practice_sessions
alter table public.club_memos
  add column practice_session_id uuid references public.practice_sessions(id) on delete set null;

create index club_memos_practice_session_id_idx on public.club_memos(practice_session_id);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/009_practice_memo_link.sql
git commit -m "feat: add practice_session_id to club_memos"
```

---

### Task 2: 型定義の更新

**Files:**
- Modify: `src/types/database.ts:118-128` (`ClubMemo` interface)
- Modify: `src/types/database.ts:150-152` (`PracticeSessionWithClubs` interface)

- [ ] **Step 1: `ClubMemo` に `practice_session_id` を追加**

`src/types/database.ts` の `ClubMemo` interface を変更:

```typescript
export interface ClubMemo {
  id: string;
  club_id: string;
  distance: number | null;
  memo: string | null;
  condition: MemoCondition | null;
  symptom_tags: string[];
  feeling_tags: string[];
  gear_tags: string[];
  practice_session_id: string | null;
  created_at: string;
}
```

- [ ] **Step 2: `PracticeSessionWithClubs` に memo を追加**

```typescript
export interface PracticeSessionWithClubs extends PracticeSession {
  practice_clubs: (PracticeClub & { club: Club; memo: ClubMemo | null })[];
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: add practice_session_id to ClubMemo type, memo to PracticeSessionWithClubs"
```

---

### Task 3: `InlineClubMemo` 制御コンポーネント作成

**Files:**
- Create: `src/components/club/inline-club-memo.tsx`

- [ ] **Step 1: コンポーネントを作成**

既存の `StructuredMemoForm` の入力部分（condition 選択 + tags 選択 + メモテキスト）を抽出した制御コンポーネント。保存ボタンなし。飛距離フィールドなし（`ClubBallsInput` の `avg_distance` を流用するため）。

```typescript
"use client";

import { useState } from "react";
import type { MemoCondition } from "@/types/database";
import { getTagsByCondition } from "@/lib/memo-tags";

export interface InlineClubMemoValue {
  condition: MemoCondition;
  symptom_tags: string[];
  feeling_tags: string[];
  gear_tags: string[];
  memo: string | null;
}

interface Props {
  value: InlineClubMemoValue | null;
  onChange: (value: InlineClubMemoValue | null) => void;
}

const conditionOptions: { value: MemoCondition; emoji: string; label: string }[] = [
  { value: "bad", emoji: "😣", label: "悩み" },
  { value: "normal", emoji: "😐", label: "普通" },
  { value: "good", emoji: "😊", label: "好調" },
];

export function InlineClubMemo({ value, onChange }: Props) {
  function setCondition(condition: MemoCondition) {
    onChange({
      condition,
      symptom_tags: [],
      feeling_tags: [],
      gear_tags: [],
      memo: value?.memo ?? null,
    });
  }

  function toggleTag(tag: string, current: string[], field: "symptom_tags" | "feeling_tags" | "gear_tags") {
    if (!value) return;
    const updated = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
    onChange({ ...value, [field]: updated });
  }

  function setMemo(memo: string) {
    if (!value) return;
    onChange({ ...value, memo: memo || null });
  }

  function handleClear() {
    onChange(null);
  }

  const condition = value?.condition ?? null;
  const tagSet = condition ? getTagsByCondition(condition) : null;

  return (
    <div className="flex flex-col gap-3 pt-2">
      {/* Condition selector */}
      <div>
        <p className="text-xs font-bold mb-1.5">調子は？</p>
        <div className="flex gap-2">
          {conditionOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setCondition(opt.value)}
              className={`flex-1 rounded-lg border-2 py-1.5 text-center ${
                condition === opt.value
                  ? opt.value === "bad" ? "border-[#e74c3c] bg-[#ffeaea]"
                    : opt.value === "good" ? "border-[#27ae60] bg-[#eafbea]"
                    : "border-[#f39c12] bg-[#fff8e1]"
                  : "border-[#ddd] bg-white"
              }`}
            >
              <div className="text-lg">{opt.emoji}</div>
              <div className="text-[10px] mt-0.5">{opt.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      {condition && tagSet && (
        <>
          {tagSet.goodTags && condition === "good" && (
            <div>
              <p className="text-xs font-bold mb-1.5">何が良かった？</p>
              <div className="flex flex-wrap gap-1.5">
                {tagSet.goodTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag, value?.symptom_tags ?? [], "symptom_tags")}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                      value?.symptom_tags.includes(tag)
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

          {tagSet.symptomTags && condition !== "good" && (
            <div>
              <p className="text-xs font-bold mb-1.5">何が起きた？</p>
              {tagSet.symptomTags.map((cat) => (
                <div key={cat.label} className="mb-1.5">
                  <p className="text-[11px] text-[#8b8b8b] mb-1">{cat.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag, value?.symptom_tags ?? [], "symptom_tags")}
                        className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                          value?.symptom_tags.includes(tag)
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

          {tagSet.feelingTags && condition !== "good" && (
            <div>
              <p className="text-xs font-bold mb-1.5">体の感覚</p>
              <div className="flex flex-wrap gap-1.5">
                {tagSet.feelingTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag, value?.feeling_tags ?? [], "feeling_tags")}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                      value?.feeling_tags.includes(tag)
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

          {tagSet.gearTags && condition !== "good" && (
            <div>
              <p className="text-xs font-bold mb-1.5">ギアの気づき</p>
              <div className="flex flex-wrap gap-1.5">
                {tagSet.gearTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag, value?.gear_tags ?? [], "gear_tags")}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                      value?.gear_tags.includes(tag)
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

      {/* Memo text */}
      {condition && (
        <div>
          <p className="text-xs font-bold mb-1">メモ（任意）</p>
          <textarea
            value={value?.memo ?? ""}
            onChange={(e) => setMemo(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
          />
        </div>
      )}

      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="self-start text-[11px] text-[#8b8b8b] underline"
        >
          メモをクリア
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/club/inline-club-memo.tsx
git commit -m "feat: add InlineClubMemo controlled component"
```

---

### Task 4: `ClubBallsInput` にメモ展開トグルを統合

**Files:**
- Modify: `src/components/practice/club-balls-input.tsx`

- [ ] **Step 1: `ClubBallsValue` インターフェースにメモを追加し、UI にトグルを追加**

`src/components/practice/club-balls-input.tsx` を変更する。

まず import と型を変更:

```typescript
"use client";

import { useState } from "react";
import { MessageSquarePlus, ChevronDown, ChevronUp } from "lucide-react";
import type { Club } from "@/types/database";
import { InlineClubMemo, type InlineClubMemoValue } from "@/components/club/inline-club-memo";

export interface ClubBallsValue {
  club_id: string;
  balls: number;
  avg_distance?: number | null;
  memo?: InlineClubMemoValue | null;
}
```

次に、各クラブの行（`return` 文内の `group.clubs.map` ループ内、l.101-153）を変更。既存の2行（club name + yd、slider + ball input）の下にメモトグルを追加:

```typescript
{group.clubs.map((club, i) => {
  const entry = getEntry(club.id);
  const currentBalls = entry?.balls ?? 0;
  const subLabel = [club.maker, club.model].filter(Boolean).join(" ");
  const hasMemo = entry?.memo != null;

  return (
    <div key={club.id} className={`flex flex-col gap-1 py-3 ${i < group.clubs.length - 1 ? "border-b border-[#e8e8e8]" : ""}`}>
      {/* Row 1: club name + yd input */}
      <div className="flex items-center">
        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold">{club.club_number}</span>
          {subLabel && <span className="ml-1.5 text-xs text-[#8b8b8b] truncate">{subLabel}</span>}
        </div>
        <div className="flex items-center gap-1 w-[72px] shrink-0">
          <input
            type="number"
            inputMode="decimal"
            value={entry?.avg_distance ?? ""}
            onChange={(e) =>
              update(club.id, {
                avg_distance: e.target.value ? Number(e.target.value) : null,
              })
            }
            placeholder="—"
            className="w-[52px] rounded-md border border-[#c4c4c4] bg-white px-1 py-1.5 text-xs text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
          />
          <span className="text-xs">yd</span>
        </div>
      </div>

      {/* Row 2: slider + ball input */}
      <div className="flex items-center gap-2 pt-1">
        <div className="flex-1 flex items-center">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={currentBalls}
            onChange={(e) => update(club.id, { balls: Number(e.target.value) })}
            className="club-balls-slider w-full"
          />
        </div>
        <div className="flex items-center gap-1 w-[72px] shrink-0">
          <input
            type="number"
            inputMode="numeric"
            value={currentBalls || ""}
            onChange={(e) =>
              update(club.id, { balls: e.target.value ? Number(e.target.value) : 0 })
            }
            placeholder="—"
            className="w-[52px] rounded-md border border-[#c4c4c4] bg-white px-1 py-1.5 text-xs text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
          />
          <span className="text-xs">球</span>
        </div>
      </div>

      {/* Row 3: memo toggle + inline memo */}
      <MemoToggle
        clubId={club.id}
        hasMemo={hasMemo}
        memoValue={entry?.memo ?? null}
        onMemoChange={(memo) => update(club.id, { memo })}
      />
    </div>
  );
})}
```

`MemoToggle` を同ファイル内に追加（`ClubBallsInput` の前に定義）:

```typescript
function MemoToggle({ clubId, hasMemo, memoValue, onMemoChange }: {
  clubId: string;
  hasMemo: boolean;
  memoValue: InlineClubMemoValue | null;
  onMemoChange: (value: InlineClubMemoValue | null) => void;
}) {
  const [open, setOpen] = useState(hasMemo);

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[11px] text-[#006728] font-bold"
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <MessageSquarePlus className="h-3 w-3" />}
        {hasMemo ? (memoValue?.condition === "good" ? "😊" : memoValue?.condition === "bad" ? "😣" : "😐") : "メモを追加"}
        {hasMemo && !open && <span className="text-[10px] text-[#8b8b8b] font-normal ml-1">タップで展開</span>}
      </button>
      {open && (
        <InlineClubMemo value={memoValue} onChange={onMemoChange} />
      )}
    </div>
  );
}
```

また、`update` 関数を変更して memo を保持するようにする。既存の `update` 関数 (l.49-58) を置き換え:

```typescript
function update(clubId: string, patch: Partial<ClubBallsValue>) {
  const existing = value.filter((v) => v.club_id !== clubId);
  const current = getEntry(clubId) ?? { club_id: clubId, balls: 0, avg_distance: null, memo: null };
  const updated = { ...current, ...patch };
  if (updated.balls > 0 || (updated.avg_distance != null && updated.avg_distance > 0) || updated.memo != null) {
    onChange([...existing, updated]);
  } else {
    onChange(existing);
  }
}
```

- [ ] **Step 2: ビルド確認**

Run: `npx next build 2>&1 | head -30`
Expected: ビルドエラーなし

- [ ] **Step 3: Commit**

```bash
git add src/components/practice/club-balls-input.tsx
git commit -m "feat: integrate InlineClubMemo toggle into ClubBallsInput"
```

---

### Task 5: `SessionForm` の submit データにメモを含める

**Files:**
- Modify: `src/components/practice/session-form.tsx:13-29` (型定義)
- Modify: `src/hooks/use-practice.ts:29-35` (`CreateSessionData` 型)

- [ ] **Step 1: `SessionForm` の型を更新**

`src/components/practice/session-form.tsx` の `SessionFormProps` で `initialData` と `onSubmit` の `clubs` にメモを追加:

```typescript
import type { InlineClubMemoValue } from "@/components/club/inline-club-memo";

interface SessionFormProps {
  clubs: Club[];
  reserveClubs?: Club[];
  pastLocations?: string[];
  initialData?: {
    practiced_at: string;
    location: string | null;
    total_balls: number | null;
    memo: string | null;
    rating?: number | null;
    practice_clubs?: { club_id: string; balls: number; avg_distance?: number | null; memo?: InlineClubMemoValue | null }[];
  };
  showRating?: boolean;
  onSubmit: (data: {
    practiced_at: string;
    location: string;
    total_balls: number;
    memo: string;
    rating: number | null;
    clubs: { club_id: string; balls: number; avg_distance?: number | null; memo?: InlineClubMemoValue | null }[];
  }) => void;
  isSubmitting?: boolean;
  showCancel?: boolean;
  onCancel?: () => void;
}
```

`handleSubmit` 内の `clubs` データはそのまま `clubBalls` を渡す（`ClubBallsValue` に既に `memo` が含まれている）。既存の `handleSubmit` (l.51-63) は変更不要 — `clubBalls` がそのまま memo を含む。

- [ ] **Step 2: `use-practice.ts` の `CreateSessionData` 型を更新**

`src/hooks/use-practice.ts` の `CreateSessionData` を変更:

```typescript
import type { InlineClubMemoValue } from "@/components/club/inline-club-memo";

interface CreateSessionData {
  practiced_at: string;
  location: string;
  total_balls: number;
  memo: string;
  clubs: { club_id: string; balls: number; avg_distance?: number | null; memo?: InlineClubMemoValue | null }[];
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/practice/session-form.tsx src/hooks/use-practice.ts
git commit -m "feat: pass club memo data through SessionForm and CreateSessionData"
```

---

### Task 6: POST API — 練習セッション作成時にメモも保存

**Files:**
- Modify: `src/app/api/practice/route.ts:20-63` (POST handler)

- [ ] **Step 1: POST ハンドラにメモ保存ロジックを追加**

`src/app/api/practice/route.ts` の POST 関数を変更。`practice_clubs` INSERT の後にメモ INSERT を追加:

```typescript
export async function POST(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { clubs: clubBalls, rating, ...sessionData } = await request.json();

  // Create session
  const { data: session, error: sessionError } = await supabase
    .from("practice_sessions")
    .insert({ ...sessionData, user_id: userId })
    .select()
    .single();

  if (sessionError) {
    console.error("practice session insert error:", sessionError.message, sessionData);
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  // Create per-club records
  if (clubBalls && clubBalls.length > 0) {
    const records = clubBalls
      .filter((cb: any) => cb.balls > 0)
      .map((cb: any) => ({
        session_id: session.id,
        club_id: cb.club_id,
        balls: cb.balls,
        avg_distance: cb.avg_distance ?? null,
      }));

    if (records.length > 0) {
      const { error: clubError } = await supabase
        .from("practice_clubs")
        .insert(records);

      if (clubError) {
        console.error("practice clubs insert error:", clubError.message, records);
        return NextResponse.json({ error: clubError.message }, { status: 500 });
      }
    }

    // Create club memos linked to this session
    const memoRecords = clubBalls
      .filter((cb: any) => cb.memo?.condition)
      .map((cb: any) => ({
        club_id: cb.club_id,
        practice_session_id: session.id,
        distance: cb.avg_distance ?? null,
        memo: cb.memo.memo || null,
        condition: cb.memo.condition,
        symptom_tags: cb.memo.symptom_tags || [],
        feeling_tags: cb.memo.condition === "good" ? [] : (cb.memo.feeling_tags || []),
        gear_tags: cb.memo.condition === "good" ? [] : (cb.memo.gear_tags || []),
      }));

    if (memoRecords.length > 0) {
      const { error: memoError } = await supabase
        .from("club_memos")
        .insert(memoRecords);

      if (memoError) {
        console.error("club memos insert error:", memoError.message, memoRecords);
        return NextResponse.json({ error: memoError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json(session, { status: 201 });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/practice/route.ts
git commit -m "feat: save club memos when creating practice session"
```

---

### Task 7: GET/PATCH API — メモ取得とメモ更新

**Files:**
- Modify: `src/app/api/practice/[sessionId]/route.ts`

- [ ] **Step 1: GET ハンドラでメモを JOIN して返す**

`src/app/api/practice/[sessionId]/route.ts` の GET 関数を変更。セッション取得後に紐づくメモを取得し、`practice_clubs` にマージする:

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { sessionId } = await params;

  const { data, error } = await supabase
    .from("practice_sessions")
    .select("*, practice_clubs(*, club:clubs(id, club_number, category, maker, model))")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch memos linked to this session
  const { data: memos } = await supabase
    .from("club_memos")
    .select("*")
    .eq("practice_session_id", sessionId);

  // Merge memos into practice_clubs
  if (data.practice_clubs && memos) {
    const memoByClub = new Map(memos.map((m: any) => [m.club_id, m]));
    data.practice_clubs = data.practice_clubs.map((pc: any) => ({
      ...pc,
      memo: memoByClub.get(pc.club_id) ?? null,
    }));
  }

  return NextResponse.json(data);
}
```

- [ ] **Step 2: PATCH ハンドラにメモ更新ロジックを追加**

同ファイルの PATCH 関数を変更。既存の `practice_clubs` の delete+insert の後にメモの更新を追加:

```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { sessionId } = await params;
  const { clubs: clubBalls, rating, ...sessionData } = await request.json();

  // Update session fields
  const { data: session, error: sessionError } = await supabase
    .from("practice_sessions")
    .update(sessionData)
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select()
    .single();

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Replace club balls: delete existing then insert new
  const { error: deleteError } = await supabase
    .from("practice_clubs")
    .delete()
    .eq("session_id", sessionId);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  if (clubBalls && clubBalls.length > 0) {
    const records = clubBalls
      .filter((cb: any) => cb.balls > 0)
      .map((cb: any) => ({
        session_id: sessionId,
        club_id: cb.club_id,
        balls: cb.balls,
        avg_distance: cb.avg_distance ?? null,
      }));

    if (records.length > 0) {
      const { error: clubError } = await supabase
        .from("practice_clubs")
        .insert(records);

      if (clubError) return NextResponse.json({ error: clubError.message }, { status: 500 });
    }
  }

  // Replace memos linked to this session: delete existing then insert new
  const { error: memoDeleteError } = await supabase
    .from("club_memos")
    .delete()
    .eq("practice_session_id", sessionId);

  if (memoDeleteError) return NextResponse.json({ error: memoDeleteError.message }, { status: 500 });

  if (clubBalls && clubBalls.length > 0) {
    const memoRecords = clubBalls
      .filter((cb: any) => cb.memo?.condition)
      .map((cb: any) => ({
        club_id: cb.club_id,
        practice_session_id: sessionId,
        distance: cb.avg_distance ?? null,
        memo: cb.memo.memo || null,
        condition: cb.memo.condition,
        symptom_tags: cb.memo.symptom_tags || [],
        feeling_tags: cb.memo.condition === "good" ? [] : (cb.memo.feeling_tags || []),
        gear_tags: cb.memo.condition === "good" ? [] : (cb.memo.gear_tags || []),
      }));

    if (memoRecords.length > 0) {
      const { error: memoError } = await supabase
        .from("club_memos")
        .insert(memoRecords);

      if (memoError) return NextResponse.json({ error: memoError.message }, { status: 500 });
    }
  }

  return NextResponse.json(session);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/practice/[sessionId]/route.ts
git commit -m "feat: fetch and update club memos in practice session API"
```

---

### Task 8: 練習セッション詳細画面にメモ表示

**Files:**
- Modify: `src/app/practice/[sessionId]/page.tsx:89-115`

- [ ] **Step 1: クラブ別セクションにメモ情報を表示**

`src/app/practice/[sessionId]/page.tsx` のクラブ別セクション（l.89-115）を変更。各クラブの行にメモがあれば condition emoji + tags を表示:

```typescript
{session.practice_clubs && session.practice_clubs.length > 0 && (
  <>
    <p className="text-base font-bold text-white px-1 pt-4">クラブ別</p>
    <div className="flex flex-col rounded-lg bg-white p-3">
      {session.practice_clubs.map((pc, i) => (
        <div key={pc.club_id} className={`flex flex-col gap-1.5 py-2 ${i < session.practice_clubs.length - 1 ? "border-b border-[#dfdfdf]" : ""}`}>
          <div className="flex items-center justify-between text-sm">
            <div className="min-w-0 flex items-center gap-1.5">
              <span className="font-bold">{pc.club?.club_number ?? "?"}</span>
              {pc.memo?.condition && (
                <span className="text-base">{pc.memo.condition === "good" ? "😊" : pc.memo.condition === "bad" ? "😣" : "😐"}</span>
              )}
              {(pc.club?.maker || pc.club?.model) && (
                <span className="text-xs text-[#8b8b8b]">
                  {[pc.club?.maker, pc.club?.model].filter(Boolean).join(" ")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {pc.avg_distance != null && (
                <span className="text-xs text-[#8b8b8b]">{pc.avg_distance} yd</span>
              )}
              <span className="rounded-full bg-[#c7e2ca] px-2 py-0.5 text-xs">
                {pc.balls}球
              </span>
            </div>
          </div>
          {/* Memo tags */}
          {pc.memo && (
            <div className="flex flex-wrap gap-1 pl-1">
              {pc.memo.symptom_tags.map((tag: string) => (
                <span key={tag} className="rounded-full bg-[#f0f0f0] px-2 py-0.5 text-[10px] text-[#555]">{tag}</span>
              ))}
              {pc.memo.feeling_tags.map((tag: string) => (
                <span key={tag} className="rounded-full bg-[#f0f0f0] px-2 py-0.5 text-[10px] text-[#555]">{tag}</span>
              ))}
              {pc.memo.gear_tags.map((tag: string) => (
                <span key={tag} className="rounded-full bg-[#f0f0f0] px-2 py-0.5 text-[10px] text-[#555]">{tag}</span>
              ))}
              {pc.memo.memo && (
                <p className="w-full text-xs text-[#666] mt-0.5">{pc.memo.memo}</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  </>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/practice/[sessionId]/page.tsx
git commit -m "feat: display club memos in practice session detail"
```

---

### Task 9: 練習セッション編集画面で既存メモを初期データに含める

**Files:**
- Modify: `src/app/practice/[sessionId]/edit/page.tsx:99-109`

- [ ] **Step 1: `initialData` にメモ情報をマッピング**

`src/app/practice/[sessionId]/edit/page.tsx` の `initialData` 作成部分（l.99-109）を変更:

```typescript
const initialData = {
  practiced_at: session.practiced_at,
  location: session.location,
  total_balls: session.total_balls,
  memo: session.memo,
  practice_clubs: session.practice_clubs?.map((pc) => ({
    club_id: pc.club_id,
    balls: pc.balls,
    avg_distance: pc.avg_distance,
    memo: pc.memo ? {
      condition: pc.memo.condition!,
      symptom_tags: pc.memo.symptom_tags,
      feeling_tags: pc.memo.feeling_tags,
      gear_tags: pc.memo.gear_tags,
      memo: pc.memo.memo,
    } : null,
  })),
};
```

- [ ] **Step 2: ビルド確認**

Run: `npx next build 2>&1 | head -30`
Expected: ビルドエラーなし

- [ ] **Step 3: 動作確認 — フルフロー**

1. 練習記録を新規作成 → 番手別タブでクラブを追加 → メモを入力して保存
2. 詳細画面でメモが表示されることを確認
3. 編集画面でメモが初期値として表示されることを確認
4. メモを変更して保存 → 詳細画面で変更が反映されることを確認
5. クラブ詳細のタイムラインに練習メモが表示されることを確認

- [ ] **Step 4: Commit**

```bash
git add src/app/practice/[sessionId]/edit/page.tsx
git commit -m "feat: load existing memos into practice edit form"
```
