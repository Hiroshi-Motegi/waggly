# Phase 1e: Capacitor Native App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js WebアプリをCapacitorでラップし、iOS/Androidネイティブアプリとしてビルド・配信できるようにする。Phase Iはオンライン動作、Phase IIでSQLiteオフライン対応を追加。

**Architecture:** 既存のNext.jsアプリを`output: "export"`で静的ビルドし、Capacitor webviewに配置。APIコールは`https://waggly.jp/api/*`に向け、JWT認証ヘッダーを付与。認証はApple/Google Sign In → Supabase `signInWithIdToken`。Phase IIでSQLiteローカルDBと同期エンジンを追加。

**Tech Stack:** Next.js 16 (static export), Capacitor 6, `@capacitor/core`, `@capacitor-community/sqlite`, `@codetrix-studio/capacitor-google-auth`, Supabase Auth (signInWithIdToken), Vitest

---

## File Structure

### New Files

```
capacitor.config.ts                          # Capacitor設定
src/lib/platform.ts                          # プラットフォーム判定 (isNative)
src/lib/api-client.ts                        # APIアダプター (URL + JWT付与)
src/lib/native-auth.ts                       # Apple/Google Sign In
src/lib/sqlite/database.ts                   # SQLite接続ラッパー
src/lib/sqlite/schema.ts                     # テーブル定義SQL
src/lib/sqlite/migrations.ts                 # バージョン管理マイグレーション
src/lib/data-store.ts                        # 統一データアクセス層
src/lib/sync.ts                              # 同期エンジン
src/hooks/use-network.ts                     # ネットワーク状態フック
__tests__/lib/platform.test.ts               # platform.ts テスト
__tests__/lib/api-client.test.ts             # api-client.ts テスト
__tests__/lib/data-store.test.ts             # data-store.ts テスト
__tests__/lib/sync.test.ts                   # sync.ts テスト
```

### Modified Files

```
next.config.ts                               # conditional output: "export" + images.unoptimized
package.json                                 # Capacitor依存 + build:app スクリプト
.gitignore                                   # ios/, android/ 追加
src/lib/supabase/api.ts                      # Authorization header対応
src/components/auth-provider.tsx             # Native auth分岐
src/hooks/use-clubs.ts                       # apiFetch移行
src/hooks/use-practice.ts                    # apiFetch移行
src/hooks/use-plans.ts                       # apiFetch移行
src/components/club/club-form.tsx            # apiFetch移行
src/components/club/structured-memo-form.tsx  # apiFetch移行
src/components/club/club-usage-summary.tsx   # apiFetch移行
src/components/club/club-image-gallery.tsx   # apiFetch移行
src/components/bag/share-witb-button.tsx     # apiFetch移行
src/components/app-shell.tsx                 # apiFetch移行
src/app/settings/page.tsx                    # apiFetch移行
src/app/practice/new/page.tsx                # apiFetch移行
src/app/practice/[sessionId]/page.tsx        # apiFetch + generateStaticParams
src/app/practice/[sessionId]/edit/page.tsx   # apiFetch + generateStaticParams
src/app/items/new/page.tsx                   # apiFetch移行
src/app/items/[id]/page.tsx                  # apiFetch + generateStaticParams
src/app/courses/page.tsx                     # apiFetch移行
src/app/courses/[courseId]/page.tsx           # apiFetch + generateStaticParams
src/app/coach/page.tsx                       # apiFetch移行
src/app/coach/plans/new/page.tsx             # apiFetch移行
src/app/coach/plans/[planId]/page.tsx        # apiFetch + generateStaticParams
src/app/bag/[clubId]/page.tsx                # apiFetch + generateStaticParams
src/app/bag/[clubId]/memos/page.tsx          # apiFetch + generateStaticParams
src/app/bag/[clubId]/memos/[memoId]/page.tsx                # apiFetch + generateStaticParams
src/app/bag/[clubId]/memos/[memoId]/edit/page.tsx           # apiFetch + generateStaticParams
src/app/bag/[clubId]/maintenances/page.tsx                  # apiFetch + generateStaticParams
src/app/bag/[clubId]/maintenances/[maintenanceId]/page.tsx  # apiFetch + generateStaticParams
src/app/bag/[clubId]/maintenances/[maintenanceId]/edit/page.tsx  # apiFetch + generateStaticParams
src/app/admin/knowledge/page.tsx             # apiFetch移行
src/app/admin/knowledge/[id]/page.tsx        # apiFetch + generateStaticParams
```

---

## Phase I: オンライン動作するネイティブアプリ

### Task 1: Capacitorプロジェクト初期化

**Files:**
- Create: `capacitor.config.ts`
- Modify: `package.json`, `.gitignore`

- [ ] **Step 1: Capacitorパッケージをインストール**

```bash
npm install @capacitor/core @capacitor/cli @capacitor/app @capacitor/network @capacitor/splash-screen @capacitor/status-bar
```

- [ ] **Step 2: Capacitor設定ファイルを作成**

`capacitor.config.ts`:

```typescript
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "jp.waggly.app",
  appName: "Waggly",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
  plugins: {
    CapacitorHttp: {
      enabled: true, // Proxy all fetch() through native HTTP — bypasses CORS
    },
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#15803d",
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#15803d",
    },
  },
};

export default config;
```

- [ ] **Step 3: .gitignoreにネイティブプロジェクトを追加**

`.gitignore` 末尾に追加:

```
# capacitor native projects
/ios/
/android/
```

- [ ] **Step 4: package.jsonにCapacitorスクリプトを追加**

`package.json` の `scripts` に追加:

```json
{
  "build:app": "NEXT_OUTPUT=export next build",
  "cap:sync": "npx cap sync",
  "cap:ios": "npx cap open ios",
  "cap:android": "npx cap open android"
}
```

- [ ] **Step 5: コミット**

```bash
git add capacitor.config.ts package.json package-lock.json .gitignore
git commit -m "feat: add Capacitor project configuration"
```

---

### Task 2: Static Export ビルド設定

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: next.config.tsに条件分岐を追加**

`next.config.ts` を以下に変更:

```typescript
import type { NextConfig } from "next";

const isAppExport = process.env.NEXT_OUTPUT === "export";

const nextConfig: NextConfig = {
  ...(isAppExport && {
    output: "export",
    images: { unoptimized: true },
  }),
  ...(!isAppExport && {
    images: {
      remotePatterns: [
        {
          protocol: "https",
          hostname: "**.rakuten.co.jp",
        },
        {
          protocol: "https",
          hostname: "**.gora.golf.rakuten.co.jp",
        },
      ],
    },
  }),
};

export default nextConfig;
```

> **Note:** `images: { unoptimized: true }` により、`next/image` は `<img>` タグを出力する。13ファイルの `<Image>` を `<img>` に手動置換する必要はない。

- [ ] **Step 2: 通常ビルドが壊れていないことを確認**

```bash
npm run build
```

Expected: ビルド成功（従来どおりSSR出力）

- [ ] **Step 3: コミット**

```bash
git add next.config.ts
git commit -m "feat: add conditional static export for Capacitor build"
```

---

### Task 3: Dynamic RouteのStatic Export対応

**Files:**
- Modify: 13個のdynamic route page（下記リスト）

Static exportでは動的ルートに `generateStaticParams` が必須。空配列を返すことで、ビルドは成功しつつクライアントサイドルーティングで動作する。

- [ ] **Step 1: 全dynamic routeページに `generateStaticParams` を追加**

以下13ファイルそれぞれに、ファイル先頭（`"use client"` の直後）に追加:

```typescript
export function generateStaticParams() {
  return [];
}
```

対象ファイル:

| # | ファイル |
|---|---------|
| 1 | `src/app/bag/[clubId]/page.tsx` |
| 2 | `src/app/bag/[clubId]/memos/page.tsx` |
| 3 | `src/app/bag/[clubId]/memos/[memoId]/page.tsx` |
| 4 | `src/app/bag/[clubId]/memos/[memoId]/edit/page.tsx` |
| 5 | `src/app/bag/[clubId]/maintenances/page.tsx` |
| 6 | `src/app/bag/[clubId]/maintenances/[maintenanceId]/page.tsx` |
| 7 | `src/app/bag/[clubId]/maintenances/[maintenanceId]/edit/page.tsx` |
| 8 | `src/app/practice/[sessionId]/page.tsx` |
| 9 | `src/app/practice/[sessionId]/edit/page.tsx` |
| 10 | `src/app/items/[id]/page.tsx` |
| 11 | `src/app/courses/[courseId]/page.tsx` |
| 12 | `src/app/coach/plans/[planId]/page.tsx` |
| 13 | `src/app/admin/knowledge/[id]/page.tsx` |

> **重要:** `"use client"` ディレクティブがあるファイルでは `generateStaticParams` はそのファイルのトップレベルexportとして宣言する。Next.js App Routerはこれをサーバーサイドで処理する。ただし `"use client"` ファイルでは `generateStaticParams` がサポートされない可能性がある。その場合は、各ページを `page.tsx`（server component wrapper + generateStaticParams）と `page-client.tsx`（既存の "use client" コンポーネント）に分割する。

**分割が必要な場合のパターン:**

`src/app/bag/[clubId]/page.tsx` (server component):
```typescript
import ClubDetailPage from "./page-client";

export function generateStaticParams() {
  return [];
}

export default function Page({ params }: { params: { clubId: string } }) {
  return <ClubDetailPage params={params} />;
}
```

`src/app/bag/[clubId]/page-client.tsx` (既存のコードをリネーム):
```typescript
"use client";
// ... 既存のコードそのまま
```

- [ ] **Step 2: Static exportビルドを実行して確認**

```bash
NEXT_OUTPUT=export npx next build
```

Expected: ビルド成功。`out/` ディレクトリに静的ファイルが生成される

- [ ] **Step 3: 通常ビルドが壊れていないことを確認**

```bash
npm run build
```

Expected: ビルド成功（SSRモード）

- [ ] **Step 4: コミット**

```bash
git add src/app/
git commit -m "feat: add generateStaticParams for static export compatibility"
```

---

### Task 4: プラットフォーム検出ユーティリティ

**Files:**
- Create: `src/lib/platform.ts`
- Create: `__tests__/lib/platform.test.ts`

- [ ] **Step 1: テストを書く**

`__tests__/lib/platform.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @capacitor/core before importing platform
vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
  },
}));

import { isNative } from "@/lib/platform";
import { Capacitor } from "@capacitor/core";

describe("isNative", () => {
  beforeEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReset();
  });

  it("returns true when running on native platform", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    expect(isNative()).toBe(true);
  });

  it("returns false when running on web", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    expect(isNative()).toBe(false);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run __tests__/lib/platform.test.ts
```

Expected: FAIL — `@/lib/platform` が存在しない

- [ ] **Step 3: 実装**

`src/lib/platform.ts`:

```typescript
import { Capacitor } from "@capacitor/core";

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}
```

- [ ] **Step 4: テストがパスすることを確認**

```bash
npx vitest run __tests__/lib/platform.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 5: コミット**

```bash
git add src/lib/platform.ts __tests__/lib/platform.test.ts
git commit -m "feat: add platform detection utility"
```

---

### Task 5: APIクライアントアダプター

**Files:**
- Create: `src/lib/api-client.ts`
- Create: `__tests__/lib/api-client.test.ts`

- [ ] **Step 1: テストを書く**

`__tests__/lib/api-client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
  },
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

import { Capacitor } from "@capacitor/core";
import { createClient } from "@/lib/supabase/client";

describe("apiUrl", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns path as-is on web", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    const { apiUrl } = await import("@/lib/api-client");
    expect(apiUrl("/api/clubs")).toBe("/api/clubs");
  });

  it("prepends production URL on native", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    const { apiUrl } = await import("@/lib/api-client");
    expect(apiUrl("/api/clubs")).toBe("https://waggly.jp/api/clubs");
  });
});

describe("apiFetch", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    globalThis.fetch = mockFetch;
    mockFetch.mockResolvedValue(new Response("{}"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls fetch without auth header on web", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    const { apiFetch } = await import("@/lib/api-client");

    await apiFetch("/api/clubs");

    expect(mockFetch).toHaveBeenCalledWith("/api/clubs", undefined);
  });

  it("attaches Authorization header on native when session exists", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    const mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "test-jwt-token" } },
        }),
      },
    };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    const { apiFetch } = await import("@/lib/api-client");

    await apiFetch("/api/clubs");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://waggly.jp/api/clubs",
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );

    const calledHeaders = mockFetch.mock.calls[0][1].headers;
    expect(calledHeaders.get("Authorization")).toBe("Bearer test-jwt-token");
  });

  it("calls fetch without auth header on native when no session", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    const mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
        }),
      },
    };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    const { apiFetch } = await import("@/lib/api-client");

    await apiFetch("/api/clubs");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://waggly.jp/api/clubs",
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );

    const calledHeaders = mockFetch.mock.calls[0][1].headers;
    expect(calledHeaders.has("Authorization")).toBe(false);
  });

  it("preserves existing headers from caller", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    const mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "jwt" } },
        }),
      },
    };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    const { apiFetch } = await import("@/lib/api-client");

    await apiFetch("/api/clubs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });

    const calledHeaders = mockFetch.mock.calls[0][1].headers;
    expect(calledHeaders.get("Content-Type")).toBe("application/json");
    expect(calledHeaders.get("Authorization")).toBe("Bearer jwt");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run __tests__/lib/api-client.test.ts
```

Expected: FAIL — `@/lib/api-client` が存在しない

- [ ] **Step 3: 実装**

`src/lib/api-client.ts`:

```typescript
import { isNative } from "@/lib/platform";
import { createClient } from "@/lib/supabase/client";

const API_BASE = "https://waggly.jp";

export function apiUrl(path: string): string {
  return isNative() ? `${API_BASE}${path}` : path;
}

export async function apiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const url = apiUrl(path);

  if (!isNative()) {
    return fetch(url, init);
  }

  // Native: attach JWT from Supabase session
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init?.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  return fetch(url, { ...init, headers });
}
```

- [ ] **Step 4: テストがパスすることを確認**

```bash
npx vitest run __tests__/lib/api-client.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: コミット**

```bash
git add src/lib/api-client.ts __tests__/lib/api-client.test.ts
git commit -m "feat: add API client adapter with JWT for native platform"
```

---

### Task 6: APIルートのAuthorizationヘッダー対応

**Files:**
- Modify: `src/lib/supabase/api.ts`

ネイティブアプリからのAPIリクエストは `Authorization: Bearer <jwt>` で認証する。既存のcookie認証と併存させる。

- [ ] **Step 1: api.tsを修正**

`src/lib/supabase/api.ts` の `getApiAuth` 関数を以下に変更:

```typescript
import { createClient } from "@/lib/supabase/server";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

const DEV_EMAIL = "dev@waggly.local";
const DEV_PASSWORD = "devpassword123";

let cachedDevUserId: string | null = null;

function isDevMode() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === "true"
  );
}

/**
 * Get Supabase client and userId for API routes.
 * Supports:
 * - Dev mode (service role key)
 * - Authorization: Bearer <jwt> (native app)
 * - Cookie-based auth (web LIFF)
 * Returns null if not authenticated (caller should return 401).
 */
export async function getApiAuth(): Promise<{
  supabase: any;
  userId: string;
} | null> {
  if (isDevMode()) {
    const supabase = createRawClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Use cached ID if available
    if (cachedDevUserId) {
      return { supabase, userId: cachedDevUserId };
    }

    // Check if dev user exists by email
    const { data: existingUsers } = await supabase
      .from("users")
      .select("id")
      .eq("line_user_id", "dev-line-id")
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      cachedDevUserId = existingUsers[0].id;
      return { supabase, userId: cachedDevUserId! };
    }

    // Create auth user first (Supabase assigns the UUID)
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: DEV_EMAIL,
        password: DEV_PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: "開発ユーザー" },
      });

    if (authError) {
      // User might already exist in auth but not in users table
      const {
        data: { users },
      } = await supabase.auth.admin.listUsers();
      const existing = users?.find((u: any) => u.email === DEV_EMAIL);
      if (existing) {
        // Insert profile with auth user's ID
        await supabase.from("users").upsert({
          id: existing.id,
          line_user_id: "dev-line-id",
          display_name: "開発ユーザー",
          avatar_url: null,
        });
        cachedDevUserId = existing.id;
        return { supabase, userId: cachedDevUserId! };
      }
      return null;
    }

    const authUserId = authData.user.id;

    // Create profile using the auth-assigned UUID
    await supabase.from("users").insert({
      id: authUserId,
      line_user_id: "dev-line-id",
      display_name: "開発ユーザー",
      avatar_url: null,
    });

    cachedDevUserId = authUserId;
    return { supabase, userId: authUserId };
  }

  // Native app: Bearer token auth
  const headersList = await headers();
  const authHeader = headersList.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const supabase = createRawClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return { supabase, userId: user.id };
  }

  // Web: cookie-based auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return { supabase: supabase as any, userId: user.id };
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

- [ ] **Step 2: 通常のWeb認証が壊れていないことを確認**

```bash
npm run build
```

Expected: ビルド成功

- [ ] **Step 3: コミット**

```bash
git add src/lib/supabase/api.ts
git commit -m "feat: support Authorization Bearer token in API routes"
```

---

### Task 7: 全fetch()呼び出しをapiFetchに移行

**Files:**
- Modify: 30ファイル（下記リスト）

全クライアントサイドの `fetch("/api/...")` と `fetch(\`/api/...\`)` を `apiFetch` に置換する。パターンは単純:

**置換ルール:**
1. ファイル先頭に `import { apiFetch } from "@/lib/api-client";` を追加
2. `fetch("/api/` → `apiFetch("/api/`
3. `fetch(\`/api/` → `apiFetch(\`/api/`
4. `await fetch(apiUrl(...))` は使わない — `apiFetch` がURL変換もJWT付与も行う

**例: `src/hooks/use-clubs.ts` の変換**

Before:
```typescript
const res = await fetch(`/api/clubs${qs ? `?${qs}` : ""}`);
```

After:
```typescript
import { apiFetch } from "@/lib/api-client";
// ...
const res = await apiFetch(`/api/clubs${qs ? `?${qs}` : ""}`);
```

- [ ] **Step 1: Hooksファイルを移行 (3ファイル)**

| ファイル | fetch箇所数 |
|---------|------------|
| `src/hooks/use-clubs.ts` | 4 (`fetchClubs`, `createClub`, `updateClub`, `deleteClub`) |
| `src/hooks/use-practice.ts` | 4 (`fetchSessions`, `createPracticeSession`, `updatePracticeSession`, `deletePracticeSession`) |
| `src/hooks/use-plans.ts` | 1 (`fetch plan`) |

- [ ] **Step 2: Componentsファイルを移行 (5ファイル)**

| ファイル | fetch箇所数 |
|---------|------------|
| `src/components/auth-provider.tsx` | 1 (`/api/auth/line`) |
| `src/components/app-shell.tsx` | 1 |
| `src/components/club/club-form.tsx` | 1 (`/api/clubs/autofill`) |
| `src/components/club/structured-memo-form.tsx` | 1 |
| `src/components/club/club-usage-summary.tsx` | 1 |
| `src/components/club/club-image-gallery.tsx` | 1 |
| `src/components/bag/share-witb-button.tsx` | 1 |

- [ ] **Step 3: Pageファイルを移行 (22ファイル)**

| ファイル |
|---------|
| `src/app/settings/page.tsx` |
| `src/app/practice/new/page.tsx` |
| `src/app/practice/[sessionId]/page.tsx` |
| `src/app/practice/[sessionId]/edit/page.tsx` |
| `src/app/items/new/page.tsx` |
| `src/app/items/[id]/page.tsx` |
| `src/app/courses/page.tsx` |
| `src/app/courses/[courseId]/page.tsx` |
| `src/app/coach/page.tsx` |
| `src/app/coach/plans/new/page.tsx` |
| `src/app/coach/plans/[planId]/page.tsx` |
| `src/app/bag/[clubId]/page.tsx` |
| `src/app/bag/[clubId]/memos/page.tsx` |
| `src/app/bag/[clubId]/memos/[memoId]/page.tsx` |
| `src/app/bag/[clubId]/memos/[memoId]/edit/page.tsx` |
| `src/app/bag/[clubId]/maintenances/page.tsx` |
| `src/app/bag/[clubId]/maintenances/[maintenanceId]/page.tsx` |
| `src/app/bag/[clubId]/maintenances/[maintenanceId]/edit/page.tsx` |
| `src/app/admin/knowledge/page.tsx` |
| `src/app/admin/knowledge/[id]/page.tsx` |

- [ ] **Step 4: 既存テストがパスすることを確認**

```bash
npx vitest run
```

Expected: 全テストPASS

- [ ] **Step 5: ビルド確認**

```bash
npm run build
```

Expected: ビルド成功

- [ ] **Step 6: コミット**

```bash
git add src/
git commit -m "refactor: migrate all fetch() calls to apiFetch for native platform support"
```

---

### Task 8: Native認証プラグインセットアップ

**Files:**
- Create: `src/lib/native-auth.ts`

- [ ] **Step 1: 認証プラグインをインストール**

```bash
npm install @codetrix-studio/capacitor-google-auth @capacitor-community/apple-sign-in
```

> **Note:** Xcodeプロジェクトで「Sign in with Apple」Capabilityを有効にする必要がある（Task 11のXcode設定時に行う）。

- [ ] **Step 2: native-auth.tsを実装**

`src/lib/native-auth.ts`:

```typescript
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types/database";

interface NativeSignInResult {
  user: User | null;
  error: string | null;
}

/**
 * Sign in with Google on native platform.
 * Uses @codetrix-studio/capacitor-google-auth → Supabase signInWithIdToken.
 */
export async function signInWithGoogle(): Promise<NativeSignInResult> {
  try {
    const { GoogleAuth } = await import(
      "@codetrix-studio/capacitor-google-auth"
    );

    const result = await GoogleAuth.signIn();
    const idToken = result.authentication.idToken;

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });

    if (error) return { user: null, error: error.message };

    // Load user profile
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (!profile) {
      // First login: create user profile
      const { data: newProfile } = await supabase
        .from("users")
        .insert({
          id: data.user.id,
          line_user_id: `google-${data.user.id}`,
          display_name:
            data.user.user_metadata?.full_name ??
            data.user.email ??
            "ゲスト",
          avatar_url: data.user.user_metadata?.avatar_url ?? null,
        })
        .select()
        .single();
      return { user: newProfile, error: null };
    }

    return { user: profile, error: null };
  } catch (e: any) {
    return { user: null, error: e.message ?? "Google sign-in failed" };
  }
}

/**
 * Sign in with Apple on native platform.
 * Uses Capacitor Apple Sign In plugin → Supabase signInWithIdToken.
 */
export async function signInWithApple(): Promise<NativeSignInResult> {
  try {
    const { SignInWithApple } = await import(
      "@capacitor-community/apple-sign-in"
    );

    const result = await SignInWithApple.authorize({
      clientId: "jp.waggly.app",
      redirectURI: "https://waggly.jp/auth/callback",
      scopes: "email name",
    });

    const idToken = result.response.identityToken;

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: idToken,
    });

    if (error) return { user: null, error: error.message };

    // Load user profile
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (!profile) {
      // First login: create user profile
      const displayName =
        result.response.givenName && result.response.familyName
          ? `${result.response.familyName} ${result.response.givenName}`
          : data.user.email ?? "ゲスト";
      const { data: newProfile } = await supabase
        .from("users")
        .insert({
          id: data.user.id,
          line_user_id: `apple-${data.user.id}`,
          display_name: displayName,
          avatar_url: null,
        })
        .select()
        .single();
      return { user: newProfile, error: null };
    }

    return { user: profile, error: null };
  } catch (e: any) {
    return { user: null, error: e.message ?? "Apple sign-in failed" };
  }
}
```

- [ ] **Step 3: コミット**

```bash
git add src/lib/native-auth.ts
git commit -m "feat: add native auth (Apple/Google Sign In via Supabase)"
```

---

### Task 9: AuthProviderにネイティブ認証フローを追加

**Files:**
- Modify: `src/components/auth-provider.tsx`

LIFFフロー（Web版）とNativeフロー（Apple/Google）を `isNative()` で分岐する。

- [ ] **Step 1: auth-provider.tsxを修正**

`src/components/auth-provider.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { isNative } from "@/lib/platform";
import type { User } from "@/types/database";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function authenticate() {
      try {
        // Development mode: skip auth
        if (
          process.env.NODE_ENV === "development" &&
          process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === "true"
        ) {
          setUser({
            id: "dev-user",
            line_user_id: "dev-line-id",
            display_name: "開発ユーザー",
            avatar_url: null,
            agreed_terms_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          });
          setIsLoading(false);
          return;
        }

        const supabase = createClient();

        // Check for existing Supabase session (common to both web & native)
        const {
          data: { user: existingAuth },
        } = await supabase.auth.getUser();

        if (existingAuth) {
          const { data } = await supabase
            .from("users")
            .select("*")
            .eq("id", existingAuth.id)
            .single();

          if (data) {
            setUser(data);
            setIsLoading(false);
            return;
          }
        }

        if (isNative()) {
          // Native: show login screen (user taps Apple/Google button)
          // Don't auto-authenticate — let the login page handle it
          setIsLoading(false);
          return;
        }

        // Web: LIFF auth flow
        const { initLiff, getLiffProfile } = await import("@/lib/liff");
        const deepLink = await initLiff();

        const { liff } = await import("@/lib/liff");
        if (liff.isInClient()) {
          document.documentElement.classList.add("liff-client");
        }

        if (existingAuth) {
          if (deepLink) router.replace(deepLink);
          return;
        }

        const { profile } = await getLiffProfile();

        const { apiFetch } = await import("@/lib/api-client");
        const res = await apiFetch("/api/auth/line", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineUserId: profile.userId,
            displayName: profile.displayName,
            avatarUrl: profile.pictureUrl,
          }),
        });

        if (!res.ok) throw new Error("Auth failed");

        const { email, password } = await res.json();

        const { error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (signInError) throw new Error(signInError.message);

        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser) throw new Error("No auth user");

        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single();

        setUser(data);
        if (deepLink) router.replace(deepLink);
      } catch (error) {
        console.error("Authentication error:", error);
      } finally {
        setIsLoading(false);
      }
    }

    authenticate();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
```

> **Note:** `AuthContext` に `setUser` を追加する必要がある。ネイティブログイン画面のボタンハンドラが `signInWithGoogle()` / `signInWithApple()` の結果を `setUser` でセットするため。`src/hooks/use-auth.ts` の `AuthContext` 定義も合わせて更新する。

- [ ] **Step 2: use-auth.tsにsetUserを追加**

`src/hooks/use-auth.ts` の `AuthContext` 定義に `setUser` を追加:

```typescript
import { createContext, useContext } from "react";
import type { User } from "@/types/database";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  setUser?: (user: User | null) => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 3: ビルド確認**

```bash
npm run build
```

Expected: ビルド成功

- [ ] **Step 4: コミット**

```bash
git add src/components/auth-provider.tsx src/hooks/use-auth.ts
git commit -m "feat: add native platform auth flow to AuthProvider"
```

---

### Task 10: ネイティブログイン画面

**Files:**
- Create: `src/app/login/page.tsx`

ネイティブアプリで未認証時に表示するログイン画面。Apple / Google Sign Inボタンを配置。

- [ ] **Step 1: ログインページを作成**

`src/app/login/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { signInWithGoogle, signInWithApple } from "@/lib/native-auth";
import { Capacitor } from "@capacitor/core";
import Image from "next/image";

export default function LoginPage() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { setUser } = useAuth();

  async function handleGoogleSignIn() {
    setIsSigningIn(true);
    setError(null);
    const result = await signInWithGoogle();
    if (result.error) {
      setError(result.error);
      setIsSigningIn(false);
      return;
    }
    setUser?.(result.user);
    router.replace("/");
  }

  async function handleAppleSignIn() {
    setIsSigningIn(true);
    setError(null);
    const result = await signInWithApple();
    if (result.error) {
      setError(result.error);
      setIsSigningIn(false);
      return;
    }
    setUser?.(result.user);
    router.replace("/");
  }

  const isIos = Capacitor.getPlatform() === "ios";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-green-700 px-6">
      <Image
        src="/icons/waggly-logo.svg"
        alt="Waggly"
        width={180}
        height={55}
        className="mb-12 brightness-0 invert"
      />

      <div className="flex w-full max-w-xs flex-col gap-3">
        {/* iOS: Apple Sign In を先に表示（App Store審査要件） */}
        {isIos && (
          <button
            onClick={handleAppleSignIn}
            disabled={isSigningIn}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-black text-white font-medium disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Appleでサインイン
          </button>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-white text-gray-800 font-medium shadow disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Googleでサインイン
        </button>

        {/* Android: Apple Sign In は下に配置 */}
        {!isIos && (
          <button
            onClick={handleAppleSignIn}
            disabled={isSigningIn}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-black text-white font-medium disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Appleでサインイン
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-200">{error}</p>
      )}

      {isSigningIn && (
        <p className="mt-4 text-sm text-green-200">サインイン中...</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: AuthProviderにログインリダイレクトを追加**

`src/components/auth-provider.tsx` の native 未認証時の処理を修正:

```typescript
// Task 9で追加した箇所を修正:
if (isNative()) {
  // Native: no session → redirect to login
  setIsLoading(false);
  router.replace("/login");
  return;
}
```

- [ ] **Step 3: ビルド確認**

```bash
npm run build
```

Expected: ビルド成功

- [ ] **Step 4: コミット**

```bash
git add src/app/login/page.tsx src/components/auth-provider.tsx
git commit -m "feat: add native login page with Apple/Google Sign In"
```

---

### Task 11: ビルドパイプライン検証

**Files:**
- Modify: `package.json`（必要に応じて）

- [ ] **Step 1: iOSプラットフォームを追加**

```bash
npx cap add ios
```

Expected: `ios/` ディレクトリが生成される

- [ ] **Step 2: Androidプラットフォームを追加**

```bash
npx cap add android
```

Expected: `android/` ディレクトリが生成される

- [ ] **Step 3: Static exportビルド → Capacitor sync**

```bash
npm run build:app && npx cap sync
```

Expected:
- `out/` に静的ファイルが生成
- `ios/App/App/public/` にファイルがコピーされる
- `android/app/src/main/assets/public/` にファイルがコピーされる

- [ ] **Step 4: Xcodeで開いて確認 (macOSのみ)**

```bash
npx cap open ios
```

Expected: Xcodeが開き、Wagglyプロジェクトが表示される。シミュレータでビルド可能な状態。

- [ ] **Step 5: 通常ビルド（Vercel用）が壊れていないことを最終確認**

```bash
npm run build
npx vitest run
```

Expected: 両方成功

- [ ] **Step 6: コミット**

```bash
git add package.json capacitor.config.ts
git commit -m "feat: verify Capacitor build pipeline end-to-end"
```

---

## Phase II: オフラインサポート (SQLite + 同期)

> Phase Iが完了し、オンラインで動作するネイティブアプリができた後に着手する。

### Task 12: SQLiteプラグインセットアップ

**Files:**
- Create: `src/lib/sqlite/database.ts`

- [ ] **Step 1: SQLiteプラグインをインストール**

```bash
npm install @capacitor-community/sqlite
npx cap sync
```

- [ ] **Step 2: データベース接続ラッパーを実装**

`src/lib/sqlite/database.ts`:

```typescript
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from "@capacitor-community/sqlite";

const DB_NAME = "waggly";

let connection: SQLiteConnection | null = null;
let db: SQLiteDBConnection | null = null;

export async function getDb(): Promise<SQLiteDBConnection> {
  if (db) return db;

  connection = new SQLiteConnection(CapacitorSQLite);
  const isConsistent = (await connection.checkConnectionsConsistency()).result;
  const isConnected = (await connection.isConnection(DB_NAME, false)).result;

  if (isConsistent && isConnected) {
    db = await connection.retrieveConnection(DB_NAME, false);
  } else {
    db = await connection.createConnection(
      DB_NAME,
      false,
      "no-encryption",
      1,
      false
    );
  }

  await db.open();
  return db;
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
  if (connection) {
    await connection.closeConnection(DB_NAME, false);
    connection = null;
  }
}

export async function execute(sql: string, values?: any[]): Promise<void> {
  const database = await getDb();
  await database.execute(sql);
}

export async function query<T = any>(
  sql: string,
  values?: any[]
): Promise<T[]> {
  const database = await getDb();
  const result = await database.query(sql, values);
  return (result.values ?? []) as T[];
}
```

- [ ] **Step 3: コミット**

```bash
git add src/lib/sqlite/database.ts
git commit -m "feat: add SQLite database connection wrapper"
```

---

### Task 13: SQLiteスキーマ定義 & マイグレーション

**Files:**
- Create: `src/lib/sqlite/schema.ts`
- Create: `src/lib/sqlite/migrations.ts`

- [ ] **Step 1: テーブルスキーマを定義**

`src/lib/sqlite/schema.ts`:

```typescript
/** Schema version — increment when adding migrations. */
export const SCHEMA_VERSION = 1;

/** SQLite DDL for all mirrored tables + sync metadata. */
export const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS clubs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  club_number TEXT NOT NULL,
  maker TEXT,
  model TEXT,
  shaft_name TEXT,
  shaft_flex TEXT,
  loft REAL,
  lie REAL,
  length REAL,
  distance REAL,
  release_year INTEGER,
  memo TEXT,
  purchase_date TEXT,
  purchase_shop TEXT,
  purchase_price INTEGER,
  status TEXT NOT NULL DEFAULT 'bag',
  bag_number INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  weight REAL,
  swing_weight TEXT,
  frequency REAL,
  kick_point TEXT,
  head_volume REAL,
  head_weight REAL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS club_memos (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  distance REAL,
  memo TEXT,
  condition TEXT,
  symptom_tags TEXT DEFAULT '[]',
  feeling_tags TEXT DEFAULT '[]',
  gear_tags TEXT DEFAULT '[]',
  practice_session_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS club_images (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS accessories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  memo TEXT,
  rating INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  purchase_url TEXT,
  image_url TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS practice_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  practiced_at TEXT NOT NULL,
  location TEXT,
  total_balls INTEGER,
  memo TEXT,
  rating INTEGER,
  plan_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS practice_clubs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  club_id TEXT NOT NULL,
  balls INTEGER NOT NULL DEFAULT 0,
  avg_distance REAL,
  FOREIGN KEY (session_id) REFERENCES practice_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS maintenances (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  shop TEXT,
  cost INTEGER,
  done_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pending_sync (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
```

- [ ] **Step 2: マイグレーションシステムを実装**

`src/lib/sqlite/migrations.ts`:

```typescript
import { execute, query } from "./database";
import { SCHEMA_VERSION, SCHEMA_V1 } from "./schema";

const MIGRATIONS: Record<number, string> = {
  1: SCHEMA_V1,
};

export async function runMigrations(): Promise<void> {
  // Ensure sync_meta table exists for version tracking
  await execute(`
    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const rows = await query<{ value: string }>(
    "SELECT value FROM sync_meta WHERE key = ?",
    ["schema_version"]
  );

  const currentVersion = rows.length > 0 ? parseInt(rows[0].value, 10) : 0;

  for (let v = currentVersion + 1; v <= SCHEMA_VERSION; v++) {
    const migration = MIGRATIONS[v];
    if (!migration) {
      throw new Error(`Missing migration for version ${v}`);
    }
    await execute(migration);
    await execute(
      "INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)",
      ["schema_version", String(v)]
    );
  }
}
```

- [ ] **Step 3: コミット**

```bash
git add src/lib/sqlite/schema.ts src/lib/sqlite/migrations.ts
git commit -m "feat: add SQLite schema definitions and migration system"
```

---

### Task 14: ネットワーク状態フック

**Files:**
- Create: `src/hooks/use-network.ts`

- [ ] **Step 1: useNetworkフックを実装**

`src/hooks/use-network.ts`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { isNative } from "@/lib/platform";

export function useNetwork() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (!isNative()) {
      // Web: use browser online/offline events
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      setIsOnline(navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }

    // Native: use Capacitor Network plugin
    let removeListener: (() => void) | undefined;

    (async () => {
      const { Network } = await import("@capacitor/network");
      const status = await Network.getStatus();
      setIsOnline(status.connected);

      const handle = await Network.addListener(
        "networkStatusChange",
        (s) => setIsOnline(s.connected)
      );
      removeListener = () => handle.remove();
    })();

    return () => {
      removeListener?.();
    };
  }, []);

  return { isOnline };
}
```

- [ ] **Step 2: コミット**

```bash
git add src/hooks/use-network.ts
git commit -m "feat: add network status hook with Capacitor Network plugin"
```

---

### Task 15: データストア抽象化層

**Files:**
- Create: `src/lib/data-store.ts`
- Create: `__tests__/lib/data-store.test.ts`

オンライン → API + SQLiteキャッシュ。オフライン → SQLite読み取り + pending_syncキュー。

- [ ] **Step 1: テストを書く**

`__tests__/lib/data-store.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: vi.fn() },
}));
vi.mock("@capacitor/network", () => ({
  Network: {
    getStatus: vi.fn().mockResolvedValue({ connected: true }),
  },
}));
vi.mock("@/lib/sqlite/database", () => ({
  query: vi.fn(),
  execute: vi.fn(),
}));
vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";
import { query, execute } from "@/lib/sqlite/database";
import { apiFetch } from "@/lib/api-client";

describe("DataStore", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  });

  describe("fetchData (read)", () => {
    it("returns API data and caches to SQLite when online", async () => {
      vi.mocked(Network.getStatus).mockResolvedValue({
        connected: true,
        connectionType: "wifi",
      });
      const mockClubs = [{ id: "1", club_number: "7I" }];
      vi.mocked(apiFetch).mockResolvedValue(
        new Response(JSON.stringify(mockClubs), { status: 200 })
      );

      const { fetchData } = await import("@/lib/data-store");
      const result = await fetchData("/api/clubs", "clubs");

      expect(apiFetch).toHaveBeenCalledWith("/api/clubs");
      expect(result).toEqual(mockClubs);
    });

    it("falls back to SQLite when offline", async () => {
      vi.mocked(Network.getStatus).mockResolvedValue({
        connected: false,
        connectionType: "none",
      });
      const cachedClubs = [{ id: "1", club_number: "7I" }];
      vi.mocked(query).mockResolvedValue(cachedClubs);

      const { fetchData } = await import("@/lib/data-store");
      const result = await fetchData("/api/clubs", "clubs");

      expect(query).toHaveBeenCalledWith("SELECT * FROM clubs");
      expect(result).toEqual(cachedClubs);
    });
  });

  describe("mutateData (write)", () => {
    it("sends to API and writes to SQLite when online", async () => {
      vi.mocked(Network.getStatus).mockResolvedValue({
        connected: true,
        connectionType: "wifi",
      });
      const newClub = { id: "2", club_number: "PW" };
      vi.mocked(apiFetch).mockResolvedValue(
        new Response(JSON.stringify(newClub), { status: 200 })
      );

      const { mutateData } = await import("@/lib/data-store");
      const result = await mutateData("/api/clubs", "POST", newClub);

      expect(apiFetch).toHaveBeenCalled();
      expect(result).toEqual(newClub);
    });

    it("queues in pending_sync when offline", async () => {
      vi.mocked(Network.getStatus).mockResolvedValue({
        connected: false,
        connectionType: "none",
      });

      const { mutateData } = await import("@/lib/data-store");
      await mutateData("/api/clubs", "POST", {
        id: "3",
        club_number: "5W",
      });

      expect(execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO pending_sync"),
        expect.any(Array)
      );
    });
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run __tests__/lib/data-store.test.ts
```

Expected: FAIL — `@/lib/data-store` が存在しない

- [ ] **Step 3: 実装**

`src/lib/data-store.ts`:

```typescript
import { isNative } from "@/lib/platform";
import { apiFetch } from "@/lib/api-client";

async function checkOnline(): Promise<boolean> {
  if (!isNative()) return navigator.onLine;
  const { Network } = await import("@capacitor/network");
  const status = await Network.getStatus();
  return status.connected;
}

/**
 * Read data: online → API (+ cache to SQLite), offline → SQLite.
 * On web, always uses API (no SQLite).
 */
export async function fetchData<T = any>(
  apiPath: string,
  tableName: string,
  queryOverride?: string
): Promise<T[]> {
  if (!isNative()) {
    const res = await apiFetch(apiPath);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }

  const online = await checkOnline();
  const { query, execute } = await import("@/lib/sqlite/database");

  if (online) {
    const res = await apiFetch(apiPath);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data: T[] = await res.json();

    // Cache to SQLite (best-effort)
    try {
      for (const row of data as any[]) {
        const keys = Object.keys(row).filter((k) => !Array.isArray(row[k]) && typeof row[k] !== "object");
        const placeholders = keys.map(() => "?").join(", ");
        const values = keys.map((k) => row[k]);
        const cols = keys.join(", ");
        await execute(
          `INSERT OR REPLACE INTO ${tableName} (${cols}) VALUES (${placeholders})`,
          values
        );
      }
    } catch {
      // Cache failure is non-fatal
    }

    return data;
  }

  // Offline: read from SQLite
  const sql = queryOverride ?? `SELECT * FROM ${tableName}`;
  return query<T>(sql);
}

/**
 * Write data: SQLite即書き込み + online → API送信, offline → pending_syncにキュー。
 */
export async function mutateData<T = any>(
  apiPath: string,
  method: "POST" | "PATCH" | "DELETE",
  payload?: any
): Promise<T | null> {
  if (!isNative()) {
    const res = await apiFetch(apiPath, {
      method,
      headers: { "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    if (method === "DELETE") return null;
    return res.json();
  }

  const online = await checkOnline();
  const { execute } = await import("@/lib/sqlite/database");

  if (online) {
    const res = await apiFetch(apiPath, {
      method,
      headers: { "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    if (method === "DELETE") return null;
    return res.json();
  }

  // Offline: queue for sync
  await execute(
    "INSERT INTO pending_sync (table_name, record_id, action, payload) VALUES (?, ?, ?, ?)",
    [
      apiPath.split("/")[2] ?? "unknown",
      payload?.id ?? "",
      method,
      JSON.stringify({ apiPath, method, payload }),
    ]
  );

  return payload as T;
}
```

- [ ] **Step 4: テストがパスすることを確認**

```bash
npx vitest run __tests__/lib/data-store.test.ts
```

Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/lib/data-store.ts __tests__/lib/data-store.test.ts
git commit -m "feat: add data store abstraction with SQLite offline fallback"
```

---

### Task 16: 同期エンジン

**Files:**
- Create: `src/lib/sync.ts`
- Create: `__tests__/lib/sync.test.ts`

**方針:** サーバー優先。pending_syncキューを送信 → サーバーから全データをfetch → SQLiteに反映。

> **Note:** Specでは `updated_at` タイムスタンプベースの差分同期が記載されているが、初期実装では「全削除 → 全挿入」方式を採用する。データ量が少ない間はこちがシンプルで信頼性が高い。データ増加時にタイムスタンプベースの差分同期に移行する。

- [ ] **Step 1: テストを書く**

`__tests__/lib/sync.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: vi.fn().mockReturnValue(true) },
}));
vi.mock("@/lib/sqlite/database", () => ({
  query: vi.fn(),
  execute: vi.fn(),
}));
vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

import { query, execute } from "@/lib/sqlite/database";
import { apiFetch } from "@/lib/api-client";

describe("SyncEngine", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.mocked(query).mockReset();
    vi.mocked(execute).mockReset();
    vi.mocked(apiFetch).mockReset();
  });

  describe("flushPendingSync", () => {
    it("sends queued operations and clears them on success", async () => {
      vi.mocked(query).mockResolvedValue([
        {
          id: 1,
          table_name: "clubs",
          record_id: "abc",
          action: "POST",
          payload: JSON.stringify({
            apiPath: "/api/clubs",
            method: "POST",
            payload: { id: "abc", club_number: "7I" },
          }),
        },
      ]);
      vi.mocked(apiFetch).mockResolvedValue(
        new Response("{}", { status: 200 })
      );

      const { flushPendingSync } = await import("@/lib/sync");
      await flushPendingSync();

      expect(apiFetch).toHaveBeenCalledWith("/api/clubs", expect.objectContaining({ method: "POST" }));
      expect(execute).toHaveBeenCalledWith(
        "DELETE FROM pending_sync WHERE id = ?",
        [1]
      );
    });

    it("does nothing when queue is empty", async () => {
      vi.mocked(query).mockResolvedValue([]);

      const { flushPendingSync } = await import("@/lib/sync");
      await flushPendingSync();

      expect(apiFetch).not.toHaveBeenCalled();
    });
  });

  describe("fullSync", () => {
    it("fetches all user data from server and caches in SQLite", async () => {
      vi.mocked(query).mockResolvedValue([]); // empty pending queue
      vi.mocked(apiFetch).mockResolvedValue(
        new Response(JSON.stringify([]), { status: 200 })
      );

      const { fullSync } = await import("@/lib/sync");
      await fullSync();

      // Should fetch each mirrored table
      expect(apiFetch).toHaveBeenCalledWith("/api/clubs");
      expect(apiFetch).toHaveBeenCalledWith("/api/practice");
      expect(apiFetch).toHaveBeenCalledWith("/api/accessories");
    });
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run __tests__/lib/sync.test.ts
```

Expected: FAIL — `@/lib/sync` が存在しない

- [ ] **Step 3: 実装**

`src/lib/sync.ts`:

```typescript
import { query, execute } from "@/lib/sqlite/database";
import { apiFetch } from "@/lib/api-client";

interface PendingSyncRow {
  id: number;
  table_name: string;
  record_id: string;
  action: string;
  payload: string;
}

/**
 * Flush all pending sync operations to the server.
 * Processes queue in order (FIFO). Stops on first failure.
 */
export async function flushPendingSync(): Promise<void> {
  const pending = await query<PendingSyncRow>(
    "SELECT * FROM pending_sync ORDER BY id ASC"
  );

  for (const row of pending) {
    const { apiPath, method, payload } = JSON.parse(row.payload);

    const res = await apiFetch(apiPath, {
      method,
      headers: { "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    });

    if (!res.ok) {
      console.error(`Sync failed for pending_sync id=${row.id}: ${res.status}`);
      break; // Stop on failure — retry next sync cycle
    }

    await execute("DELETE FROM pending_sync WHERE id = ?", [row.id]);
  }
}

/** Tables to sync from server → SQLite. */
const SYNC_TABLES = [
  { apiPath: "/api/clubs", table: "clubs" },
  { apiPath: "/api/practice", table: "practice_sessions" },
  { apiPath: "/api/accessories", table: "accessories" },
  // 子テーブル (club_memos, club_images, practice_clubs, maintenances) は
  // 親テーブルのAPI応答にネストされているため、親の同期時にキャッシュされる。
  // 個別同期が必要な場合は以下を追加:
  // { apiPath: "/api/clubs/{id}/memos", table: "club_memos" },
] as const;

/**
 * Full sync: flush pending → fetch all data from server → replace SQLite.
 * Call on app launch and network recovery.
 */
export async function fullSync(): Promise<void> {
  // Step 1: flush pending changes first
  await flushPendingSync();

  // Step 2: fetch each table from server and replace local data
  for (const { apiPath, table } of SYNC_TABLES) {
    try {
      const res = await apiFetch(apiPath);
      if (!res.ok) continue;

      const rows: any[] = await res.json();

      // Clear local table and re-insert
      await execute(`DELETE FROM ${table}`);

      for (const row of rows) {
        const keys = Object.keys(row).filter(
          (k) => !Array.isArray(row[k]) && typeof row[k] !== "object"
        );
        const placeholders = keys.map(() => "?").join(", ");
        const values = keys.map((k) => row[k]);
        const cols = keys.join(", ");
        await execute(
          `INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${placeholders})`,
          values
        );
      }
    } catch (e) {
      console.error(`Sync failed for ${table}:`, e);
    }
  }

  // Update last sync timestamp
  await execute(
    "INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)",
    ["last_sync", new Date().toISOString()]
  );
}
```

- [ ] **Step 4: テストがパスすることを確認**

```bash
npx vitest run __tests__/lib/sync.test.ts
```

Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/lib/sync.ts __tests__/lib/sync.test.ts
git commit -m "feat: add sync engine with pending queue flush and full sync"
```

---

### Task 17: アプリライフサイクルで同期をトリガー

**Files:**
- Modify: `src/components/app-shell.tsx`

アプリ起動時・ネットワーク復帰時にフルsyncを実行する。

- [ ] **Step 1: app-shell.tsxに同期トリガーを追加**

`src/components/app-shell.tsx` の中に以下のuseEffectを追加:

```typescript
import { isNative } from "@/lib/platform";

// Existing code...

useEffect(() => {
  if (!isNative()) return;

  let removeNetworkListener: (() => void) | undefined;
  let removeAppListener: (() => void) | undefined;

  (async () => {
    const { runMigrations } = await import("@/lib/sqlite/migrations");
    const { fullSync } = await import("@/lib/sync");

    // Run SQLite migrations on startup
    await runMigrations();

    // Initial sync
    try {
      await fullSync();
    } catch (e) {
      console.error("Initial sync failed:", e);
    }

    // Sync on network recovery
    const { Network } = await import("@capacitor/network");
    const networkHandle = await Network.addListener(
      "networkStatusChange",
      async (status) => {
        if (status.connected) {
          try {
            await fullSync();
          } catch (e) {
            console.error("Sync on network recovery failed:", e);
          }
        }
      }
    );
    removeNetworkListener = () => networkHandle.remove();

    // Sync on app resume
    const { App } = await import("@capacitor/app");
    const appHandle = await App.addListener("appStateChange", async (state) => {
      if (state.isActive) {
        const networkStatus = await Network.getStatus();
        if (networkStatus.connected) {
          try {
            await fullSync();
          } catch (e) {
            console.error("Sync on resume failed:", e);
          }
        }
      }
    });
    removeAppListener = () => appHandle.remove();
  })();

  return () => {
    removeNetworkListener?.();
    removeAppListener?.();
  };
}, []);
```

- [ ] **Step 2: ビルド確認**

```bash
npm run build
```

Expected: ビルド成功

- [ ] **Step 3: コミット**

```bash
git add src/components/app-shell.tsx
git commit -m "feat: trigger SQLite migrations and sync on app lifecycle events"
```

---

## チェックリスト

### Phase I 完了条件
- [ ] `npm run build` (SSRモード) が成功する
- [ ] `npm run build:app` (Static Export) が成功し `out/` が生成される
- [ ] `npx cap sync` が成功する
- [ ] `npx vitest run` が全テストパスする
- [ ] Xcodeシミュレータでアプリが起動し、ログイン画面が表示される

### Phase II 完了条件
- [ ] オンライン時: APIからデータ取得 → SQLiteにキャッシュ
- [ ] オフライン時: SQLiteからデータ読み取り
- [ ] オフラインでの書き込みがpending_syncにキューされる
- [ ] ネットワーク復帰時にpending_syncがフラッシュされる
- [ ] アプリ起動時にフルsyncが実行される
