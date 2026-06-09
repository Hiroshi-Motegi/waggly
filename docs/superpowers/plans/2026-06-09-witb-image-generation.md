# セッティング画像生成（Phase 1b）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** マイバッグのクラブセッティングをWITB画像として生成し、SNSやLINEでシェアできるようにする。

**Architecture:** `@vercel/og`（Satori + Resvg）を使ってサーバーサイドでOG画像を生成。バッグページに「シェア画像を作成」ボタンを追加し、APIエンドポイントがPNG画像を返す。ユーザーはダウンロードまたはLINE等でシェア可能。

**Tech Stack:** Next.js 16, @vercel/og (ImageResponse), Tailwind-like inline styles (Satori制約), Supabase

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/app/api/bag/witb-image/route.tsx` | WITB画像生成APIエンドポイント |
| Create | `src/components/bag/share-witb-button.tsx` | シェアボタンUI（ダウンロード + シェア） |
| Modify | `src/app/bag/page.tsx` | シェアボタンをバッグページに追加 |

---

### Task 1: @vercel/og のインストール

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install @vercel/og**

```bash
npm install @vercel/og
```

- [ ] **Step 2: Verify installation**

Run: `npm ls @vercel/og`
Expected: `@vercel/og@x.x.x` が表示される

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @vercel/og for WITB image generation"
```

---

### Task 2: WITB画像生成APIエンドポイント

**Files:**
- Create: `src/app/api/bag/witb-image/route.tsx`

- [ ] **Step 1: Create the API route**

```tsx
// src/app/api/bag/witb-image/route.tsx
import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

export const runtime = "edge";

// カテゴリの日本語ラベル
const categoryLabels: Record<string, string> = {
  driver: "ドライバー",
  fairway_wood: "FW",
  utility: "UT",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};

// カテゴリ順
const categoryOrder = ["driver", "fairway_wood", "utility", "iron", "wedge", "putter"];

export async function GET(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const bagNumber = Number(request.nextUrl.searchParams.get("bag") ?? "1");

  // バッグ内のクラブを取得
  const { data: clubs } = await supabase
    .from("clubs")
    .select("club_number, maker, model, category, distance, shaft_name, shaft_flex")
    .eq("user_id", userId)
    .eq("status", "bag")
    .eq("bag_number", bagNumber)
    .order("sort_order", { ascending: true });

  if (!clubs || clubs.length === 0) {
    return new Response("No clubs found", { status: 404 });
  }

  // ユーザー名を取得
  const { data: user } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", userId)
    .single();

  const displayName = user?.display_name ?? "Golfer";

  // カテゴリでグループ化
  const grouped = categoryOrder
    .map((cat) => ({
      category: cat,
      label: categoryLabels[cat] ?? cat,
      clubs: clubs.filter((c: any) => c.category === cat),
    }))
    .filter((g) => g.clubs.length > 0);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#006728",
          fontFamily: "sans-serif",
          padding: "40px",
          color: "white",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "36px", fontWeight: "bold" }}>{displayName}&apos;s Bag</span>
            <span style={{ fontSize: "18px", opacity: 0.8 }}>{clubs.length} clubs</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "24px", fontWeight: "bold", opacity: 0.9 }}>Waggly</span>
          </div>
        </div>

        {/* Club Grid */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", flex: 1 }}>
          {grouped.map((group) => (
            <div
              key={group.category}
              style={{
                display: "flex",
                flexDirection: "column",
                backgroundColor: "rgba(255,255,255,0.12)",
                borderRadius: "12px",
                padding: "12px 16px",
                minWidth: "170px",
              }}
            >
              <span style={{ fontSize: "12px", opacity: 0.7, marginBottom: "8px", textTransform: "uppercase" }}>
                {group.label}
              </span>
              {group.clubs.map((club: any, i: number) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                    <span style={{ fontSize: "20px", fontWeight: "bold" }}>{club.club_number}</span>
                    {club.distance && (
                      <span style={{ fontSize: "14px", opacity: 0.7 }}>{club.distance}yd</span>
                    )}
                  </div>
                  <span style={{ fontSize: "14px", opacity: 0.9 }}>
                    {[club.maker, club.model].filter(Boolean).join(" ") || "—"}
                  </span>
                  {club.shaft_name && (
                    <span style={{ fontSize: "11px", opacity: 0.6 }}>
                      {[club.shaft_name, club.shaft_flex].filter(Boolean).join(" ")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
          <span style={{ fontSize: "14px", opacity: 0.5 }}>waggly.app</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`
Access: `/api/bag/witb-image?bag=1`
Expected: PNG画像がブラウザに表示される（グリーン背景にクラブ一覧）

- [ ] **Step 3: Commit**

```bash
git add src/app/api/bag/witb-image/route.tsx
git commit -m "feat: add WITB image generation API endpoint"
```

---

### Task 3: シェアボタンコンポーネント

**Files:**
- Create: `src/components/bag/share-witb-button.tsx`

- [ ] **Step 1: Create share button component**

```tsx
// src/components/bag/share-witb-button.tsx
"use client";

import { useState } from "react";
import { Share2, Download, X } from "lucide-react";

interface Props {
  bagNumber: number;
}

export function ShareWitbButton({ bagNumber }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function generateImage() {
    setIsLoading(true);
    setIsOpen(true);
    try {
      const res = await fetch(`/api/bag/witb-image?bag=${bagNumber}`);
      if (!res.ok) throw new Error("Failed to generate image");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  function handleDownload() {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `waggly-witb-bag${bagNumber}.png`;
    a.click();
  }

  async function handleShare() {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const file = new File([blob], `waggly-witb-bag${bagNumber}.png`, { type: "image/png" });
      if (navigator.share) {
        await navigator.share({ files: [file], title: "My Golf Bag - Waggly" });
      } else {
        handleDownload();
      }
    } catch (e) {
      handleDownload();
    }
  }

  function handleClose() {
    setIsOpen(false);
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
      setImageUrl(null);
    }
  }

  return (
    <>
      <button
        onClick={generateImage}
        className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white"
      >
        <Share2 className="h-3.5 w-3.5" />
        WITB画像
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={handleClose}>
          <div className="relative w-full max-w-lg rounded-xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <button onClick={handleClose} className="absolute right-3 top-3 text-[#8b8b8b]">
              <X className="h-5 w-5" />
            </button>
            <p className="mb-3 text-sm font-bold">セッティング画像</p>
            {isLoading ? (
              <div className="flex h-48 items-center justify-center">
                <p className="text-sm text-[#8b8b8b]">画像を生成中...</p>
              </div>
            ) : imageUrl ? (
              <>
                <img src={imageUrl} alt="WITB" className="w-full rounded-lg" />
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex flex-1 items-center justify-center gap-1 rounded-full bg-[#006728] py-2.5 text-sm font-bold text-white"
                  >
                    <Download className="h-4 w-4" />
                    ダウンロード
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex flex-1 items-center justify-center gap-1 rounded-full border border-[#006728] py-2.5 text-sm font-bold text-[#006728]"
                  >
                    <Share2 className="h-4 w-4" />
                    シェア
                  </button>
                </div>
              </>
            ) : (
              <div className="flex h-48 items-center justify-center">
                <p className="text-sm text-[#e74c3c]">画像の生成に失敗しました</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/bag/share-witb-button.tsx
git commit -m "feat: add share WITB button with modal preview"
```

---

### Task 4: バッグページにシェアボタンを配置

**Files:**
- Modify: `src/app/bag/page.tsx`

- [ ] **Step 1: Import ShareWitbButton**

```typescript
import { ShareWitbButton } from "@/components/bag/share-witb-button";
```

- [ ] **Step 2: Add button to header area**

バッグページのヘッダー部分（「並替」「＋追加」ボタンの並び）に、バッグビュー時のみシェアボタンを追加。

ヘッダーのボタン群に追加:

```tsx
{isBagView && <ShareWitbButton bagNumber={statusFilter === "bag2" ? 2 : 1} />}
```

- [ ] **Step 3: Verify in browser**

- `/bag` にアクセス（マイバッグタブ）
- 「WITB画像」ボタンが表示される
- タップ → モーダルが開き画像生成 → プレビュー表示
- ダウンロードボタン → PNG保存
- シェアボタン → Web Share API（対応端末のみ）
- 「すべて」「予備」「アーカイブ」タブではボタン非表示

- [ ] **Step 4: Commit**

```bash
git add src/app/bag/page.tsx
git commit -m "feat: add WITB share button to bag page header"
```

---

### Task 5: 最終確認

- [ ] **Step 1: Run build**

Run: `npm run build`
Expected: ビルド成功

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 3: Manual verification**

1. `/bag` マイバッグタブ → 「WITB画像」ボタンが見える
2. ボタンタップ → モーダルにプレビュー画像
3. 画像にクラブ一覧がカテゴリ別に表示されている
4. ダウンロード → PNGファイルが保存される
5. 予備バッグタブ → 予備バッグ用の画像が生成される
