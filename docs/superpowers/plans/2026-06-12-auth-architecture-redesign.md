# 認証アーキテクチャ再設計 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `auth.users.id = users.id` の前提を排除し、独自UUID + `user_providers` ジャンクションテーブルによるマルチプロバイダ認証アーキテクチャに全面移行する。

**Architecture:** `users.id` を Supabase `auth.users.id` から独立させ、`user_providers` テーブルでN:1のプロバイダ紐づけを管理。全APIは `JWT → auth_user_id → user_providers → users.id` の逆引きでユーザーを特定。クライアントは `resolve-session` を呼ぶだけのシンプルな構造に。未公開のためDB全リセットで移行。

**Tech Stack:** Next.js 16, Supabase (PostgreSQL + Auth), Capacitor 8, SQLite, Vitest

**Spec:** `docs/superpowers/specs/2026-06-11-auth-architecture-redesign.md`

---

## File Structure

### Create
| File | Responsibility |
|------|---------------|
| `supabase/migrations/100_auth_redesign.sql` | 全テーブルDROP + 新スキーマ作成（users, user_providers, 全RLS） |
| `src/lib/auth-helpers.ts` | プロバイダトークン検証、deleteUserData、createSessionForUser等の共有ユーティリティ |
| `src/app/api/auth/resolve-session/route.ts` | ログイン後のユーザー解決API |
| `src/app/api/auth/link-provider/route.ts` | プロバイダ連携/解除API（POST + DELETE） |
| `__tests__/lib/auth-helpers.test.ts` | auth-helpersのユニットテスト |

### Modify
| File | Change Summary |
|------|---------------|
| `src/types/database.ts` | User型変更（`line_user_id`/`google_id` 削除）、`UserProvider`型追加 |
| `src/lib/supabase/api.ts` | `getApiAuth()` を `user_providers` 逆引きに変更 |
| `src/components/auth-provider.tsx` | `resolve-session` を呼ぶだけにシンプル化 |
| `src/lib/native-auth.ts` | `signInWithGoogle/Apple` 後に `resolve-session` を呼ぶだけに |
| `src/app/settings/page.tsx` | `AccountLinking` が `link-provider` APIを使用 |
| `src/app/api/auth/line/route.ts` | 新スキーマ対応（`user_providers` 使用） |
| `src/app/api/auth/line-oauth/route.ts` | 新スキーマ対応 |
| `src/app/auth/callback/route.ts` | `link-provider` パターンに変更 |
| `src/lib/user-data-summary.ts` | 変更なし（`user_id` フィルタはそのまま） |
| `src/lib/insert-local-data.ts` | 変更なし |
| `src/lib/sqlite/schema.ts` | スキーマバージョンリセット |
| `src/lib/sync.ts` | 変更なし |

### Delete
| File | Reason |
|------|--------|
| `src/app/api/auth/resolve-google-user/route.ts` | `resolve-session` に統合 |
| `src/app/api/auth/check-conflict/route.ts` | `resolve-session` に統合 |
| `src/app/api/auth/resolve-conflict/route.ts` | `resolve-session` + `link-provider` に統合 |
| `src/app/api/auth/link/route.ts` | `link-provider` に統合 |
| `src/app/auth/resolve-conflict/` | 衝突解決は設定ページ内インラインに |

---

## Task 1: TypeScript型定義の更新

**Files:**
- Modify: `src/types/database.ts:11-20`

- [ ] **Step 1: User型とUserProvider型を更新**

`src/types/database.ts` の `User` インターフェースを新スキーマに合わせ、`UserProvider` を追加する。

```typescript
// User — line_user_id, google_id を削除、google_email は残す
export interface User {
  id: string;
  display_name: string;
  avatar_url: string | null;
  google_email: string | null;
  agreed_terms_at: string | null;
  created_at: string;
}

// 新規追加
export interface UserProvider {
  id: string;
  user_id: string;
  provider: string;
  auth_user_id: string | null;
  provider_sub: string;
  provider_email: string | null;
  created_at: string;
}
```

- [ ] **Step 2: ビルド確認**

Run: `npx tsc --noEmit 2>&1 | head -50`
Expected: User型を参照する箇所で多数のエラー（`line_user_id`, `google_id` が存在しない）。これは想定通り — 後続タスクで修正する。エラー箇所を記録しておく。

- [ ] **Step 3: Commit**

```bash
git add src/types/database.ts
git commit -m "refactor(types): update User type for auth redesign, add UserProvider type"
```

---

## Task 2: Supabaseマイグレーション — 全リセット + 新スキーマ

**Files:**
- Create: `supabase/migrations/100_auth_redesign.sql`

- [ ] **Step 1: マイグレーションSQLを作成**

以下の内容で `supabase/migrations/100_auth_redesign.sql` を作成する。既存テーブルを全DROP → 新スキーマで再作成。

```sql
-- ============================================================
-- Auth Architecture Redesign: Full Reset Migration
-- ============================================================
-- users.id を auth.users.id から独立させ、
-- user_providers ジャンクションテーブルでプロバイダを管理する。
-- 未公開のためデータ全削除で移行。
-- ============================================================

-- 1. 既存RLSポリシーをDROP
-- (テーブルDROPで自動削除されるが、明示的に)

-- Storage policies (テーブルDROPでは消えないので手動)
DROP POLICY IF EXISTS "Users can upload club images" ON storage.objects;
DROP POLICY IF EXISTS "Users can read club images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own club images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;

-- 2. 既存テーブルを全DROP（依存順）
DROP TABLE IF EXISTS public.ai_chats CASCADE;
DROP TABLE IF EXISTS public.practice_plan_items CASCADE;
DROP TABLE IF EXISTS public.practice_plans CASCADE;
DROP TABLE IF EXISTS public.practice_clubs CASCADE;
DROP TABLE IF EXISTS public.practice_sessions CASCADE;
DROP TABLE IF EXISTS public.club_memos CASCADE;
DROP TABLE IF EXISTS public.club_images CASCADE;
DROP TABLE IF EXISTS public.maintenances CASCADE;
DROP TABLE IF EXISTS public.accessories CASCADE;
DROP TABLE IF EXISTS public.favorite_courses CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.clubs CASCADE;
DROP TABLE IF EXISTS public.knowledge_base CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 3. 新 users テーブル（auth.users.id への FK なし = 独自UUID）
CREATE TABLE public.users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name    TEXT NOT NULL,
  avatar_url      TEXT,
  google_email    TEXT,
  agreed_terms_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. user_providers ジャンクションテーブル
CREATE TABLE public.user_providers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,
  auth_user_id    UUID,
  provider_sub    TEXT NOT NULL,
  provider_email  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_sub),
  UNIQUE(provider, auth_user_id)
);

CREATE INDEX idx_user_providers_auth_user_id ON public.user_providers(auth_user_id);
CREATE INDEX idx_user_providers_provider_sub ON public.user_providers(provider, provider_sub);

ALTER TABLE public.user_providers ENABLE ROW LEVEL SECURITY;

-- 5. データテーブル再作成（user_id は public.users(id) を参照）
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('driver','fairway_wood','utility','iron','wedge','putter')),
  club_number TEXT NOT NULL,
  maker TEXT,
  model TEXT,
  shaft_name TEXT,
  shaft_flex TEXT,
  loft NUMERIC,
  lie NUMERIC,
  length NUMERIC,
  distance INTEGER,
  release_year INTEGER,
  memo TEXT,
  purchase_date DATE,
  purchase_shop TEXT,
  purchase_price INTEGER,
  status TEXT NOT NULL DEFAULT 'bag' CHECK (status IN ('bag','reserve','sold')),
  bag_number INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  weight NUMERIC,
  swing_weight TEXT,
  frequency NUMERIC,
  kick_point TEXT,
  head_volume NUMERIC,
  head_weight NUMERIC,
  rating INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX clubs_user_id_idx ON public.clubs(user_id);
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.club_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX club_images_club_id_idx ON public.club_images(club_id);
ALTER TABLE public.club_images ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.club_memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  distance NUMERIC,
  balls INTEGER,
  memo TEXT,
  condition TEXT CHECK (condition IN ('good','normal','bad')),
  symptom_tags JSONB DEFAULT '[]',
  feeling_tags JSONB DEFAULT '[]',
  gear_tags JSONB DEFAULT '[]',
  practice_session_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX club_memos_club_id_idx ON public.club_memos(club_id);
ALTER TABLE public.club_memos ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.maintenances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('grip_change','reshaft','loft_adjust','other')),
  description TEXT,
  shop TEXT,
  cost INTEGER,
  done_at DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX maintenances_club_id_idx ON public.maintenances(club_id);
ALTER TABLE public.maintenances ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.accessories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('ball','glove','tee','apparel','bag','rangefinder','grip','shaft','other')),
  brand TEXT,
  model TEXT,
  memo TEXT,
  rating INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','past')),
  purchase_url TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX accessories_user_id_idx ON public.accessories(user_id);
ALTER TABLE public.accessories ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  practiced_at DATE NOT NULL DEFAULT current_date,
  location TEXT,
  total_balls INTEGER,
  memo TEXT,
  rating INTEGER,
  plan_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX practice_sessions_user_id_idx ON public.practice_sessions(user_id);
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.practice_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  balls INTEGER NOT NULL DEFAULT 0,
  avg_distance NUMERIC
);
CREATE INDEX practice_clubs_session_id_idx ON public.practice_clubs(session_id);
ALTER TABLE public.practice_clubs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.practice_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('auto','chat')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','done','skipped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX practice_plans_user_id_idx ON public.practice_plans(user_id);
ALTER TABLE public.practice_plans ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.practice_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.practice_plans(id) ON DELETE CASCADE,
  club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  balls INTEGER NOT NULL,
  focus TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX practice_plan_items_plan_id_idx ON public.practice_plan_items(plan_id);
ALTER TABLE public.practice_plan_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ai_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ai_chats_user_id_idx ON public.ai_chats(user_id);
CREATE INDEX ai_chats_conversation_id_idx ON public.ai_chats(conversation_id);
ALTER TABLE public.ai_chats ENABLE ROW LEVEL SECURITY;

-- profiles は users(id) を参照（auth.users ではない）
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  nickname TEXT,
  avatar_url TEXT,
  golf_start_date DATE,
  average_score INTEGER,
  best_score INTEGER,
  home_course TEXT,
  bio TEXT,
  sns_links JSONB DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT false,
  visible_fields JSONB DEFAULT '{"nickname":true,"golf_start_date":true,"average_score":true,"best_score":true,"home_course":true,"bio":true,"bag":true,"favorite_courses":true,"sns_links":true}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX profiles_username_idx ON public.profiles(username);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.favorite_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gora_course_id INTEGER,
  course_name TEXT NOT NULL,
  course_image_url TEXT,
  evaluation NUMERIC,
  address TEXT,
  is_manual BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX favorite_courses_user_id_idx ON public.favorite_courses(user_id);
ALTER TABLE public.favorite_courses ENABLE ROW LEVEL SECURITY;

-- knowledge_base（adminのみ使用、RLS不要だがテーブルは再作成）
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT,
  source_url TEXT,
  auto_collected BOOLEAN DEFAULT false,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. RLSポリシー（user_providers サブクエリ経由）
-- ヘルパー関数: auth.uid() → users.id 変換
-- （RLSポリシーで毎回サブクエリを書くより関数化）

-- users テーブル: auth.uid() が紐づくユーザー自身のみ
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (
    id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (
    id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (true);
  -- INSERT は API レイヤーで制御（resolve-session 内のみ）

-- user_providers: 自分の行のみ
CREATE POLICY "Users can read own providers" ON public.user_providers
  FOR SELECT USING (auth_user_id = auth.uid());

-- clubs
CREATE POLICY "Users can CRUD own clubs" ON public.clubs
  FOR ALL USING (
    user_id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
  );

-- club_images
CREATE POLICY "Users can CRUD own club images" ON public.club_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = club_images.club_id
      AND clubs.user_id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
    )
  );

-- club_memos
CREATE POLICY "Users can CRUD own club memos" ON public.club_memos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = club_memos.club_id
      AND clubs.user_id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
    )
  );

-- maintenances
CREATE POLICY "Users can CRUD own maintenances" ON public.maintenances
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = maintenances.club_id
      AND clubs.user_id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
    )
  );

-- accessories
CREATE POLICY "Users can CRUD own accessories" ON public.accessories
  FOR ALL USING (
    user_id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
  );

-- practice_sessions
CREATE POLICY "Users can CRUD own practice sessions" ON public.practice_sessions
  FOR ALL USING (
    user_id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
  );

-- practice_clubs
CREATE POLICY "Users can CRUD own practice clubs" ON public.practice_clubs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.practice_sessions
      WHERE practice_sessions.id = practice_clubs.session_id
      AND practice_sessions.user_id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
    )
  );

-- practice_plans
CREATE POLICY "Users can CRUD own practice plans" ON public.practice_plans
  FOR ALL USING (
    user_id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
  );

-- practice_plan_items
CREATE POLICY "Users can CRUD own plan items" ON public.practice_plan_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.practice_plans
      WHERE practice_plans.id = practice_plan_items.plan_id
      AND practice_plans.user_id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
    )
  );

-- ai_chats
CREATE POLICY "Users can CRUD own chats" ON public.ai_chats
  FOR ALL USING (
    user_id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
  );

-- profiles
CREATE POLICY "Users can CRUD own profile card" ON public.profiles
  FOR ALL USING (
    id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "Public profiles are readable" ON public.profiles
  FOR SELECT USING (is_public = true);

-- favorite_courses
CREATE POLICY "Users can CRUD own favorite courses" ON public.favorite_courses
  FOR ALL USING (
    user_id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "Public favorite courses are readable" ON public.favorite_courses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = favorite_courses.user_id
      AND profiles.is_public = true
    )
  );

-- 7. Storage policies（users.id ベースに変更）
-- club-images バケットは既存。ポリシーを再作成。
INSERT INTO storage.buckets (id, name, public) VALUES ('club-images', 'club-images', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;

-- Storage は auth.uid() ベースで問題なし（フォルダ名=auth_user_id）
-- ただし削除時はauth_user_idでフォルダ分け
CREATE POLICY "Authenticated users can upload club images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'club-images' AND auth.role() = 'authenticated');
CREATE POLICY "Club images are publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'club-images');
CREATE POLICY "Users can delete own club images" ON storage.objects
  FOR DELETE USING (bucket_id = 'club-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Avatars are publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
```

- [ ] **Step 2: マイグレーションをSupabaseに適用**

Run: `npx supabase db push` (ローカル) or Supabase Dashboard でSQL実行

Expected: 全テーブルが再作成され、RLSポリシーが適用される。

- [ ] **Step 3: 既存auth.usersを全削除**

Supabase Dashboard → Authentication → Users から全ユーザーを削除。
または admin API:
```bash
# Supabase Dashboard の SQL Editor で実行
SELECT id FROM auth.users;
-- 各IDに対して:
-- SELECT auth.admin_delete_user('user-id-here');
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/100_auth_redesign.sql
git commit -m "feat(db): add auth redesign migration with user_providers junction table"
```

---

## Task 3: auth-helpers — 共有ユーティリティ関数

**Files:**
- Create: `src/lib/auth-helpers.ts`
- Create: `__tests__/lib/auth-helpers.test.ts`

- [ ] **Step 1: テスト作成**

`__tests__/lib/auth-helpers.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { extractProviderInfo } from "@/lib/auth-helpers";

describe("extractProviderInfo", () => {
  it("extracts Google provider info from raw_user_meta_data", () => {
    const result = extractProviderInfo({
      app_metadata: { provider: "google" },
      user_metadata: { sub: "google-123", email: "test@gmail.com" },
    });
    expect(result).toEqual({
      provider: "google",
      providerSub: "google-123",
      providerEmail: "test@gmail.com",
    });
  });

  it("extracts LINE provider info from raw_user_meta_data", () => {
    const result = extractProviderInfo({
      app_metadata: { provider: "email" },
      user_metadata: { line_user_id: "U1234567890" },
    });
    expect(result).toEqual({
      provider: "line",
      providerSub: "U1234567890",
      providerEmail: null,
    });
  });

  it("extracts Apple provider info", () => {
    const result = extractProviderInfo({
      app_metadata: { provider: "apple" },
      user_metadata: { sub: "apple-001" },
    });
    expect(result).toEqual({
      provider: "apple",
      providerSub: "apple-001",
      providerEmail: null,
    });
  });

  it("returns null for unknown provider without line_user_id", () => {
    const result = extractProviderInfo({
      app_metadata: { provider: "email" },
      user_metadata: {},
    });
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run __tests__/lib/auth-helpers.test.ts`
Expected: FAIL — `extractProviderInfo` が未定義

- [ ] **Step 3: auth-helpers.ts を実装**

`src/lib/auth-helpers.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * auth.users のメタデータからプロバイダ情報を抽出する。
 * resolve-session と link-provider で使用。
 */
export function extractProviderInfo(authUser: {
  app_metadata: any;
  user_metadata: any;
}): { provider: string; providerSub: string; providerEmail: string | null } | null {
  const appMeta = authUser.app_metadata ?? {};
  const userMeta = authUser.user_metadata ?? {};

  // Google
  if (appMeta.provider === "google") {
    const sub = userMeta.sub;
    if (!sub) return null;
    return {
      provider: "google",
      providerSub: sub,
      providerEmail: userMeta.email ?? null,
    };
  }

  // Apple
  if (appMeta.provider === "apple") {
    const sub = userMeta.sub;
    if (!sub) return null;
    return {
      provider: "apple",
      providerSub: sub,
      providerEmail: null,
    };
  }

  // LINE (email/password auth with line_user_id in metadata)
  if (userMeta.line_user_id) {
    return {
      provider: "line",
      providerSub: userMeta.line_user_id,
      providerEmail: null,
    };
  }

  return null;
}

/**
 * LINE IDトークンをサーバー側で検証する。
 */
export async function verifyLineIdToken(
  idToken: string
): Promise<{ sub: string; name: string; picture?: string } | null> {
  try {
    const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: process.env.NEXT_PUBLIC_LIFF_CHANNEL_ID!,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.sub) return null;
    return { sub: data.sub, name: data.name, picture: data.picture };
  } catch {
    return null;
  }
}

/**
 * LINE OAuth code をトークンに交換し、ユーザーIDを取得する。
 */
export async function exchangeLineCode(
  code: string,
  redirectUri: string
): Promise<{ sub: string; name?: string } | null> {
  const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: process.env.NEXT_PUBLIC_LINE_CHANNEL_ID!,
      client_secret: process.env.LINE_CHANNEL_SECRET!,
    }),
  });
  if (!tokenRes.ok) return null;
  const tokens = await tokenRes.json();

  const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      id_token: tokens.id_token,
      client_id: process.env.NEXT_PUBLIC_LINE_CHANNEL_ID!,
    }),
  });
  if (!verifyRes.ok) return null;
  const verified = await verifyRes.json();
  if (!verified.sub) return null;
  return { sub: verified.sub, name: verified.name };
}

/**
 * LINE accessToken をサーバー側で検証し、ユーザーIDを取得する。
 * Native LINE SDK から取得した accessToken を検証する。
 */
export async function verifyLineAccessToken(
  accessToken: string
): Promise<{ userId: string; displayName: string; pictureUrl?: string } | null> {
  try {
    const res = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.userId) return null;
    return {
      userId: data.userId,
      displayName: data.displayName,
      pictureUrl: data.pictureUrl,
    };
  } catch {
    return null;
  }
}

/**
 * Google IDトークンを検証してsubを取得する。
 */
export async function verifyGoogleIdToken(
  idToken: string
): Promise<{ sub: string; email?: string; name?: string; picture?: string } | null> {
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.sub) return null;
    return {
      sub: data.sub,
      email: data.email,
      name: data.name,
      picture: data.picture,
    };
  } catch {
    return null;
  }
}

/**
 * ユーザーのデータを全削除する（user_providers と auth.users は含まない）。
 * 衝突解決の敗者データ削除に使用。
 */
export async function deleteUserData(supabase: any, userId: string) {
  await supabase.from("favorite_courses").delete().eq("user_id", userId);
  await supabase.from("profiles").delete().eq("id", userId);
  await supabase.from("practice_sessions").delete().eq("user_id", userId);
  await supabase.from("accessories").delete().eq("user_id", userId);
  await supabase.from("clubs").delete().eq("user_id", userId);
}

/**
 * ユーザーに紐づく全auth.usersを削除する。
 */
export async function deleteUserAuthAccounts(supabase: any, userId: string) {
  const { data: providers } = await supabase
    .from("user_providers")
    .select("auth_user_id")
    .eq("user_id", userId);

  for (const p of providers ?? []) {
    if (p.auth_user_id) {
      await supabase.auth.admin.deleteUser(p.auth_user_id);
    }
  }
}

/**
 * ユーザーを完全削除する（データ + user_providers + auth.users + usersレコード）。
 */
export async function deleteUserCompletely(supabase: any, userId: string) {
  await deleteUserData(supabase, userId);
  await deleteUserAuthAccounts(supabase, userId);
  await supabase.from("user_providers").delete().eq("user_id", userId);
  await supabase.from("users").delete().eq("id", userId);
}
```

- [ ] **Step 4: テストが成功することを確認**

Run: `npx vitest run __tests__/lib/auth-helpers.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth-helpers.ts __tests__/lib/auth-helpers.test.ts
git commit -m "feat(auth): add shared auth helpers with provider extraction and verification"
```

---

## Task 4: getApiAuth() を user_providers 逆引きに変更

**Files:**
- Modify: `src/lib/supabase/api.ts`

- [ ] **Step 1: getApiAuth() を書き換え**

`src/lib/supabase/api.ts` を以下の内容で完全に書き換える:

```typescript
import { createClient } from "@/lib/supabase/server";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const DEV_EMAIL = "dev@waggly.local";
const DEV_PASSWORD = "devpassword123";

let cachedDevUserId: string | null = null;

function isDevMode() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === "true"
  );
}

function getAdminClient() {
  return createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * auth_user_id → users.id 逆引き（user_providers 経由）。
 * 全API共通。リクエスト内キャッシュ付き。
 */
async function resolveUserId(authUserId: string): Promise<string | null> {
  const adminClient = getAdminClient();
  const { data } = await adminClient
    .from("user_providers")
    .select("user_id")
    .eq("auth_user_id", authUserId)
    .limit(1)
    .maybeSingle();
  return data?.user_id ?? null;
}

/**
 * Get Supabase client and userId for API routes.
 * Returns null if not authenticated (caller should return 401).
 *
 * userId は users.id（独自UUID）。auth.users.id ではない。
 */
export async function getApiAuth(): Promise<{
  supabase: any;
  userId: string;
} | null> {
  if (isDevMode()) {
    const supabase = getAdminClient();

    if (cachedDevUserId) {
      return { supabase, userId: cachedDevUserId };
    }

    // Check if dev user exists
    const { data: existingProvider } = await supabase
      .from("user_providers")
      .select("user_id")
      .eq("provider", "dev")
      .eq("provider_sub", "dev-user")
      .maybeSingle();

    if (existingProvider) {
      cachedDevUserId = existingProvider.user_id;
      return { supabase, userId: cachedDevUserId! };
    }

    // Create dev user + provider
    const { data: newUser } = await supabase
      .from("users")
      .insert({ display_name: "開発ユーザー" })
      .select("id")
      .single();

    if (!newUser) return null;

    await supabase.from("user_providers").insert({
      user_id: newUser.id,
      provider: "dev",
      provider_sub: "dev-user",
    });

    cachedDevUserId = newUser.id;
    return { supabase, userId: newUser.id };
  }

  // Native app: Bearer token auth
  const headersList = await headers();
  const authHeader = headersList.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const adminClient = getAdminClient();
    const {
      data: { user },
      error,
    } = await adminClient.auth.getUser(token);
    if (error || !user) return null;

    // auth_user_id → users.id 逆引き
    const userId = await resolveUserId(user.id);
    if (!userId) return null;

    return { supabase: adminClient, userId };
  }

  // Production: cookie-based auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // auth_user_id → users.id 逆引き
  const userId = await resolveUserId(user.id);
  if (!userId) return null;

  return { supabase: getAdminClient(), userId };
}

/**
 * getApiAuth() の結果から auth_user_id も必要な場合に使用。
 * resolve-session 等の認証API専用。
 */
export async function getApiAuthWithAuthUserId(): Promise<{
  supabase: any;
  authUserId: string;
  userId: string | null;
} | null> {
  const headersList = await headers();
  const authHeader = headersList.get("authorization");

  const adminClient = getAdminClient();

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const {
      data: { user },
      error,
    } = await adminClient.auth.getUser(token);
    if (error || !user) return null;

    const userId = await resolveUserId(user.id);
    return { supabase: adminClient, authUserId: user.id, userId };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const userId = await resolveUserId(user.id);
  return { supabase: adminClient, authUserId: user.id, userId };
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

注意: `getApiAuth()` は従来 RLS 付きクライアントを返していたが、新設計では admin クライアント + `userId` フィルタをAPIレイヤーで行う。RLS はバックアップの多層防御。Production 環境でも Bearer トークンパスと cookie パスの両方で admin クライアントを使い、`userId` で `.eq("user_id", userId)` フィルタする。既存の全データAPIは元々 `getApiAuth().userId` で `.eq("user_id", userId)` していたため、変更は不要。

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit 2>&1 | grep "api.ts"`
Expected: エラーなし（api.ts自体は型エラーなし）

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/api.ts
git commit -m "refactor(auth): rewrite getApiAuth to use user_providers lookup"
```

---

## Task 5: POST /api/auth/resolve-session API

**Files:**
- Create: `src/app/api/auth/resolve-session/route.ts`

- [ ] **Step 1: resolve-session APIを実装**

`src/app/api/auth/resolve-session/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getApiAuthWithAuthUserId } from "@/lib/supabase/api";
import { extractProviderInfo } from "@/lib/auth-helpers";
import { getUserDataSummary } from "@/lib/user-data-summary";

/**
 * POST /api/auth/resolve-session
 *
 * ログイン後のユーザー解決。クライアントはbodyを送らない。
 * サーバーが JWT から auth_user_id を取得して処理する。
 *
 * 1. user_providers.auth_user_id で検索 → 見つかればユーザー返却
 * 2. provider_sub で検索 → 別ユーザーが見つかれば衝突検出
 * 3. 誰も見つからない → 新規ユーザー作成
 */
export async function POST(request: NextRequest) {
  const auth = await getApiAuthWithAuthUserId();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { supabase, authUserId, userId } = auth;

  // Case 1: auth_user_id で既存ユーザーが見つかった
  if (userId) {
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (user) {
      return NextResponse.json({ user, conflict: false });
    }
  }

  // auth_user_id で見つからない → メタデータからプロバイダ情報を取得
  const { data: { user: authUser } } = await supabase.auth.admin.getUserById(authUserId);
  if (!authUser) {
    return NextResponse.json({ error: "Auth user not found" }, { status: 500 });
  }

  const providerInfo = extractProviderInfo(authUser);
  if (!providerInfo) {
    return NextResponse.json({ error: "Cannot determine provider" }, { status: 400 });
  }

  // Case 2: provider_sub で既存ユーザーを検索
  const { data: existingProvider } = await supabase
    .from("user_providers")
    .select("user_id")
    .eq("provider", providerInfo.provider)
    .eq("provider_sub", providerInfo.providerSub)
    .maybeSingle();

  if (existingProvider) {
    // パターンA or B の判定はクライアントから hasLocalData を受け取って判定
    // ここではまず既存ユーザーの auth_user_id を更新
    // （端末Bで同じプロバイダでログインした場合 = パターンA）

    // request body に hasLocalData があれば衝突判定
    let hasLocalData = false;
    try {
      const body = await request.json();
      hasLocalData = body?.hasLocalData ?? false;
    } catch {
      // bodyなし = Web or ローカルデータなし
    }

    if (hasLocalData) {
      // パターンB: ローカルデータとの衝突
      const existingSummary = await getUserDataSummary(supabase, existingProvider.user_id);
      return NextResponse.json({
        conflict: true,
        existingUser: {
          userId: existingProvider.user_id,
          lastUpdated: existingSummary.lastUpdated,
          counts: existingSummary.counts,
        },
        provider: providerInfo.provider,
        providerSub: providerInfo.providerSub,
        authUserId,
      });
    }

    // パターンA: 単純紐づけ — auth_user_id を更新
    await supabase
      .from("user_providers")
      .update({ auth_user_id: authUserId })
      .eq("provider", providerInfo.provider)
      .eq("provider_sub", providerInfo.providerSub);

    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", existingProvider.user_id)
      .single();

    return NextResponse.json({ user, conflict: false });
  }

  // Case 3: 誰も見つからない → 新規ユーザー作成
  const displayName =
    authUser.user_metadata?.full_name ??
    authUser.user_metadata?.name ??
    authUser.user_metadata?.display_name ??
    authUser.email ??
    "ゲスト";

  const avatarUrl =
    authUser.user_metadata?.avatar_url ??
    authUser.user_metadata?.picture ??
    null;

  const googleEmail =
    providerInfo.provider === "google" ? (providerInfo.providerEmail ?? null) : null;

  const { data: newUser, error: userError } = await supabase
    .from("users")
    .insert({
      display_name: displayName,
      avatar_url: avatarUrl,
      google_email: googleEmail,
      agreed_terms_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (userError || !newUser) {
    console.error("[resolve-session] Failed to create user:", userError);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }

  // user_providers に行追加
  await supabase.from("user_providers").insert({
    user_id: newUser.id,
    provider: providerInfo.provider,
    auth_user_id: authUserId,
    provider_sub: providerInfo.providerSub,
    provider_email: providerInfo.providerEmail,
  });

  return NextResponse.json({ user: newUser, conflict: false, isNew: true });
}
```

- [ ] **Step 2: ビルド確認**

Run: `npx tsc --noEmit 2>&1 | grep "resolve-session"`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/resolve-session/route.ts
git commit -m "feat(auth): add resolve-session API for post-login user resolution"
```

---

## Task 6: resolve-session の衝突解決エンドポイント追加

**Files:**
- Modify: `src/app/api/auth/resolve-session/route.ts`

resolve-session に PUT メソッドを追加して衝突解決を処理する。

- [ ] **Step 1: PUT ハンドラを追加**

`src/app/api/auth/resolve-session/route.ts` に以下を追加:

```typescript
import { insertLocalData } from "@/lib/insert-local-data";
import { deleteUserData, deleteUserCompletely } from "@/lib/auth-helpers";

/**
 * PUT /api/auth/resolve-session
 *
 * resolve-session で検出された衝突を解決する。
 * choice: "local" → 既存ユーザーのデータ削除 + ローカルデータアップロード
 * choice: "server" → ローカル破棄、既存ユーザーにそのまま紐づけ
 */
export async function PUT(request: NextRequest) {
  const auth = await getApiAuthWithAuthUserId();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { supabase, authUserId } = auth;
  const body = await request.json();
  const { choice, existingUserId, provider, providerSub, localData } = body;

  if (!choice || !existingUserId || !provider || !providerSub) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (choice === "local" && localData) {
    // ローカル選択: 既存データ削除 → ローカルデータ挿入
    await deleteUserData(supabase, existingUserId);
    await insertLocalData(supabase, existingUserId, localData);
  }
  // choice === "server": 何もしない（既存データそのまま）

  // auth_user_id を既存ユーザーの user_providers に紐づけ
  await supabase
    .from("user_providers")
    .update({ auth_user_id: authUserId })
    .eq("provider", provider)
    .eq("provider_sub", providerSub);

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", existingUserId)
    .single();

  return NextResponse.json({ user, conflict: false });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/resolve-session/route.ts
git commit -m "feat(auth): add PUT handler for resolve-session conflict resolution"
```

---

## Task 7: POST/DELETE /api/auth/link-provider API

**Files:**
- Create: `src/app/api/auth/link-provider/route.ts`

- [ ] **Step 1: link-provider APIを実装**

`src/app/api/auth/link-provider/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import {
  getSupabaseAdmin,
  verifyGoogleIdToken,
  verifyLineAccessToken,
  exchangeLineCode,
  deleteUserData,
  deleteUserCompletely,
} from "@/lib/auth-helpers";
import { getUserDataSummary } from "@/lib/user-data-summary";

/**
 * POST /api/auth/link-provider
 *
 * プロバイダ連携。idToken/accessToken/code をサーバー側で検証して
 * provider_sub を取得し、user_providers に行追加。
 */
export async function POST(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { userId } = auth;

  const body = await request.json();
  const { provider, idToken, accessToken, code, redirectUri, confirmMerge, keepAccountId } = body;

  if (!provider) {
    return NextResponse.json({ error: "Missing provider" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Step 1: プロバイダトークンを検証して provider_sub を取得
  let providerSub: string | null = null;
  let providerEmail: string | null = null;

  if (provider === "google") {
    if (idToken) {
      const result = await verifyGoogleIdToken(idToken);
      if (!result) return NextResponse.json({ error: "Invalid Google ID token" }, { status: 401 });
      providerSub = result.sub;
      providerEmail = result.email ?? null;
    } else if (code) {
      // Google OAuth code exchange — callback route が処理するので
      // ここでは code は Google の場合使わない（Web は callback 経由）
      return NextResponse.json({ error: "Use OAuth callback for Google web linking" }, { status: 400 });
    }
  } else if (provider === "line") {
    if (accessToken) {
      const result = await verifyLineAccessToken(accessToken);
      if (!result) return NextResponse.json({ error: "Invalid LINE access token" }, { status: 401 });
      providerSub = result.userId;
    } else if (code && redirectUri) {
      const result = await exchangeLineCode(code, redirectUri);
      if (!result) return NextResponse.json({ error: "LINE code exchange failed" }, { status: 500 });
      providerSub = result.sub;
    }
  } else if (provider === "apple") {
    if (idToken) {
      // Apple ID token 検証 — Google と同じパターン
      // TODO: Apple 固有の検証。現時点では Apple Sign In SDK が
      // Supabase signInWithIdToken 経由で auth.users を作るため、
      // 連携時は resolve-session が処理する。
      return NextResponse.json({ error: "Apple linking uses sign-in flow" }, { status: 400 });
    }
  }

  if (!providerSub) {
    return NextResponse.json({ error: "Could not verify provider credentials" }, { status: 400 });
  }

  // Step 2: 衝突チェック — provider_sub が既に別ユーザーに紐づいてるか
  const { data: existingProvider } = await supabaseAdmin
    .from("user_providers")
    .select("user_id")
    .eq("provider", provider)
    .eq("provider_sub", providerSub)
    .maybeSingle();

  if (existingProvider && existingProvider.user_id !== userId) {
    // 衝突あり
    if (!confirmMerge) {
      // データサマリーを返して確認を求める
      const [currentSummary, existingSummary] = await Promise.all([
        getUserDataSummary(supabaseAdmin, userId),
        getUserDataSummary(supabaseAdmin, existingProvider.user_id),
      ]);

      return NextResponse.json({
        needsConfirm: true,
        providerId: providerSub,
        currentAccount: { id: userId, ...currentSummary },
        existingAccount: { id: existingProvider.user_id, ...existingSummary },
      });
    }

    // confirmMerge = true → マージ実行
    const deleteId = keepAccountId === userId ? existingProvider.user_id : userId;
    const keepId = keepAccountId === userId ? userId : existingProvider.user_id;

    // 敗者を完全削除
    await deleteUserCompletely(supabaseAdmin, deleteId);

    // 勝者にプロバイダ行追加（既存の衝突行は削除済み）
    await supabaseAdmin.from("user_providers").insert({
      user_id: keepId,
      provider,
      provider_sub: providerSub,
      provider_email: providerEmail,
    });

    return NextResponse.json({ linked: true, merged: true, mergedInto: keepId });
  }

  // 同じユーザーに既に紐づいてる場合
  if (existingProvider && existingProvider.user_id === userId) {
    return NextResponse.json({ linked: true, alreadyLinked: true });
  }

  // Step 3: 衝突なし → user_providers に行追加
  const { error } = await supabaseAdmin.from("user_providers").insert({
    user_id: userId,
    provider,
    provider_sub: providerSub,
    provider_email: providerEmail,
  });

  if (error) {
    console.error("[link-provider] Insert failed:", error);
    return NextResponse.json({ error: "Failed to link provider" }, { status: 500 });
  }

  // Google の場合、google_email を users テーブルにも保存
  if (provider === "google" && providerEmail) {
    await supabaseAdmin
      .from("users")
      .update({ google_email: providerEmail })
      .eq("id", userId);
  }

  return NextResponse.json({ linked: true });
}

/**
 * DELETE /api/auth/link-provider
 *
 * プロバイダ連携解除。
 */
export async function DELETE(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { userId } = auth;

  const { provider } = await request.json();
  if (!provider) {
    return NextResponse.json({ error: "Missing provider" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  // 最低1つのプロバイダが残るか検証
  const { data: providers } = await supabaseAdmin
    .from("user_providers")
    .select("id, provider, auth_user_id")
    .eq("user_id", userId);

  if (!providers || providers.length <= 1) {
    return NextResponse.json({ error: "最低1つのログイン方法が必要です" }, { status: 400 });
  }

  const targetProvider = providers.find((p) => p.provider === provider);
  if (!targetProvider) {
    return NextResponse.json({ error: "Provider not linked" }, { status: 404 });
  }

  // user_providers から行削除
  await supabaseAdmin
    .from("user_providers")
    .delete()
    .eq("id", targetProvider.id);

  // auth.users を削除（孤児防止）
  if (targetProvider.auth_user_id) {
    await supabaseAdmin.auth.admin.deleteUser(targetProvider.auth_user_id);
  }

  // 現在のセッションが解除対象か判定
  // （現在のJWTの auth_user_id が削除した provider の auth_user_id と同じなら再ログイン必要）
  const headersList = await import("next/headers").then((m) => m.headers());
  const authHeader = headersList.get("authorization");
  let currentAuthUserId: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    currentAuthUserId = user?.id ?? null;
  } else {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    currentAuthUserId = user?.id ?? null;
  }

  const needsRelogin = currentAuthUserId === targetProvider.auth_user_id;

  // Google 解除時は google_email もクリア
  if (provider === "google") {
    await supabaseAdmin
      .from("users")
      .update({ google_email: null })
      .eq("id", userId);
  }

  return NextResponse.json({ unlinked: true, needsRelogin });
}
```

- [ ] **Step 2: ビルド確認**

Run: `npx tsc --noEmit 2>&1 | grep "link-provider"`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/link-provider/route.ts
git commit -m "feat(auth): add link-provider API for provider linking/unlinking"
```

---

## Task 8: LINE認証APIを新スキーマに対応

**Files:**
- Modify: `src/app/api/auth/line/route.ts`
- Modify: `src/app/api/auth/line-oauth/route.ts`

- [ ] **Step 1: /api/auth/line を書き換え**

`src/app/api/auth/line/route.ts` — LIFF IDトークンを検証してセッション作成。新スキーマでは `user_providers` を使用:

```typescript
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin, verifyLineIdToken } from "@/lib/auth-helpers";

// Derive a deterministic password from LINE user ID + secret
function derivePassword(lineUserId: string): string {
  return crypto
    .createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!)
    .update(lineUserId)
    .digest("hex");
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  let lineUserId: string;
  let displayName: string;
  let avatarUrl: string | null = null;

  if (body.idToken) {
    const verified = await verifyLineIdToken(body.idToken);
    if (!verified) {
      return NextResponse.json({ error: "Invalid LINE token" }, { status: 401 });
    }
    lineUserId = verified.sub;
    displayName = body.displayName || verified.name;
    avatarUrl = body.avatarUrl || verified.picture || null;
  } else if (process.env.NODE_ENV === "development") {
    lineUserId = body.lineUserId;
    displayName = body.displayName;
    avatarUrl = body.avatarUrl ?? null;
  } else {
    return NextResponse.json({ error: "ID token required" }, { status: 400 });
  }

  if (!lineUserId || !displayName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const email = `${lineUserId}@line.waggly.app`;
  const password = derivePassword(lineUserId);

  // user_providers で既存ユーザーを検索
  const { data: existingProvider } = await supabaseAdmin
    .from("user_providers")
    .select("user_id, auth_user_id")
    .eq("provider", "line")
    .eq("provider_sub", lineUserId)
    .maybeSingle();

  let authUserId: string;

  if (existingProvider?.auth_user_id) {
    authUserId = existingProvider.auth_user_id;
    // プロフィール更新
    await supabaseAdmin
      .from("users")
      .update({ display_name: displayName, avatar_url: avatarUrl })
      .eq("id", existingProvider.user_id);
    // パスワード更新
    await supabaseAdmin.auth.admin.updateUserById(authUserId, { password });
  } else {
    // auth user 作成
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { line_user_id: lineUserId, display_name: displayName },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    authUserId = authUser.user.id;

    if (existingProvider) {
      // user_providers に auth_user_id を設定
      await supabaseAdmin
        .from("user_providers")
        .update({ auth_user_id: authUserId })
        .eq("provider", "line")
        .eq("provider_sub", lineUserId);
    }
    // 新規ユーザー作成は resolve-session が行うので、ここでは auth user のみ
    // ただし LIFF フローでは resolve-session を明示的に呼ばないため
    // 新規の場合はここで作成する
    if (!existingProvider) {
      const { data: newUser } = await supabaseAdmin
        .from("users")
        .insert({
          display_name: displayName,
          avatar_url: avatarUrl,
          agreed_terms_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (newUser) {
        await supabaseAdmin.from("user_providers").insert({
          user_id: newUser.id,
          provider: "line",
          auth_user_id: authUserId,
          provider_sub: lineUserId,
        });
      }
    }
  }

  // セッション生成
  const { data: { user: signInAuthUser } } = await supabaseAdmin.auth.admin.getUserById(authUserId);
  const signInEmail = signInAuthUser?.email ?? email;

  const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email: signInEmail,
    password,
  });

  if (signInError || !signInData.session) {
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }

  return NextResponse.json({
    access_token: signInData.session.access_token,
    refresh_token: signInData.session.refresh_token,
  });
}
```

- [ ] **Step 2: /api/auth/line-oauth も同様に更新**

既存の `src/app/api/auth/line-oauth/route.ts` を同じパターンで更新する。OAuth code exchange → `verifyLineIdToken` / `exchangeLineCode` → `user_providers` 使用に変更。`/api/auth/line` と同じロジックパターン。

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/line/route.ts src/app/api/auth/line-oauth/route.ts
git commit -m "refactor(auth): update LINE auth APIs to use user_providers"
```

---

## Task 9: auth callback を link-provider パターンに変更

**Files:**
- Modify: `src/app/auth/callback/route.ts`

- [ ] **Step 1: callback route を書き換え**

`src/app/auth/callback/route.ts` — Google連携のコールバック。`signInWithOAuth` のコード交換後、連携処理を `link-provider` パターンに変更:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/auth-helpers";
import { getUserDataSummary } from "@/lib/user-data-summary";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const link = searchParams.get("link");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      if (link === "google") {
        return handleGoogleLink(request, data.user, origin);
      }
      // 通常ログイン → auth-provider の resolve-session が処理
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}

/**
 * Google連携コールバック。
 * signInWithOAuth で作られた auth.users のセッションから
 * google_sub を取得し、user_providers で衝突チェック。
 */
async function handleGoogleLink(
  request: NextRequest,
  googleUser: any,
  origin: string
) {
  const { searchParams } = new URL(request.url);
  const originalUserId = searchParams.get("originalUser");
  const googleSub = googleUser.user_metadata?.sub ?? googleUser.id;
  const googleEmail = googleUser.user_metadata?.email ?? googleUser.email ?? null;

  if (!originalUserId) {
    return NextResponse.redirect(`${origin}/settings?error=missing_user`);
  }

  const supabaseAdmin = getSupabaseAdmin();

  // user_providers で衝突チェック
  const { data: existingProvider } = await supabaseAdmin
    .from("user_providers")
    .select("user_id")
    .eq("provider", "google")
    .eq("provider_sub", googleSub)
    .maybeSingle();

  if (existingProvider && existingProvider.user_id !== originalUserId) {
    // 衝突 → 設定ページに戻して選択UIを表示
    const [currentSummary, existingSummary] = await Promise.all([
      getUserDataSummary(supabaseAdmin, originalUserId),
      getUserDataSummary(supabaseAdmin, existingProvider.user_id),
    ]);

    const conflictInfo = JSON.stringify({
      scenario: "account-linking",
      provider: "google",
      providerSub: googleSub,
      sourceA: {
        label: "現在のアカウントのデータ",
        isNew: false,
        wid: originalUserId,
        lastUpdated: currentSummary.lastUpdated,
        counts: currentSummary.counts,
      },
      sourceB: {
        label: "Googleアカウントのデータ",
        isNew: true,
        wid: existingProvider.user_id,
        lastUpdated: existingSummary.lastUpdated,
        counts: existingSummary.counts,
      },
    });

    const response = NextResponse.redirect(`${origin}/settings?conflict=google`);
    response.cookies.set("conflict_info", encodeURIComponent(conflictInfo), {
      path: "/",
      maxAge: 300,
      httpOnly: false,
    });
    return response;
  }

  // 衝突なし → user_providers に行追加
  await supabaseAdmin.from("user_providers").insert({
    user_id: originalUserId,
    provider: "google",
    provider_sub: googleSub,
    provider_email: googleEmail,
    auth_user_id: googleUser.id,
  });

  // google_email を users にも保存
  if (googleEmail) {
    await supabaseAdmin
      .from("users")
      .update({ google_email: googleEmail })
      .eq("id", originalUserId);
  }

  return NextResponse.redirect(`${origin}/settings?linked=google`);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/auth/callback/route.ts
git commit -m "refactor(auth): update callback to use user_providers for Google linking"
```

---

## Task 10: auth-provider.tsx をシンプル化

**Files:**
- Modify: `src/components/auth-provider.tsx`

- [ ] **Step 1: auth-provider.tsx を書き換え**

`src/components/auth-provider.tsx` — resolve-session を呼ぶだけのシンプルな構造に:

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
        const supabase = createClient();

        // Development mode: dev user
        if (
          process.env.NODE_ENV === "development" &&
          process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === "true"
        ) {
          const { data: { user: realAuth } } = await supabase.auth.getUser();
          if (!realAuth) {
            if (localStorage.getItem("dev-logged-in") !== "false") {
              setUser({
                id: "dev-user",
                display_name: "開発ユーザー",
                avatar_url: null,
                google_email: null,
                agreed_terms_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
              });
            }
            setIsLoading(false);
            return;
          }
        }

        // Check for existing Supabase session
        const { data: { user: existingAuth } } = await supabase.auth.getUser();

        if (existingAuth) {
          // resolve-session を呼んでユーザーを解決
          const { apiFetch } = await import("@/lib/api-client");
          const res = await apiFetch("/api/auth/resolve-session", {
            method: "POST",
          });

          if (res.ok) {
            const result = await res.json();
            if (result.conflict) {
              // 衝突 → 設定ページの選択UIへ（native のみ）
              if (isNative()) {
                localStorage.setItem("conflict_info", JSON.stringify(result));
                // conflict_info は settings page が読む
              }
            } else if (result.user) {
              setUser(result.user);
            }
          }

          setIsLoading(false);
          return;
        }

        if (isNative()) {
          // Native: no session → local mode
          setIsLoading(false);
          return;
        }

        // Web: LIFF auth flow
        const { initLiff, getLiffProfile } = await import("@/lib/liff");
        const deepLink = await initLiff();

        const { liff } = await import("@/lib/liff");
        const isLiffClient = liff.isInClient();
        if (isLiffClient) {
          document.documentElement.classList.add("liff-client");
        }

        // 既にセッションがあれば（LIFF初期化後に取得できた場合）
        const { data: { user: postLiffAuth } } = await supabase.auth.getUser();
        if (postLiffAuth) {
          if (deepLink) router.replace(deepLink);
          setIsLoading(false);
          return;
        }

        if (!isLiffClient) {
          setIsLoading(false);
          return;
        }

        const { profile, idToken } = await getLiffProfile();

        const { apiFetch } = await import("@/lib/api-client");
        const res = await apiFetch("/api/auth/line", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idToken,
            displayName: profile.displayName,
            avatarUrl: profile.pictureUrl,
          }),
        });

        if (!res.ok) throw new Error("Auth failed");

        const { access_token, refresh_token } = await res.json();

        await supabase.auth.setSession({ access_token, refresh_token });

        // resolve-session でユーザー取得
        const resolveRes = await apiFetch("/api/auth/resolve-session", {
          method: "POST",
        });

        if (resolveRes.ok) {
          const result = await resolveRes.json();
          if (result.user) setUser(result.user);
        }

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

- [ ] **Step 2: Commit**

```bash
git add src/components/auth-provider.tsx
git commit -m "refactor(auth): simplify auth-provider to use resolve-session API"
```

---

## Task 11: native-auth.ts をシンプル化

**Files:**
- Modify: `src/lib/native-auth.ts`

- [ ] **Step 1: native-auth.ts を書き換え**

`src/lib/native-auth.ts` — signIn後に resolve-session を呼ぶだけに:

```typescript
import { createClient } from "@/lib/supabase/client";
import { registerPlugin } from "@capacitor/core";
import type { User } from "@/types/database";

interface NativeSignInResult {
  user: User | null;
  conflict: any | null;
  error: string | null;
}

interface LineLoginResult {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  accessToken?: string;
  idToken?: string;
}

interface LineLoginPlugin {
  login(options: { channelId: string }): Promise<LineLoginResult>;
}

const LineLogin = registerPlugin<LineLoginPlugin>("LineLogin");

/**
 * Sign in with Google on native platform.
 * signInWithIdToken → resolve-session で完結。
 */
export async function signInWithGoogle(): Promise<NativeSignInResult> {
  try {
    const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
    await GoogleAuth.initialize();
    const result = await GoogleAuth.signIn();
    const idToken = result.authentication.idToken;

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });

    if (error) return { user: null, conflict: null, error: error.message };

    return await resolveSessionAfterSignIn();
  } catch (e: any) {
    return { user: null, conflict: null, error: e.message ?? "Google sign-in failed" };
  }
}

/**
 * Sign in with Apple on native platform.
 */
export async function signInWithApple(): Promise<NativeSignInResult> {
  try {
    const { SignInWithApple } = await import("@capacitor-community/apple-sign-in");
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

    if (error) return { user: null, conflict: null, error: error.message };

    return await resolveSessionAfterSignIn();
  } catch (e: any) {
    return { user: null, conflict: null, error: e.message ?? "Apple sign-in failed" };
  }
}

/**
 * Native LINE login — アカウント連携用。
 * ログインではなく連携なので resolve-session は呼ばない。
 * accessToken を返し、settings ページが link-provider API に渡す。
 */
export async function nativeLineLogin(): Promise<{
  userId: string;
  displayName: string;
  pictureUrl?: string;
  accessToken?: string;
  error: string | null;
}> {
  try {
    const channelId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
    if (!channelId) throw new Error("LINE channel ID not configured");

    const result = await LineLogin.login({ channelId });
    return {
      userId: result.userId,
      displayName: result.displayName,
      pictureUrl: result.pictureUrl,
      accessToken: result.accessToken,
      error: null,
    };
  } catch (e: any) {
    return { userId: "", displayName: "", error: e.message ?? "LINE login failed" };
  }
}

/**
 * signIn 後に resolve-session を呼んでユーザーを解決する。
 * 全プロバイダ共通。
 */
async function resolveSessionAfterSignIn(): Promise<NativeSignInResult> {
  const { apiFetch, resetLocalModeCache } = await import("@/lib/api-client");
  const { getLocalDataSummary, collectLocalData, fullSync } = await import("@/lib/sync");

  resetLocalModeCache();

  // ローカルデータの有無を確認
  const localSummary = await getLocalDataSummary();
  const hasLocalData =
    localSummary.counts.clubs > 0 ||
    localSummary.counts.practices > 0 ||
    localSummary.counts.accessories > 0;

  // resolve-session を呼ぶ
  const res = await apiFetch("/api/auth/resolve-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hasLocalData }),
  });

  if (!res.ok) {
    return { user: null, conflict: null, error: "resolve-session failed" };
  }

  const result = await res.json();

  if (result.conflict) {
    // 衝突情報を返す（settings ページが選択UIを表示）
    return {
      user: null,
      conflict: {
        ...result,
        localSummary,
      },
      error: null,
    };
  }

  // 衝突なし → ローカルデータがあればアップロード
  if (hasLocalData && result.isNew) {
    const localData = await collectLocalData();
    await apiFetch("/api/auth/upload-local-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ localData }),
    });
  }

  // サーバーからフルSync
  await fullSync();

  return { user: result.user, conflict: null, error: null };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/native-auth.ts
git commit -m "refactor(auth): simplify native-auth to use resolve-session"
```

---

## Task 12: 設定ページ AccountLinking を新API対応に

**Files:**
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1: AccountLinking コンポーネントを書き換え**

`src/app/settings/page.tsx` の `AccountLinking` コンポーネントを更新:
- `link-provider` API を使用
- LINE連携: native は `nativeLineLogin()` → `accessToken` を `link-provider` に送信
- Google連携: Web は OAuth redirect（callback で処理）
- 解除: `DELETE /api/auth/link-provider` → `needsRelogin` で再ログイン制御

```typescript
function AccountLinking({ user, onUpdate, onConflict }: { user: User; onUpdate: () => void; onConflict: (info: any) => void }) {
  const [providers, setProviders] = useState<{ provider: string; provider_email?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // user_providers からリンク済みプロバイダを取得
    apiFetch("/api/auth/providers")
      .then((r) => r.ok ? r.json() : [])
      .then(setProviders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hasLine = providers.some((p) => p.provider === "line");
  const hasGoogle = providers.some((p) => p.provider === "google");
  const canUnlink = providers.length >= 2;

  async function unlinkProvider(provider: "line" | "google") {
    if (!confirm(`${provider === "line" ? "LINE" : "Google"}の連携を解除しますか？`)) return;
    const res = await apiFetch("/api/auth/link-provider", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    if (res.ok) {
      const result = await res.json();
      if (result.needsRelogin) {
        const { createClient } = await import("@/lib/supabase/client");
        createClient().auth.signOut();
        window.location.href = "/";
        return;
      }
      onUpdate();
    } else {
      const err = await res.json();
      alert(err.error || "解除に失敗しました");
    }
  }

  async function linkLine() {
    if (isNative()) {
      const { nativeLineLogin } = await import("@/lib/native-auth");
      const result = await nativeLineLogin();
      if (result.error) {
        if (!result.error.includes("cancel")) alert(result.error);
        return;
      }
      // link-provider に accessToken を送信（サーバー側で検証）
      const res = await apiFetch("/api/auth/link-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "line",
          accessToken: result.accessToken,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "連携に失敗しました");
        return;
      }
      const linkResult = await res.json();
      if (linkResult.needsConfirm) {
        handleLinkConflict("line", linkResult);
        return;
      }
      window.location.href = "/settings";
      return;
    }

    // Web: LINE OAuth redirect
    const channelId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/line/callback?link=1`);
    const state = crypto.randomUUID();
    window.location.href = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${redirectUri}&state=${state}&scope=openid%20profile`;
  }

  async function linkGoogle() {
    // Web: signInWithOAuth でGoogleリダイレクト → callback で link-provider 処理
    sessionStorage.setItem("link_original_user", user.id);
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?link=google&originalUser=${user.id}`,
        queryParams: { prompt: "select_account" },
      },
    });
  }

  function handleLinkConflict(provider: string, linkResult: any) {
    const currentIsNewer = true; // デフォルト値、実際のタイムスタンプ比較は省略
    onConflict({
      scenario: "account-linking",
      provider,
      sourceA: {
        label: "現在のアカウントのデータ",
        isNew: currentIsNewer,
        wid: user.id,
        lastUpdated: linkResult.currentAccount.lastUpdated,
        counts: linkResult.currentAccount.counts,
      },
      sourceB: {
        label: `${provider === "google" ? "Google" : "LINE"}アカウントのデータ`,
        isNew: !currentIsNewer,
        wid: linkResult.existingAccount.id,
        lastUpdated: linkResult.existingAccount.lastUpdated,
        counts: linkResult.existingAccount.counts,
      },
    });
  }

  const googleEmail = user.google_email ?? providers.find((p) => p.provider === "google")?.provider_email;

  return (
    <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
      <div className="flex items-center justify-between py-2 border-b border-[#ececec]">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#06C755"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
          <span className="text-base">LINE</span>
        </div>
        {hasLine ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#006728] font-bold">連携済み</span>
            {canUnlink && (
              <button onClick={() => unlinkProvider("line")} className="text-xs text-[#8b8b8b] border border-[#c4c4c4] rounded-full px-2.5 py-0.5">解除</button>
            )}
          </div>
        ) : (
          <button onClick={linkLine} className="text-sm font-bold text-[#006728] border border-[#006728] rounded-full px-3 py-1">連携する</button>
        )}
      </div>
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          <span className="text-base">Google</span>
        </div>
        {hasGoogle ? (
          <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#006728] font-bold shrink-0">連携済み</span>
              {canUnlink && (
                <button onClick={() => unlinkProvider("google")} className="text-xs text-[#8b8b8b] border border-[#c4c4c4] rounded-full px-2.5 py-0.5 shrink-0">解除</button>
              )}
            </div>
            {googleEmail && <span className="text-xs text-[#8b8b8b]">{googleEmail}</span>}
          </div>
        ) : (
          <button onClick={linkGoogle} className="text-sm font-bold text-[#006728] border border-[#006728] rounded-full px-3 py-1">連携する</button>
        )}
      </div>
    </div>
  );
}
```

注意: `AccountLinking` が `user_providers` からプロバイダ一覧を取得するため、軽量な API が必要。

- [ ] **Step 2: プロバイダ一覧APIを追加**

`src/app/api/auth/providers/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { getSupabaseAdmin } from "@/lib/auth-helpers";

export async function GET() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();

  const supabaseAdmin = getSupabaseAdmin();
  const { data } = await supabaseAdmin
    .from("user_providers")
    .select("provider, provider_email")
    .eq("user_id", auth.userId);

  return NextResponse.json(data ?? []);
}
```

- [ ] **Step 3: 設定ページのサインインUI更新**

設定ページの未ログイン時のサインインUIで `signInWithGoogle` の結果ハンドリングを更新。
`result.error === "__CONFLICT__"` パターンを `result.conflict` に変更:

```typescript
// 設定ページのサインインボタン onClick 内
const { signInWithGoogle } = await import("@/lib/native-auth");
const result = await signInWithGoogle();
if (result.conflict) {
  // conflict info を保存して選択UIを表示
  const conflictInfo = {
    scenario: "first-signin",
    ...result.conflict,
    sourceA: {
      label: "ローカルのデータ",
      isNew: true,
      wid: null,
      lastUpdated: result.conflict.localSummary.lastUpdated,
      counts: result.conflict.localSummary.counts,
    },
    sourceB: {
      label: "サーバーのデータ",
      isNew: false,
      wid: result.conflict.existingUser.userId,
      lastUpdated: result.conflict.existingUser.lastUpdated,
      counts: result.conflict.existingUser.counts,
    },
  };
  setConflictInfo(conflictInfo);
  setSigningIn(false);
  return;
}
if (result.user) {
  setUser?.(result.user);
  window.location.href = "/";
}
```

- [ ] **Step 4: 衝突解決UIのAPI呼び出しを更新**

衝突解決の確認ボタン（`conflictConfirm` ダイアログ内）のAPI呼び出しを `resolve-session PUT` に変更:

```typescript
// 衝突解決の確認ボタン onClick 内
const source = conflictSelected === "a" ? conflictInfo.sourceA : conflictInfo.sourceB;
const isLocal = source.wid === null;

const resolveBody: any = {
  choice: isLocal ? "local" : "server",
  existingUserId: conflictInfo.existingUser?.userId ?? conflictInfo.sourceB.wid,
  provider: conflictInfo.provider,
  providerSub: conflictInfo.providerSub ?? conflictInfo.existingUser?.providerSub,
};

if (isLocal) {
  const { collectLocalData } = await import("@/lib/sync");
  resolveBody.localData = await collectLocalData();
}

const res = await apiFetch("/api/auth/resolve-session", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(resolveBody),
});
```

- [ ] **Step 5: Commit**

```bash
git add src/app/settings/page.tsx src/app/api/auth/providers/route.ts
git commit -m "refactor(auth): update settings page to use link-provider and providers APIs"
```

---

## Task 13: SQLiteスキーマリセット

**Files:**
- Modify: `src/lib/sqlite/schema.ts`

- [ ] **Step 1: スキーマバージョンをリセット**

`src/lib/sqlite/schema.ts` — `user_id` の参照先が変わるだけで、ローカルテーブル構造自体は変わらない。ただしスキーマバージョンをリセットして既存データをクリアする:

```typescript
/** Schema version — increment when adding migrations. */
export const SCHEMA_VERSION = 4;

export const SCHEMA_V4 = `
-- Auth redesign: ローカルデータをリセット
-- user_id は新しい独自UUIDになるため、既存データは無効
DELETE FROM clubs;
DELETE FROM club_memos;
DELETE FROM club_images;
DELETE FROM accessories;
DELETE FROM practice_sessions;
DELETE FROM practice_clubs;
DELETE FROM maintenances;
DELETE FROM pending_sync;
DELETE FROM sync_meta;
`;

// 既存のマイグレーション（V1-V3）はそのまま維持
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/sqlite/schema.ts
git commit -m "refactor(sqlite): add V4 migration to reset local data for auth redesign"
```

---

## Task 14: 旧APIの削除 + クリーンアップ

**Files:**
- Delete: `src/app/api/auth/resolve-google-user/route.ts`
- Delete: `src/app/api/auth/check-conflict/route.ts`
- Delete: `src/app/api/auth/resolve-conflict/route.ts`
- Delete: `src/app/api/auth/link/route.ts`

- [ ] **Step 1: 旧APIファイルを削除**

```bash
rm src/app/api/auth/resolve-google-user/route.ts
rm src/app/api/auth/check-conflict/route.ts
rm src/app/api/auth/resolve-conflict/route.ts
rm src/app/api/auth/link/route.ts
rmdir src/app/api/auth/resolve-google-user
rmdir src/app/api/auth/check-conflict
rmdir src/app/api/auth/resolve-conflict
rmdir src/app/api/auth/link
```

- [ ] **Step 2: 旧APIへの参照がないか確認**

Run: `grep -r "resolve-google-user\|check-conflict\|resolve-conflict\|/api/auth/link" src/ --include="*.ts" --include="*.tsx" -l`

Expected: 参照が残っていないこと。Task 10-12 で既に更新済み。残っていれば修正。

- [ ] **Step 3: resolve-conflict ページを削除（あれば）**

```bash
rm -rf src/app/auth/resolve-conflict
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(auth): remove deprecated auth APIs (resolve-google-user, check-conflict, resolve-conflict, link)"
```

---

## Task 15: ビルド + 型チェック + テスト

**Files:** 全体

- [ ] **Step 1: TypeScript型チェック**

Run: `npx tsc --noEmit`

Expected: エラーなし。エラーがあれば修正。
よくある修正:
- `user.line_user_id` → 削除（参照箇所を探して除去）
- `user.google_id` → 削除（`user.google_email` はまだ存在）
- auth-provider/native-auth の旧ロジック残り

- [ ] **Step 2: 全テスト実行**

Run: `npx vitest run`

Expected: 既存テストが通ること。`api-client.test.ts` の dev ユーザーモック等でUser型が変わった影響があれば修正。

- [ ] **Step 3: lint/ビルド確認**

Run: `npm run build 2>&1 | tail -20`

Expected: ビルド成功。

- [ ] **Step 4: 修正があればCommit**

```bash
git add -A
git commit -m "fix: resolve type errors and test failures from auth redesign"
```

---

## Task 16: データAPI全体の userId 使用状況監査

**Files:** `src/app/api/**/*.ts`

- [ ] **Step 1: 全APIでgetApiAuth().userIdの使い方を確認**

Run: `grep -r "getApiAuth" src/app/api/ --include="*.ts" -l`

各APIファイルを確認し、以下を検証:
- `auth.userId` を `user_id` フィルタに使っていること ✓
- `auth.userId` を `auth.users.id` として直接使っていないこと
- クライアントからの `userId` 自己申告を信頼していないこと

Expected: 既存のデータAPI（clubs, practice, accessories等）は元々 `.eq("user_id", auth.userId)` パターンなので変更不要。`getApiAuth()` が `users.id` を返すよう変更済みなので自動的に正しくなる。

- [ ] **Step 2: profiles 関連のAPIを確認**

profiles テーブルは `id = users.id` を PK とする。profile作成時に `id: auth.userId` としていた箇所を確認し、`id: userId`（= `users.id`）に修正されていることを確認。

Run: `grep -rn "profiles" src/app/api/ --include="*.ts" | grep -v node_modules`

- [ ] **Step 3: storage アップロードのフォルダ名確認**

Storage にアップロードする際のフォルダ名が `auth.uid()` ベースであることを確認。
`getApiAuth()` が返す `userId` は `users.id` なので、storage パスに使う場合は `auth_user_id` が必要。

Run: `grep -rn "storage\|upload\|foldername" src/app/api/ --include="*.ts" | head -20`

ストレージアップロードのパスに `userId` を使っている箇所は、JWT の `auth.uid()` が RLS で自動適用されるため、クライアント直接アップロードなら問題なし。API経由のアップロードなら admin client を使うため RLS は適用されないが、フォルダ名の整合性は確認。

- [ ] **Step 4: 問題があれば修正してCommit**

```bash
git add -A
git commit -m "fix: audit and fix userId usage across all data APIs"
```

---

## 実装順序の依存関係

```
Task 1 (types) ─────────────────────┐
Task 2 (migration) ─────────────────┤
Task 3 (auth-helpers) ──────────────┤
                                     ├─→ Task 4 (getApiAuth) ─┐
                                     │                         ├─→ Task 5-6 (resolve-session)
                                     │                         ├─→ Task 7 (link-provider)
                                     │                         ├─→ Task 8 (LINE APIs)
                                     │                         ├─→ Task 9 (callback)
                                     │                         │
Task 5-9 完了後 ──────────────────────────────────────────────→ Task 10 (auth-provider)
                                                                Task 11 (native-auth)
                                                                Task 12 (settings)
                                                                Task 13 (SQLite)
                                                                Task 14 (削除)
                                                                Task 15 (ビルド確認)
                                                                Task 16 (監査)
```

Task 1-3 は並行実行可能。Task 4 は 1-3 に依存。Task 5-9 は 4 に依存。Task 10-16 は 5-9 に依存。
