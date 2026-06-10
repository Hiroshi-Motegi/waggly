# ギャラリー/リストビュー切り替え Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** アイテムとマイバッグページにギャラリー/リストビュー切り替え機能を追加する

**Architecture:** 共通の `ViewModeToggle` コンポーネントを作成し、両ページの `PageHeader` 内に配置。ビューモードは `localStorage` で永続化。ギャラリービューは2カラムグリッドで、画像サムネイル + メタデータを表示。マイバッグの並替モードはリストビューを強制する。

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, lucide-react

**Spec:** `docs/superpowers/specs/2026-06-10-gallery-list-toggle-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/ui/view-mode-toggle.tsx` | Create | ピル型トグルコンポーネント (list/gallery 切り替え) |
| `src/app/items/page.tsx` | Modify | トグル追加 + ギャラリービュー条件分岐 |
| `src/app/bag/page.tsx` | Modify | トグル追加 + ギャラリービュー条件分岐 + 並替連動 |

---

### Task 1: ViewModeToggle コンポーネント作成

**Files:**
- Create: `src/components/ui/view-mode-toggle.tsx`

- [ ] **Step 1: Create the ViewModeToggle component**

Create `src/components/ui/view-mode-toggle.tsx`:

```tsx
"use client";

import { List, LayoutGrid } from "lucide-react";

type ViewMode = "list" | "gallery";

export function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="flex items-center rounded-full bg-white p-0.5">
      <button
        onClick={() => onChange("list")}
        className={`flex items-center justify-center size-[28px] rounded-full ${
          mode === "list" ? "bg-[#006728]" : ""
        }`}
      >
        <List
          className={`h-4 w-4 ${
            mode === "list" ? "text-white" : "text-[#8b8b8b]"
          }`}
        />
      </button>
      <button
        onClick={() => onChange("gallery")}
        className={`flex items-center justify-center size-[28px] rounded-full ${
          mode === "gallery" ? "bg-[#006728]" : ""
        }`}
      >
        <LayoutGrid
          className={`h-4 w-4 ${
            mode === "gallery" ? "text-white" : "text-[#8b8b8b]"
          }`}
        />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify the component renders**

Run: `npx next build` or start dev server and visually confirm on either page (after Task 2).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/view-mode-toggle.tsx
git commit -m "feat: add ViewModeToggle component for list/gallery switching"
```

---

### Task 2: アイテムページにギャラリービュー追加

**Files:**
- Modify: `src/app/items/page.tsx`

- [ ] **Step 1: Add view mode state and toggle to header**

At the top of `src/app/items/page.tsx`, add the import:

```tsx
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
```

Inside `ItemsPage()`, add view mode state (after existing state declarations, around line 66):

```tsx
const [viewMode, setViewModeState] = useState<"list" | "gallery">(() => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("items-view-mode");
    if (saved === "gallery") return "gallery";
  }
  return "list";
});
function setViewMode(mode: "list" | "gallery") {
  setViewModeState(mode);
  localStorage.setItem("items-view-mode", mode);
}
```

Replace the `<PageHeader>` block (lines 101-108) with:

```tsx
<PageHeader title="アイテム" showBack={false} variant="dark">
  <ViewModeToggle mode={viewMode} onChange={setViewMode} />
  <Link href={filter === "all" || filter === "active" ? "/items/new" : `/items/new?status=${filter}`}>
    <button className="flex items-center gap-1 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-[#006728]">
      <Plus className="h-4 w-4" />
      追加
    </button>
  </Link>
</PageHeader>
```

- [ ] **Step 2: Add gallery view rendering**

Replace the list rendering section (the `<div className="flex flex-col">` block inside the accessories map, lines 142-181) with a conditional:

```tsx
{viewMode === "gallery" ? (
  <div className="grid grid-cols-2 gap-3 py-2.5">
    {accessories.map((item) => (
      <Link key={item.id} href={nativeHref(`/items/${item.id}`)}>
        <div className="flex flex-col gap-1">
          <div className="h-[132px] w-full overflow-hidden rounded-md bg-[#f0f0f0] flex items-center justify-center">
            {item.image_url ? (
              <img src={item.image_url} alt={item.model ?? ""} className="size-full object-cover" />
            ) : (
              <img src={categoryIcons[item.category]} alt="" className="size-full object-cover" />
            )}
          </div>
          <div className="flex flex-col gap-px">
            <span className="text-xs font-medium text-[#8b8b8b]">
              {categoryLabels[item.category]}
            </span>
            <span className="text-sm font-bold text-black truncate">
              {[item.brand, item.model].filter(Boolean).join(" ") || "—"}
            </span>
            <StarRating rating={item.rating} />
          </div>
          {item.status === "past" && (
            <span className="self-start rounded-full bg-[#c7e2ca] px-2 py-0.5 text-xs font-bold text-black">
              アーカイブ
            </span>
          )}
        </div>
      </Link>
    ))}
  </div>
) : (
  <div className="flex flex-col">
    {accessories.map((item, i) => (
      <Link key={item.id} href={nativeHref(`/items/${item.id}`)}>
        <div
          className={`flex items-center gap-2.5 py-2 ${
            i < accessories.length - 1 ? "border-b border-[#dfdfdf]" : ""
          }`}
        >
          <div className="size-[50px] shrink-0 overflow-hidden rounded bg-[#f0f0f0] flex items-center justify-center">
            {item.image_url ? (
              <img src={item.image_url} alt={item.model ?? ""} className="size-full object-cover" />
            ) : (
              <img src={categoryIcons[item.category]} alt="" className="size-full object-cover" />
            )}
          </div>
          <div className="flex flex-1 flex-col gap-px min-w-0">
            <span className="text-sm font-medium text-[#8b8b8b]">
              {categoryLabels[item.category]}
            </span>
            <span className="text-base font-bold text-black truncate">
              {[item.brand, item.model].filter(Boolean).join(" ") || "—"}
            </span>
            <StarRating rating={item.rating} />
          </div>
          {item.status === "past" && (
            <span className="shrink-0 rounded-full bg-[#c7e2ca] px-2.5 py-1 text-xs font-bold text-black">
              アーカイブ
            </span>
          )}
          <Image
            src="/icons/chevron-right.svg"
            alt=""
            width={6}
            height={10}
            className="shrink-0 opacity-60"
          />
        </div>
      </Link>
    ))}
  </div>
)}
```

- [ ] **Step 3: Manual verification**

Open `http://localhost:3000/items` in browser. Verify:
- Toggle appears in header between title and 追加 button
- Clicking grid icon switches to 2-column gallery
- Clicking list icon switches back to list
- Refreshing page preserves the selected view mode
- Both views show correct data (category, name, stars, archive badge)

- [ ] **Step 4: Commit**

```bash
git add src/app/items/page.tsx
git commit -m "feat: add gallery/list view toggle to items page"
```

---

### Task 3: マイバッグページにギャラリービュー追加

**Files:**
- Modify: `src/app/bag/page.tsx`

- [ ] **Step 1: Add view mode state and toggle import**

Add import at top of `src/app/bag/page.tsx`:

```tsx
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
import { LayoutGrid } from "lucide-react";
```

(Note: `LayoutGrid` is not needed separately — it's only used inside `ViewModeToggle`. Just add the `ViewModeToggle` import.)

Inside `BagPage()`, add view mode state after the `chartTab` state (around line 171):

```tsx
const [viewMode, setViewModeState] = useState<"list" | "gallery">(() => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("bag-view-mode");
    if (saved === "gallery") return "gallery";
  }
  return "list";
});
function setViewMode(mode: "list" | "gallery") {
  setViewModeState(mode);
  localStorage.setItem("bag-view-mode", mode);
}
```

- [ ] **Step 2: Add toggle to header and handle reorder interaction**

Replace the `<PageHeader>` block (lines 222-252) with:

```tsx
<PageHeader
  title="マイバッグ"
  showBack={false}
  variant="dark"
>
  <div className="flex items-center gap-2 ml-auto">
    {!isReordering && (
      <ViewModeToggle mode={viewMode} onChange={setViewMode} />
    )}
    {isBagView && !isReordering && clubs.length > 1 && (
      <button
        onClick={() => {
          startReorder();
        }}
        className="flex items-center gap-1 rounded-full border border-white px-3 h-[34px] text-sm font-bold text-white"
      >
        <GripVertical className="h-4 w-4" />
        並替
      </button>
    )}
    {!isReordering && (() => {
      const isFull = isBagView && (bagCount ?? 0) >= MAX_BAG_CLUBS;
      const btn = (
        <button
          className={`flex items-center gap-1 rounded-full px-4 h-[34px] text-sm font-bold ${isFull ? "bg-white/50 text-[#006728]/40" : "bg-white text-[#006728]"}`}
          disabled={isFull}
        >
          <Plus className="h-4 w-4" />
          追加
        </button>
      );
      if (isFull) return btn;
      return <Link href={statusFilter === "all" || statusFilter === "bag1" ? "/bag/new" : `/bag/new?tab=${statusFilter}`}>{btn}</Link>;
    })()}
  </div>
</PageHeader>
```

- [ ] **Step 3: Compute effective view mode for reorder**

Add a computed value after the view mode state (this replaces the need to track a "previous view" — reordering simply forces list display):

```tsx
const effectiveViewMode = isReordering ? "list" : viewMode;
```

- [ ] **Step 4: Add gallery view rendering for clubs**

Replace the non-reordering club list section. Find this block (lines 373-382):

```tsx
<div className="flex flex-col">
  {displayClubs.map((club, index) => (
    <div
      key={club.id}
      className={index < displayClubs.length - 1 ? "border-b border-[#dfdfdf]" : ""}
    >
      <ClubRow club={club} showStatus={statusFilter === "all"} bagLabel={...} />
    </div>
  ))}
</div>
```

Replace it with:

```tsx
{effectiveViewMode === "gallery" ? (
  <div className="grid grid-cols-2 gap-3 py-2.5">
    {displayClubs.map((club) => {
      const primaryImage = club.club_images?.find((img) => img.is_primary) ?? club.club_images?.[0];
      return (
        <Link key={club.id} href={nativeHref(`/bag/${club.id}`)}>
          <div className="flex flex-col gap-1">
            <div className="h-[132px] w-full overflow-hidden rounded-md bg-[#f0f0f0] flex items-center justify-center">
              {primaryImage ? (
                <img src={primaryImage.image_url} alt={club.club_number} className="size-full object-cover" />
              ) : (
                <img src={clubNoImage[club.category] ?? "/no-images/etc.png"} alt="" className="size-full object-cover" />
              )}
            </div>
            <div className="flex flex-col gap-px pt-1">
              <div className="flex items-center gap-1.5">
                <span className="shrink-0 bg-[#005c24] text-white text-[10px] font-bold rounded-md px-1.5 py-0.5 text-center">
                  {club.club_number}
                </span>
                <span className="text-sm font-bold text-black truncate">{club.model ?? "—"}</span>
              </div>
              <span className="text-xs text-[#8b8b8b] truncate">{club.maker ?? "—"}</span>
            </div>
          </div>
        </Link>
      );
    })}
  </div>
) : (
  <div className="flex flex-col">
    {displayClubs.map((club, index) => (
      <div
        key={club.id}
        className={index < displayClubs.length - 1 ? "border-b border-[#dfdfdf]" : ""}
      >
        <ClubRow club={club} showStatus={statusFilter === "all"} bagLabel={statusFilter === "all" ? (club.status === "bag" ? (club.bag_number === 2 ? "予備バッグ" : "マイバッグ") : statusLabels[club.status]) : undefined} />
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 5: Manual verification**

Open `http://localhost:3000/bag` in browser. Verify:
- Toggle appears in header (hidden during reorder mode)
- Gallery shows 2-column grid with club images, number badges, model/maker
- List view is unchanged
- View mode persists across page refresh
- Charts and WITB button display regardless of view mode
- Clicking 並替 from gallery mode switches to list → reorder works → Cancel/Save returns to gallery
- Club count "X / 14本" shows in both views

- [ ] **Step 6: Commit**

```bash
git add src/app/bag/page.tsx
git commit -m "feat: add gallery/list view toggle to bag page"
```
