# ゴルファー名刺（プロフィール共有）実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wagglyユーザーが自分のゴルフ情報を公開プロフィールページとしてシェアできる「ゴルファー名刺」機能を実装する。

**Architecture:** Supabaseに `profiles` と `favorite_courses` テーブルを追加し、設定画面からプロフィール情報を入力。`/p/[username]` で非ログインユーザーにも公開可能なページを提供。QRコードとURLコピーでシェア。

**Tech Stack:** Next.js 16 (App Router), Supabase (PostgreSQL + Storage + RLS), React 19, Tailwind CSS 4, qrcode (npm package, 新規追加)

**重要:** このプロジェクトは Next.js 16 を使用しています。API の書き方やファイル構成が通常と異なる場合があります。コードを書く前に `node_modules/next/dist/docs/` のガイドを確認してください。

---

## ファイル構成

### 新規作成

| ファイル | 責務 |
|---|---|
| `supabase/migrations/007_profiles_and_favorite_courses.sql` | DB マイグレーション |
| `src/types/profile.ts` | Profile, FavoriteCourse 型定義 |
| `src/app/api/profile/route.ts` | プロフィール CRUD API |
| `src/app/api/profile/avatar/route.ts` | アバター画像アップロード API |
| `src/app/api/profile/username/check/route.ts` | ユーザー名重複チェック API |
| `src/app/api/favorite-courses/route.ts` | お気に入りコース CRUD API |
| `src/app/settings/profile/page.tsx` | プロフィール設定ページ |
| `src/app/settings/profile/courses/page.tsx` | お気に入りコース設定ページ |
| `src/app/settings/share/page.tsx` | 共有設定ページ |
| `src/app/p/[username]/page.tsx` | 公開プロフィールページ |
| `src/components/profile/profile-form.tsx` | プロフィール入力フォーム |
| `src/components/profile/course-picker.tsx` | コース検索＆選択コンポーネント |
| `src/components/profile/share-settings.tsx` | 共有設定コンポーネント |
| `src/components/profile/public-profile.tsx` | 公開プロフィール表示コンポーネント |
| `src/components/profile/qr-code-modal.tsx` | QRコードモーダル |
| `src/lib/profile.ts` | ユーザー名バリデーション等のユーティリティ |

### 変更

| ファイル | 変更内容 |
|---|---|
| `src/app/settings/page.tsx` | プロフィール・共有設定へのリンクを追加 |
| `src/types/database.ts` | Profile, FavoriteCourse 型を re-export |
| `src/app/layout.tsx` | `/p/` ルートでは AppShell（ボトムナビ）を非表示にする対応 |

---

## Task 1: DB マイグレーション

**Files:**
- Create: `supabase/migrations/007_profiles_and_favorite_courses.sql`

- [ ] **Step 1: マイグレーションファイルを作成**

```sql
-- Profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  nickname text,
  avatar_url text,
  golf_experience_years integer,
  average_score integer,
  best_score integer,
  home_course text,
  bio text,
  sns_links jsonb default '{}',
  is_public boolean not null default false,
  visible_fields jsonb not null default '{
    "nickname": true,
    "avatar": true,
    "golf_experience_years": true,
    "average_score": true,
    "best_score": true,
    "home_course": true,
    "bio": true,
    "sns_links": true,
    "bag": true,
    "favorite_courses": true
  }',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Username validation: 3-20 chars, alphanumeric + hyphen + underscore
alter table public.profiles add constraint profiles_username_format
  check (username ~ '^[a-zA-Z0-9_-]{3,20}$');

alter table public.profiles enable row level security;

-- Owner can do anything with their own profile
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Anyone can read public profiles (for /p/[username])
create policy "Public profiles are readable by everyone" on public.profiles
  for select using (is_public = true);

create index profiles_username_idx on public.profiles(username);

-- Favorite courses table
create table public.favorite_courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  gora_course_id integer,
  course_name text not null,
  course_image_url text,
  evaluation numeric,
  address text,
  is_manual boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.favorite_courses enable row level security;

-- Owner can CRUD own favorite courses
create policy "Users can CRUD own favorite courses" on public.favorite_courses
  for all using (auth.uid() = user_id);

-- Anyone can read favorite courses of public profiles
create policy "Public favorite courses are readable" on public.favorite_courses
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = favorite_courses.user_id
      and profiles.is_public = true
    )
  );

create index favorite_courses_user_id_idx on public.favorite_courses(user_id);

-- Storage bucket for profile avatars
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
create policy "Users can upload avatars" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "Anyone can read avatars" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "Users can delete own avatars" on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
```

- [ ] **Step 2: Supabase にマイグレーションを適用**

```bash
npx supabase db push
```

もしくは Supabase ダッシュボードの SQL Editor でマイグレーション SQL を実行。

- [ ] **Step 3: コミット**

```bash
git add supabase/migrations/007_profiles_and_favorite_courses.sql
git commit -m "feat: add profiles and favorite_courses tables with RLS"
```

---

## Task 2: 型定義

**Files:**
- Create: `src/types/profile.ts`
- Modify: `src/types/database.ts`

- [ ] **Step 1: Profile 型定義ファイルを作成**

```typescript
// src/types/profile.ts

export interface Profile {
  id: string;
  username: string | null;
  nickname: string | null;
  avatar_url: string | null;
  golf_experience_years: number | null;
  average_score: number | null;
  best_score: number | null;
  home_course: string | null;
  bio: string | null;
  sns_links: SnsLinks;
  is_public: boolean;
  visible_fields: VisibleFields;
  created_at: string;
  updated_at: string;
}

export interface SnsLinks {
  instagram?: string;
  x?: string;
  line?: string;
}

export interface VisibleFields {
  nickname: boolean;
  avatar: boolean;
  golf_experience_years: boolean;
  average_score: boolean;
  best_score: boolean;
  home_course: boolean;
  bio: boolean;
  sns_links: boolean;
  bag: boolean;
  favorite_courses: boolean;
}

export interface FavoriteCourse {
  id: string;
  user_id: string;
  gora_course_id: number | null;
  course_name: string;
  course_image_url: string | null;
  evaluation: number | null;
  address: string | null;
  is_manual: boolean;
  sort_order: number;
  created_at: string;
}

/** Public profile with related data for /p/[username] */
export interface PublicProfileData {
  profile: Profile;
  clubs: Array<{
    category: string;
    club_number: string;
    maker: string | null;
    model: string | null;
  }>;
  favorite_courses: FavoriteCourse[];
}

/** Reserved usernames that cannot be used */
export const RESERVED_USERNAMES = [
  "admin", "settings", "api", "p", "auth", "login", "logout",
  "signup", "register", "profile", "share", "coach", "practice",
  "courses", "items", "bag", "privacy", "terms", "about", "help",
];

/** Username validation regex: 3-20 chars, alphanumeric + hyphen + underscore */
export const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,20}$/;
```

- [ ] **Step 2: database.ts に re-export を追加**

`src/types/database.ts` の末尾に追加:

```typescript
// Profile types
export type { Profile, FavoriteCourse, SnsLinks, VisibleFields, PublicProfileData } from "./profile";
```

- [ ] **Step 3: コミット**

```bash
git add src/types/profile.ts src/types/database.ts
git commit -m "feat: add Profile and FavoriteCourse type definitions"
```

---

## Task 3: ユーティリティ関数

**Files:**
- Create: `src/lib/profile.ts`

- [ ] **Step 1: プロフィール関連ユーティリティを作成**

```typescript
// src/lib/profile.ts

import { RESERVED_USERNAMES, USERNAME_REGEX } from "@/types/profile";

/**
 * Validate a username string.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateUsername(username: string): string | null {
  if (!username) return "ユーザー名を入力してください";
  if (username.length < 3) return "3文字以上で入力してください";
  if (username.length > 20) return "20文字以内で入力してください";
  if (!USERNAME_REGEX.test(username)) return "英数字・ハイフン・アンダースコアのみ使用できます";
  if (RESERVED_USERNAMES.includes(username.toLowerCase())) return "このユーザー名は使用できません";
  return null;
}

/** Default visible_fields value (all true) */
export const DEFAULT_VISIBLE_FIELDS = {
  nickname: true,
  avatar: true,
  golf_experience_years: true,
  average_score: true,
  best_score: true,
  home_course: true,
  bio: true,
  sns_links: true,
  bag: true,
  favorite_courses: true,
};
```

- [ ] **Step 2: コミット**

```bash
git add src/lib/profile.ts
git commit -m "feat: add username validation and profile utilities"
```

---

## Task 4: プロフィール API

**Files:**
- Create: `src/app/api/profile/route.ts`
- Create: `src/app/api/profile/avatar/route.ts`
- Create: `src/app/api/profile/username/check/route.ts`

- [ ] **Step 1: プロフィール CRUD API を作成**

```typescript
// src/app/api/profile/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { validateUsername } from "@/lib/profile";

export async function GET() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    // No profile yet — return null
    return NextResponse.json(null);
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const body = await request.json();

  // Validate username if provided
  if (body.username !== undefined && body.username !== null) {
    const usernameError = validateUsername(body.username);
    if (usernameError) {
      return NextResponse.json({ error: usernameError }, { status: 400 });
    }
  }

  // Ensure is_public requires username
  if (body.is_public && !body.username) {
    return NextResponse.json(
      { error: "公開するにはユーザー名の設定が必要です" },
      { status: 400 }
    );
  }

  const updateData = { ...body, updated_at: new Date().toISOString() };

  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...updateData })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "このユーザー名は既に使用されています" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
```

- [ ] **Step 2: ユーザー名重複チェック API を作成**

```typescript
// src/app/api/profile/username/check/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { validateUsername } from "@/lib/profile";

export async function GET(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const username = request.nextUrl.searchParams.get("username") ?? "";

  const validationError = validateUsername(username);
  if (validationError) {
    return NextResponse.json({ available: false, error: validationError });
  }

  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username.toLowerCase())
    .neq("id", userId)
    .limit(1);

  const available = !data || data.length === 0;
  return NextResponse.json({ available });
}
```

- [ ] **Step 3: アバター画像アップロード API を作成**

```typescript
// src/app/api/profile/avatar/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

export async function POST(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const filePath = `${userId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

  // Update profile with new avatar URL
  await supabase
    .from("profiles")
    .upsert({ id: userId, avatar_url: urlData.publicUrl, updated_at: new Date().toISOString() });

  return NextResponse.json({ avatar_url: urlData.publicUrl });
}
```

- [ ] **Step 4: コミット**

```bash
git add src/app/api/profile/route.ts src/app/api/profile/avatar/route.ts src/app/api/profile/username/check/route.ts
git commit -m "feat: add profile CRUD, avatar upload, and username check APIs"
```

---

## Task 5: お気に入りコース API

**Files:**
- Create: `src/app/api/favorite-courses/route.ts`

- [ ] **Step 1: お気に入りコース CRUD API を作成**

```typescript
// src/app/api/favorite-courses/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

export async function GET() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { data, error } = await supabase
    .from("favorite_courses")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const body = await request.json();

  // Get current max sort_order
  const { data: existing } = await supabase
    .from("favorite_courses")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from("favorite_courses")
    .insert({
      user_id: userId,
      gora_course_id: body.gora_course_id ?? null,
      course_name: body.course_name,
      course_image_url: body.course_image_url ?? null,
      evaluation: body.evaluation ?? null,
      address: body.address ?? null,
      is_manual: body.is_manual ?? false,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabase
    .from("favorite_courses")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: コミット**

```bash
git add src/app/api/favorite-courses/route.ts
git commit -m "feat: add favorite courses CRUD API"
```

---

## Task 6: プロフィール設定ページ

**Files:**
- Create: `src/components/profile/profile-form.tsx`
- Create: `src/app/settings/profile/page.tsx`

- [ ] **Step 1: プロフィール入力フォームコンポーネントを作成**

`src/components/profile/profile-form.tsx` — ニックネーム、アバター画像アップロード、ゴルフ歴、平均スコア、ベストスコア、ホームコース、ひとこと、SNSリンク（Instagram, X, LINE）の入力フォーム。

主要な仕様:
- 既存の設定ページと同じスタイル（白カード、グリーン背景、`text-sm font-bold`）
- アバター画像: クリックでファイル選択 → `/api/profile/avatar` にアップロード → プレビュー表示
- SNSリンクはアコーディオンで折りたたみ可
- フォーム送信で `/api/profile` に PUT リクエスト
- 保存成功時にトースト or 「保存しました」表示
- 既存の `PageHeader` コンポーネントを使用（バック付き）
- ページ下部に「お気に入りコース」へのリンクを配置

コンポーネント内の状態管理:
- `useEffect` で `/api/profile` から既存データを取得
- `useState` でフォーム各フィールドを管理
- 送信時に差分のみ PUT

- [ ] **Step 2: プロフィール設定ページを作成**

```typescript
// src/app/settings/profile/page.tsx
"use client";

import { ProfileForm } from "@/components/profile/profile-form";

export default function ProfileSettingsPage() {
  return <ProfileForm />;
}
```

- [ ] **Step 3: 動作確認**

ブラウザで `/settings/profile` にアクセス。
- フォームが表示されること
- 各フィールドに入力して保存できること
- アバター画像がアップロードできること
- リロードしてもデータが保持されていること

- [ ] **Step 4: コミット**

```bash
git add src/components/profile/profile-form.tsx src/app/settings/profile/page.tsx
git commit -m "feat: add profile settings page with form"
```

---

## Task 7: お気に入りコース設定ページ

**Files:**
- Create: `src/components/profile/course-picker.tsx`
- Create: `src/app/settings/profile/courses/page.tsx`

- [ ] **Step 1: コース検索＆選択コンポーネントを作成**

`src/components/profile/course-picker.tsx` — 2つの登録モードを持つコンポーネント。

**楽天GORA検索モード:**
- テキスト入力でキーワード検索（既存の `/api/courses` を使用）
- 検索結果をカード表示（画像、コース名、住所、評価）
- カードをタップで `favorite_courses` に追加

**手動入力モード:**
- 「手動で追加」ボタンでテキスト入力フィールドを表示
- コース名を入力して追加

**選択済みリスト:**
- 追加済みコースを一覧表示
- 各コースに削除ボタン
- ドラッグで並び替え（任意、初期実装では不要）

**UI パターン:**
- 既存のコース検索ページ (`/courses`) のスタイルを参考にする
- 白カード + グリーン背景のレイアウト
- `PageHeader` でバック付きヘッダー

- [ ] **Step 2: お気に入りコース設定ページを作成**

```typescript
// src/app/settings/profile/courses/page.tsx
"use client";

import { CoursePicker } from "@/components/profile/course-picker";

export default function FavoriteCoursesPage() {
  return <CoursePicker />;
}
```

- [ ] **Step 3: 動作確認**

ブラウザで `/settings/profile/courses` にアクセス。
- 楽天GORAでコース検索して追加できること
- 手動でコース名を入力して追加できること
- 追加済みコースが一覧表示されること
- コースを削除できること

- [ ] **Step 4: コミット**

```bash
git add src/components/profile/course-picker.tsx src/app/settings/profile/courses/page.tsx
git commit -m "feat: add favorite course picker with GORA search and manual input"
```

---

## Task 8: 共有設定ページ

**Files:**
- Create: `src/components/profile/share-settings.tsx`
- Create: `src/app/settings/share/page.tsx`

- [ ] **Step 1: 共有設定コンポーネントを作成**

`src/components/profile/share-settings.tsx` — 3つのセクションを持つ設定画面。

**セクション 1: ユーザー名設定**
- テキスト入力 + リアルタイムバリデーション（`validateUsername`）
- 入力が止まって500ms後に `/api/profile/username/check` で重複チェック（debounce）
- 利用可能なら緑のチェックマーク、NGなら赤のエラーメッセージ
- `waggly.jp/p/{username}` のプレビュー表示

**セクション 2: 名刺共有 ON/OFF**
- トグルスイッチ（ユーザー名が未設定の場合は disabled + 「先にユーザー名を設定してください」）
- ON にすると項目別の公開設定が表示される

**セクション 3: 項目別公開/非公開（名刺 ON の場合のみ表示）**
- `visible_fields` の各項目をトグルスイッチで切り替え
- 項目: ニックネーム、アバター、ゴルフ歴、平均スコア、ベストスコア、ホームコース、ひとこと、SNSリンク、バッグ、お気に入りコース

**セクション 4: シェア（名刺 ON の場合のみ表示）**
- 「プレビュー」リンク → `/p/{username}` を新しいタブで開く
- 「リンクをコピー」ボタン → `navigator.clipboard.writeText`
- 「QRコードを表示」ボタン → QRコードモーダルを開く

変更は即座に `/api/profile` に PUT で保存（auto-save パターン、debounce 付き）。

- [ ] **Step 2: 共有設定ページを作成**

```typescript
// src/app/settings/share/page.tsx
"use client";

import { ShareSettings } from "@/components/profile/share-settings";

export default function ShareSettingsPage() {
  return <ShareSettings />;
}
```

- [ ] **Step 3: 動作確認**

ブラウザで `/settings/share` にアクセス。
- ユーザー名を設定して重複チェックが動くこと
- 名刺共有の ON/OFF が切り替わること
- 項目別の公開/非公開トグルが動くこと

- [ ] **Step 4: コミット**

```bash
git add src/components/profile/share-settings.tsx src/app/settings/share/page.tsx
git commit -m "feat: add share settings page with username, visibility toggles"
```

---

## Task 9: QRコードモーダル

**Files:**
- Create: `src/components/profile/qr-code-modal.tsx`

- [ ] **Step 1: qrcode パッケージをインストール**

```bash
npm install qrcode @types/qrcode
```

- [ ] **Step 2: QRコードモーダルコンポーネントを作成**

`src/components/profile/qr-code-modal.tsx` — モーダルで QR コードを表示。

主要な仕様:
- `qrcode` ライブラリで canvas に描画
- Waggly ブランドカラー（`#006728` foreground, `#ffffff` background）
- QR コードの下に `waggly.jp/p/{username}` のテキスト表示
- 「画像を保存」ボタン → canvas を PNG としてダウンロード
- モーダルの開閉は props で制御（`isOpen`, `onClose`）
- バックドロップクリックで閉じる

```typescript
// src/components/profile/qr-code-modal.tsx

"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { X } from "lucide-react";

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

export function QrCodeModal({ isOpen, onClose, username }: QrCodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const url = `https://waggly.jp/p/${username}`;

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 240,
      margin: 2,
      color: { dark: "#006728", light: "#ffffff" },
    });
  }, [isOpen, url]);

  if (!isOpen) return null;

  function handleDownload() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `waggly-${username}-qr.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 mx-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold">QRコード</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-[#8b8b8b]" /></button>
        </div>
        <div className="flex flex-col items-center gap-3">
          <canvas ref={canvasRef} />
          <p className="text-xs text-[#8b8b8b]">{url}</p>
          <button
            onClick={handleDownload}
            className="w-full rounded-lg bg-[#006728] py-2.5 text-sm font-bold text-white"
          >
            画像を保存
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Task 8 の share-settings.tsx に QRコードモーダルを統合**

`share-settings.tsx` で `QrCodeModal` をインポートし、「QRコードを表示」ボタンから `isOpen` を制御。

- [ ] **Step 4: 動作確認**

- QRコードが表示されること
- Waggly グリーンカラーで描画されること
- 「画像を保存」で PNG がダウンロードされること
- バックドロップクリックで閉じること

- [ ] **Step 5: コミット**

```bash
git add src/components/profile/qr-code-modal.tsx src/components/profile/share-settings.tsx package.json package-lock.json
git commit -m "feat: add QR code modal with Waggly branding"
```

---

## Task 10: 公開プロフィールページ

**Files:**
- Create: `src/components/profile/public-profile.tsx`
- Create: `src/app/p/[username]/page.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: 公開プロフィール API エンドポイントを確認**

公開プロフィールページは Server Component として実装し、Supabase から直接データを取得する（API route を経由しない）。これにより OGP メタタグの動的生成が可能になる。

- [ ] **Step 2: 公開プロフィールページを作成**

```typescript
// src/app/p/[username]/page.tsx

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PublicProfile } from "@/components/profile/public-profile";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, bio, avatar_url")
    .eq("username", username)
    .eq("is_public", true)
    .single();

  if (!profile) return { title: "Not Found" };

  const title = `${profile.nickname ?? username} | Waggly`;
  const description = profile.bio ?? `${profile.nickname ?? username}のゴルファープロフィール`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(profile.avatar_url ? { images: [profile.avatar_url] } : {}),
    },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .eq("is_public", true)
    .single();

  if (!profile) notFound();

  // Fetch clubs (bag only, sorted)
  const { data: clubs } = await supabase
    .from("clubs")
    .select("category, club_number, maker, model, sort_order")
    .eq("user_id", profile.id)
    .eq("status", "bag")
    .order("sort_order", { ascending: true });

  // Fetch favorite courses
  const { data: favoriteCourses } = await supabase
    .from("favorite_courses")
    .select("*")
    .eq("user_id", profile.id)
    .order("sort_order", { ascending: true });

  return (
    <PublicProfile
      profile={profile}
      clubs={clubs ?? []}
      favoriteCourses={favoriteCourses ?? []}
    />
  );
}
```

- [ ] **Step 3: 公開プロフィール表示コンポーネントを作成**

`src/components/profile/public-profile.tsx` — ページ型レイアウトの表示コンポーネント。

主要な仕様:
- `visible_fields` に基づいて各セクションの表示/非表示を制御
- ヘッダー: グリーン背景（`#006728`）にアバター、ニックネーム、ひとこと
- ゴルフ情報カード: 白カードに ゴルフ歴 / 平均スコア / ベストスコア を横並び
- MY BAG: クラブ一覧をカテゴリごとにグループ化（Driver → FW → UT → Iron → Wedge → Putter）
- お気に入りコース: GORA 連携コースは画像・評価付きカード、手動コースはテキスト行
- SNSリンク: アイコン付きリンクボタン（外部リンク、`target="_blank"`）
- フッター: 「Wagglyで作成」+ Waggly ロゴ + 誘導リンク
- ボトムナビは非表示（このページはアプリ外からのアクセスのため）

- [ ] **Step 4: layout.tsx でボトムナビの出し分けを対応**

`src/app/layout.tsx` または `src/components/app-shell.tsx` で、`/p/` パスの場合にボトムナビゲーションを非表示にする。具体的には `usePathname()` を使い `/p/` で始まるパスをチェック。

あるいは、`src/app/p/[username]/layout.tsx` を作成して、AppShell を使わない独自レイアウトにする方法もある。既存の layout.tsx の構造を確認して最適な方法を選択する。

- [ ] **Step 5: 動作確認**

- ユーザー名を設定して名刺を公開 ON にした状態で `/p/{username}` にアクセス
- 各セクションが表示されること
- 非公開にした項目が表示されないこと
- `is_public: false` のユーザーの URL にアクセスすると 404 になること
- OGP メタタグが正しく設定されていること（LINE でシェアしてプレビュー確認）

- [ ] **Step 6: コミット**

```bash
git add src/app/p/[username]/page.tsx src/components/profile/public-profile.tsx src/app/layout.tsx
git commit -m "feat: add public profile page with OGP and visibility control"
```

---

## Task 11: 設定ページにリンクを追加

**Files:**
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1: 設定ページにプロフィール・共有リンクを追加**

`src/app/settings/page.tsx` のプロフィールカード（Line 53-65）の下に、2つの新しいセクションへのリンクを追加。

既存の法的情報リンク（Line 122-134）と同じパターンで:

```tsx
{/* プロフィール・共有 */}
<p className="text-base font-bold text-white px-1 pt-4">プロフィール</p>
<div className="rounded-lg bg-white p-3">
  <div className="flex flex-col">
    {[
      { href: "/settings/profile", label: "プロフィール設定" },
      { href: "/settings/profile/courses", label: "お気に入りコース" },
      { href: "/settings/share", label: "名刺共有" },
    ].map((item, i, arr) => (
      <Link key={item.href} href={item.href}>
        <div className={`flex items-center gap-2.5 py-2.5 ${i < arr.length - 1 ? "border-b border-[#dfdfdf]" : ""}`}>
          <span className="flex-1 text-sm font-bold">{item.label}</span>
          <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-60" />
        </div>
      </Link>
    ))}
  </div>
</div>
```

このブロックを、既存のプロフィールカード（`{/* プロフィール */}` セクション）の直後、`{/* プラン */}` セクションの前に挿入する。

- [ ] **Step 2: 動作確認**

- 設定ページに「プロフィール」セクションが表示されること
- 各リンクをタップして正しいページに遷移すること

- [ ] **Step 3: コミット**

```bash
git add src/app/settings/page.tsx
git commit -m "feat: add profile and share links to settings page"
```

---

## Task 12: 最終結合テスト

- [ ] **Step 1: エンドツーエンドのフロー確認**

以下の一連のフローを手動で確認:

1. `/settings` → 「プロフィール設定」をタップ
2. `/settings/profile` → 各項目を入力して保存
3. `/settings/profile` → 「お気に入りコース」をタップ
4. `/settings/profile/courses` → 楽天GORAで検索して追加 + 手動で1件追加
5. `/settings` → 「名刺共有」をタップ
6. `/settings/share` → ユーザー名を設定 → 名刺共有をONにする
7. `/settings/share` → 一部項目を非公開にする
8. `/settings/share` → 「プレビュー」で公開ページを確認
9. `/settings/share` → 「リンクをコピー」でURLをコピー
10. `/settings/share` → 「QRコード」を表示して画像保存
11. シークレットウィンドウで `/p/{username}` にアクセスし、非ログインで閲覧できることを確認
12. 非公開にした項目が表示されていないことを確認
13. LINEにURLを送ってOGPプレビューが表示されることを確認

- [ ] **Step 2: エッジケース確認**

- ユーザー名未設定で `/p/` にアクセス → 404
- `is_public: false` のユーザーの `/p/{username}` → 404
- 存在しないユーザー名 → 404
- 予約語のユーザー名を設定しようとする → エラーメッセージ
- 重複するユーザー名 → エラーメッセージ

- [ ] **Step 3: 最終コミット（必要に応じて修正をコミット）**

```bash
git add -A
git commit -m "fix: final adjustments for golfer card feature"
```
