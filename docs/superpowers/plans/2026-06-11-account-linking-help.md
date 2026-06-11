# アカウント連携ヘルプページ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** アカウント連携の「なぜ必要か」を説明するヘルプページとヘルプINDEXページを作成し、設定画面から2つの導線で遷移できるようにする。

**Architecture:** Next.js App Router で `/help` (INDEX) と `/help/account-linking` (詳細) の2ページを追加。設定画面の `AccountLinking` セクション見出しに「?」アイコン、法的情報カードに「ヘルプ」行を追加。ページレイアウトは既存の `/terms`, `/privacy` ページと同じパターン（緑背景 + 白カード）を踏襲。

**Tech Stack:** Next.js App Router, React, Tailwind CSS, lucide-react, PageHeader コンポーネント

**Spec:** `docs/superpowers/specs/2026-06-11-account-linking-help-design.md`

---

### Task 1: アカウント連携ヘルプページ

**Files:**
- Create: `src/app/help/account-linking/page.tsx`

**Reference:** 既存ページのレイアウトパターンは `src/app/terms/page.tsx` を参照。`PageHeader` は `src/components/layout/page-header.tsx`。

- [ ] **Step 1: ページファイルを作成**

```tsx
// src/app/help/account-linking/page.tsx
"use client";

import { PageHeader } from "@/components/layout/page-header";

export default function AccountLinkingHelpPage() {
  return (
    <div
      className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]"
      style={{
        minHeight: "100dvh",
        paddingBottom: "var(--bottom-nav-height)",
        marginBottom: "calc(-1 * var(--bottom-nav-height))",
      }}
    >
      <img
        src="/images/home-bg.jpg"
        alt=""
        className="fixed inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
      />
      <div className="relative z-10 flex flex-col space-y-2">
        <PageHeader title="アカウント連携について" variant="dark" />

        {/* 概要 */}
        <div className="rounded-lg bg-white p-4">
          <p className="text-base leading-relaxed">
            Wagglyはクラウド同期により、Webブラウザとスマホアプリで同じデータを使えます。
            <br />
            アプリで同期するには、各プラットフォームに対応したアカウントの連携が必要です。
          </p>
        </div>

        {/* 対応表 */}
        <div className="rounded-lg bg-white p-4">
          <h3 className="text-base font-bold mb-3">プラットフォーム別の対応</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#ececec]">
                <th className="text-left font-normal text-[#8b8b8b] pb-2">
                  プラットフォーム
                </th>
                <th className="text-left font-normal text-[#8b8b8b] pb-2">
                  同期に必要なアカウント
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#ececec]">
                <td className="py-2.5 font-bold">🌐 Webブラウザ</td>
                <td className="py-2.5">
                  <span className="rounded-full bg-[#e8f5e9] px-2 py-0.5 text-xs font-bold text-[#2e7d32]">
                    どれでもOK
                  </span>
                </td>
              </tr>
              <tr className="border-b border-[#ececec]">
                <td className="py-2.5 font-bold">🤖 Androidアプリ</td>
                <td className="py-2.5">
                  <span className="rounded-full bg-[#fff3e0] px-2 py-0.5 text-xs font-bold text-[#e65100]">
                    Google必須
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold">🍎 iOSアプリ</td>
                <td className="py-2.5">
                  <span className="rounded-full bg-[#f5f5f5] px-2 py-0.5 text-xs text-[#8b8b8b]">
                    準備中
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* こんなときは */}
        <div className="rounded-lg bg-white p-4">
          <h3 className="text-base font-bold mb-3">こんなときは</h3>
          <div className="space-y-3">
            <div className="border-b border-[#ececec] pb-3">
              <div className="flex items-center gap-1.5 flex-wrap text-sm">
                <span className="font-bold">LINEで利用中</span>
                <span className="text-[#006728] font-bold">→</span>
                <span className="font-bold">Androidアプリで同期したい</span>
              </div>
              <span className="mt-1.5 inline-block rounded-md bg-[#e8f5e9] px-2 py-1 text-xs font-bold text-[#006728]">
                設定からGoogle連携を追加
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap text-sm">
                <span className="font-bold">Googleで利用中</span>
                <span className="text-[#006728] font-bold">→</span>
                <span className="font-bold">Web版でLINEログインしたい</span>
              </div>
              <span className="mt-1.5 inline-block rounded-md bg-[#e8f5e9] px-2 py-1 text-xs font-bold text-[#006728]">
                設定からLINE連携を追加
              </span>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="rounded-lg bg-white p-4">
          <h3 className="text-base font-bold mb-3">よくある質問</h3>
          <div className="space-y-0">
            {[
              {
                q: "連携するとデータはどうなる？",
                a: "今のデータはそのまま残ります。アカウントに別のログイン方法を追加するだけです。",
              },
              {
                q: "連携先にすでにアカウントがある場合は？",
                a: "どちらのデータを残すか選べる画面が表示されます。選ばなかった方のデータは削除されます。",
              },
              {
                q: "連携を解除したらどうなる？",
                a: "そのログイン方法が使えなくなるだけで、データは残ります。ただし最低1つのログイン方法は必要です。",
              },
            ].map((item, i, arr) => (
              <div
                key={i}
                className={`py-3 ${i < arr.length - 1 ? "border-b border-[#ececec]" : ""}`}
              >
                <p className="text-sm font-bold mb-1">
                  <span className="text-[#006728]">Q.</span> {item.q}
                </p>
                <p className="text-sm text-[#666] leading-relaxed">
                  <span className="text-[#006728] font-bold">A.</span> {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-white/70 py-4">
          ご不明な点があればお問い合わせください。
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: ブラウザで確認**

Run: ブラウザで `/help/account-linking` にアクセス（要ログイン状態）。緑背景に白カードが4つ（概要、対応表、こんなときは、FAQ）表示されることを確認。

- [ ] **Step 3: コミット**

```bash
git add src/app/help/account-linking/page.tsx
git commit -m "feat: add account linking help page"
```

---

### Task 2: ヘルプINDEXページ

**Files:**
- Create: `src/app/help/page.tsx`

**Reference:** 法的情報ページ（`src/app/terms/page.tsx`）と同じレイアウトパターン。設定画面のリンクリスト（`src/app/settings/page.tsx:212-226`）と同じカード内リストスタイル。

- [ ] **Step 1: ページファイルを作成**

```tsx
// src/app/help/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";

export default function HelpIndexPage() {
  const items = [
    { href: "/help/account-linking", label: "アカウント連携について" },
  ];

  return (
    <div
      className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]"
      style={{
        minHeight: "100dvh",
        paddingBottom: "var(--bottom-nav-height)",
        marginBottom: "calc(-1 * var(--bottom-nav-height))",
      }}
    >
      <img
        src="/images/home-bg.jpg"
        alt=""
        className="fixed inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
      />
      <div className="relative z-10 flex flex-col space-y-2">
        <PageHeader title="ヘルプ" variant="dark" />

        <div className="rounded-lg bg-white p-3">
          <div className="flex flex-col">
            {items.map((item, i) => (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-2.5 py-2.5 ${
                    i < items.length - 1 ? "border-b border-[#dfdfdf]" : ""
                  }`}
                >
                  <span className="flex-1 text-base font-bold">
                    {item.label}
                  </span>
                  <Image
                    src="/icons/chevron-right.svg"
                    alt=""
                    width={6}
                    height={10}
                    className="opacity-60"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: ブラウザで確認**

Run: ブラウザで `/help` にアクセス。「ヘルプ」ヘッダーの下に「アカウント連携について ›」リンクが1行表示されること。タップで `/help/account-linking` に遷移すること。

- [ ] **Step 3: コミット**

```bash
git add src/app/help/page.tsx
git commit -m "feat: add help index page"
```

---

### Task 3: ミドルウェアに `/help` を公開パスとして追加

**Files:**
- Modify: `src/lib/supabase/middleware.ts:36-42`

**Why:** 現在 `/help` は認証が必要なパスとして扱われる。設定画面経由のみの利用だが、Android WebView での表示を考慮し公開パスにしておく方が安全。

- [ ] **Step 1: middleware の isPublic に `/help` パスを追加**

`src/lib/supabase/middleware.ts` の `isPublic` 条件に `pathname.startsWith("/help")` を追加:

```typescript
// 変更前
    const isPublic =
      pathname === "/" ||
      pathname === "/login" ||
      pathname.startsWith("/auth/") ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/p/") ||
      pathname === "/terms" ||
      pathname === "/privacy";

// 変更後
    const isPublic =
      pathname === "/" ||
      pathname === "/login" ||
      pathname.startsWith("/auth/") ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/p/") ||
      pathname.startsWith("/help") ||
      pathname === "/terms" ||
      pathname === "/privacy";
```

- [ ] **Step 2: 未ログイン状態で確認**

Run: シークレットウィンドウで `/help/account-linking` にアクセスし、リダイレクトされずページが表示されることを確認。

- [ ] **Step 3: コミット**

```bash
git add src/lib/supabase/middleware.ts
git commit -m "feat: add /help to public paths in middleware"
```

---

### Task 4: 設定画面に「?」アイコンと「ヘルプ」行を追加

**Files:**
- Modify: `src/app/settings/page.tsx:8` (import追加)
- Modify: `src/app/settings/page.tsx:153-155` (セクション見出し + ?アイコン)
- Modify: `src/app/settings/page.tsx:212-226` (法的情報カードにヘルプ行追加)

- [ ] **Step 1: lucide-react の import に `HelpCircle` を追加**

`src/app/settings/page.tsx` の import 行を変更:

```typescript
// 変更前
import { Download, Loader2 } from "lucide-react";

// 変更後
import { Download, HelpCircle, Loader2 } from "lucide-react";
```

- [ ] **Step 2: アカウント連携セクション見出しに「?」アイコンを追加**

`src/app/settings/page.tsx` のアカウント連携セクション見出し部分を変更:

```tsx
// 変更前
      {/* アカウント連携 */}
      <p className="text-base font-bold text-white px-1 pt-4">アカウント連携</p>
      <AccountLinking user={user} onUpdate={() => window.location.reload()} />

// 変更後
      {/* アカウント連携 */}
      <div className="flex items-center justify-between px-1 pt-4">
        <p className="text-base font-bold text-white">アカウント連携</p>
        <Link href="/help/account-linking">
          <HelpCircle className="h-5 w-5 text-white opacity-80" />
        </Link>
      </div>
      <AccountLinking user={user} onUpdate={() => window.location.reload()} />
```

- [ ] **Step 3: 法的情報カードに「ヘルプ」行を追加**

`src/app/settings/page.tsx` の法的情報カード配列にヘルプを追加:

```tsx
// 変更前
          {[
            { href: "/terms", label: "利用規約" },
            { href: "/privacy", label: "プライバシーポリシー" },
          ].map((item, i, arr) => (

// 変更後
          {[
            { href: "/terms", label: "利用規約" },
            { href: "/privacy", label: "プライバシーポリシー" },
            { href: "/help", label: "ヘルプ" },
          ].map((item, i, arr) => (
```

- [ ] **Step 4: ブラウザで確認**

Run: ブラウザで `/settings` にアクセス。以下を確認:
1. 「アカウント連携」見出しの右に白い「?」丸アイコンが表示される
2. 「?」タップで `/help/account-linking` に遷移する
3. カード下部に「利用規約」「プライバシーポリシー」「ヘルプ」の3行が表示される
4. 「ヘルプ」タップで `/help` に遷移する

- [ ] **Step 5: コミット**

```bash
git add src/app/settings/page.tsx
git commit -m "feat: add help icon and help link to settings page"
```

---

### Task 5: 未ログイン設定画面にもヘルプ行を追加

**Files:**
- Modify: `src/app/settings/page.tsx:88-99` (未ログイン時の法的情報カード)

**Why:** Android ネイティブで未ログイン状態の設定画面にも法的情報カードがある。ここにもヘルプ行を追加して一貫性を保つ。

- [ ] **Step 1: 未ログイン時の法的情報カードにヘルプ行を追加**

`src/app/settings/page.tsx` の未ログイン時セクション内のリンクリストを変更:

```tsx
// 変更前
          <div className="rounded-lg bg-white p-3">
            <div className="flex flex-col gap-2">
              <Link href="/terms" className="flex items-center justify-between py-2 border-b border-[#dfdfdf]">
                <span className="text-base">利用規約</span>
                <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-40" />
              </Link>
              <Link href="/privacy" className="flex items-center justify-between py-2">
                <span className="text-base">プライバシーポリシー</span>
                <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-40" />
              </Link>
            </div>
          </div>

// 変更後
          <div className="rounded-lg bg-white p-3">
            <div className="flex flex-col gap-2">
              <Link href="/terms" className="flex items-center justify-between py-2 border-b border-[#dfdfdf]">
                <span className="text-base">利用規約</span>
                <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-40" />
              </Link>
              <Link href="/privacy" className="flex items-center justify-between py-2 border-b border-[#dfdfdf]">
                <span className="text-base">プライバシーポリシー</span>
                <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-40" />
              </Link>
              <Link href="/help" className="flex items-center justify-between py-2">
                <span className="text-base">ヘルプ</span>
                <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-40" />
              </Link>
            </div>
          </div>
```

- [ ] **Step 2: ブラウザで確認**

Run: 未ログイン状態（またはネイティブモード）で `/settings` にアクセス。法的情報カードに「ヘルプ」行が追加され、タップで `/help` に遷移することを確認。

- [ ] **Step 3: コミット**

```bash
git add src/app/settings/page.tsx
git commit -m "feat: add help link to unauthenticated settings page"
```
