# ゴルファーカード (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ゴルファー名刺機能を実装し、プロフィール設定 → 公開ページ生成 → URL/QRシェアの一連のフローを提供する

**Architecture:** Supabase に profiles / favorite_courses テーブルを追加。プロフィール設定は /settings/profile、共有設定は /settings/share に配置。公開ページは /p/[username] で非認証ユーザーも閲覧可能。QRコードはクライアントサイド生成。

**Tech Stack:** Next.js, Supabase (DB + Storage + RLS), SWR, qrcode (npm), lucide-react

**Spec:** `docs/superpowers/specs/2026-06-09-golfer-card-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/migrations/012_golfer_card.sql` | Create | profiles + favorite_courses テーブル、RLS |
| `src/types/database.ts` | Modify | Profile, FavoriteCourse 型追加 |
| `src/app/api/profile/route.ts` | Create | GET/PUT 自分のプロフィール |
| `src/app/api/profile/avatar/route.ts` | Create | POST アバターアップロード |
| `src/app/api/profile/username/route.ts` | Create | POST ユーザー名重複チェック |
| `src/app/api/profile/courses/route.ts` | Create | GET/POST/DELETE お気に入りコース |
| `src/app/api/p/[username]/route.ts` | Create | GET 公開プロフィール（認証不要） |
| `src/hooks/use-profile.ts` | Create | SWR hook for profile + courses |
| `src/app/settings/profile/page.tsx` | Create | プロフィール設定ページ |
| `src/app/settings/profile/courses/page.tsx` | Create | お気に入りコース設定ページ |
| `src/app/settings/share/page.tsx` | Create | 共有設定ページ（ユーザー名、公開設定、QR） |
| `src/app/p/[username]/page.tsx` | Create | 公開プロフィールページ（SSR wrapper） |
| `src/app/p/[username]/page-client.tsx` | Create | 公開プロフィール表示（クライアント） |
| `src/app/settings/page.tsx` | Modify | プロフィール・共有設定へのリンク追加 |

---

### Task 1: DBマイグレーション + 型定義

**Files:**
- Create: `supabase/migrations/012_golfer_card.sql`
- Modify: `src/types/database.ts`

- [ ] **Step 1: Create Supabase migration**

Create `supabase/migrations/012_golfer_card.sql`:

```sql
-- Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  nickname text,
  avatar_url text,
  golf_experience_years integer,
  average_score integer,
  best_score integer,
  home_course text,
  bio text,
  sns_links jsonb DEFAULT '{}',
  is_public boolean NOT NULL DEFAULT false,
  visible_fields jsonb DEFAULT '{"nickname":true,"golf_experience_years":true,"average_score":true,"best_score":true,"home_course":true,"bio":true,"bag":true,"favorite_courses":true,"sns_links":true}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Owner can do anything
CREATE POLICY "Users can CRUD own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Anyone can read public profiles
CREATE POLICY "Public profiles are readable" ON public.profiles
  FOR SELECT USING (is_public = true);

CREATE INDEX profiles_username_idx ON public.profiles(username);

-- Favorite courses table
CREATE TABLE public.favorite_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gora_course_id integer,
  course_name text NOT NULL,
  course_image_url text,
  evaluation numeric,
  address text,
  is_manual boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.favorite_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own favorite courses" ON public.favorite_courses
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public favorite courses are readable" ON public.favorite_courses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = favorite_courses.user_id
      AND profiles.is_public = true
    )
  );

CREATE INDEX favorite_courses_user_id_idx ON public.favorite_courses(user_id);

-- Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatars are publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
```

- [ ] **Step 2: Add TypeScript types**

Add to `src/types/database.ts` after the existing interfaces:

```typescript
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
  sns_links: { instagram?: string; x?: string; line?: string };
  is_public: boolean;
  visible_fields: Record<string, boolean>;
  created_at: string;
  updated_at: string;
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
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/012_golfer_card.sql src/types/database.ts
git commit -m "feat: add profiles and favorite_courses tables for golfer card"
```

---

### Task 2: プロフィール API ルート

**Files:**
- Create: `src/app/api/profile/route.ts`
- Create: `src/app/api/profile/avatar/route.ts`
- Create: `src/app/api/profile/username/route.ts`

- [ ] **Step 1: Create profile GET/PUT API**

Create `src/app/api/profile/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

export async function GET() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  // Upsert to ensure profile exists
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const body = await request.json();
  // Only allow updating safe fields
  const allowed = [
    "nickname", "golf_experience_years", "average_score", "best_score",
    "home_course", "bio", "sns_links", "is_public", "visible_fields",
  ];
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  // If turning public ON, require username
  if (updates.is_public === true) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();
    if (!profile?.username) {
      return NextResponse.json({ error: "ユーザー名を設定してください" }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 2: Create avatar upload API**

Create `src/app/api/profile/avatar/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

export async function POST(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const formData = await request.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const ext = file.name.split(".").pop() || "jpg";
  const filePath = `${userId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 3: Create username check/set API**

Create `src/app/api/profile/username/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

const RESERVED = ["admin", "settings", "api", "p", "auth", "login", "signup", "profile", "new", "edit"];
const USERNAME_RE = /^[a-zA-Z0-9_-]{3,20}$/;

export async function POST(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { username } = await request.json();

  if (!username || !USERNAME_RE.test(username)) {
    return NextResponse.json({ error: "3〜20文字の英数字・ハイフン・アンダースコアで入力してください" }, { status: 400 });
  }
  if (RESERVED.includes(username.toLowerCase())) {
    return NextResponse.json({ error: "このユーザー名は使用できません" }, { status: 400 });
  }

  // Check availability
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", userId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "このユーザー名は既に使われています" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ username, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/profile/
git commit -m "feat: add profile API routes (CRUD, avatar upload, username)"
```

---

### Task 3: お気に入りコース API

**Files:**
- Create: `src/app/api/profile/courses/route.ts`

- [ ] **Step 1: Create favorite courses API**

Create `src/app/api/profile/courses/route.ts`:

```typescript
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

  // Get next sort_order
  const { count } = await supabase
    .from("favorite_courses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

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
      sort_order: count ?? 0,
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

  const { id } = await request.json();

  const { error } = await supabase
    .from("favorite_courses")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/profile/courses/route.ts
git commit -m "feat: add favorite courses API (GET, POST, DELETE)"
```

---

### Task 4: 公開プロフィール API

**Files:**
- Create: `src/app/api/p/[username]/route.ts`

- [ ] **Step 1: Create public profile API (no auth)**

Create `src/app/api/p/[username]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  // Use service role or anon key — no auth required
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .eq("is_public", true)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch favorite courses
  const { data: courses } = await supabase
    .from("favorite_courses")
    .select("*")
    .eq("user_id", profile.id)
    .order("sort_order", { ascending: true });

  // Fetch club bag (public data)
  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, category, club_number, maker, model, club_images(image_url, is_primary)")
    .eq("user_id", profile.id)
    .eq("status", "bag")
    .order("sort_order", { ascending: true });

  // Filter by visible_fields
  const vf = profile.visible_fields ?? {};
  const publicProfile: Record<string, any> = {
    username: profile.username,
    avatar_url: profile.avatar_url,
  };
  if (vf.nickname !== false) publicProfile.nickname = profile.nickname;
  if (vf.bio !== false) publicProfile.bio = profile.bio;
  if (vf.golf_experience_years !== false) publicProfile.golf_experience_years = profile.golf_experience_years;
  if (vf.average_score !== false) publicProfile.average_score = profile.average_score;
  if (vf.best_score !== false) publicProfile.best_score = profile.best_score;
  if (vf.home_course !== false) publicProfile.home_course = profile.home_course;
  if (vf.sns_links !== false) publicProfile.sns_links = profile.sns_links;
  if (vf.bag !== false) publicProfile.clubs = clubs ?? [];
  if (vf.favorite_courses !== false) publicProfile.courses = courses ?? [];

  return NextResponse.json(publicProfile);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/p/
git commit -m "feat: add public profile API endpoint (no auth required)"
```

---

### Task 5: Profile hooks

**Files:**
- Create: `src/hooks/use-profile.ts`

- [ ] **Step 1: Create profile and courses hooks**

Create `src/hooks/use-profile.ts`:

```typescript
"use client";

import useSWR, { mutate } from "swr";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-client";
import { isNative } from "@/lib/platform";
import type { Profile, FavoriteCourse } from "@/types/database";

async function fetcher(url: string) {
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function useProfile() {
  const { user } = useAuth();
  const key = (user || isNative()) ? "/api/profile" : null;
  const { data, isLoading, mutate: refetch } = useSWR<Profile>(key, fetcher);
  return { profile: data ?? null, isLoading, refetch };
}

export async function updateProfile(data: Partial<Profile>): Promise<Profile> {
  const res = await apiFetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to update profile");
  }
  const updated = await res.json();
  mutate("/api/profile");
  return updated;
}

export async function setUsername(username: string): Promise<Profile> {
  const res = await apiFetch("/api/profile/username", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to set username");
  }
  const updated = await res.json();
  mutate("/api/profile");
  return updated;
}

export async function uploadAvatar(file: File): Promise<Profile> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiFetch("/api/profile/avatar", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload avatar");
  const updated = await res.json();
  mutate("/api/profile");
  return updated;
}

export function useFavoriteCourses() {
  const { user } = useAuth();
  const key = (user || isNative()) ? "/api/profile/courses" : null;
  const { data, isLoading, mutate: refetch } = useSWR<FavoriteCourse[]>(key, fetcher);
  return { courses: data ?? [], isLoading, refetch };
}

export async function addFavoriteCourse(course: Partial<FavoriteCourse>): Promise<FavoriteCourse> {
  const res = await apiFetch("/api/profile/courses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(course),
  });
  if (!res.ok) throw new Error("Failed to add course");
  mutate("/api/profile/courses");
  return res.json();
}

export async function removeFavoriteCourse(id: string): Promise<void> {
  await apiFetch("/api/profile/courses", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  mutate("/api/profile/courses");
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-profile.ts
git commit -m "feat: add useProfile and useFavoriteCourses hooks"
```

---

### Task 6: プロフィール設定ページ

**Files:**
- Create: `src/app/settings/profile/page.tsx`
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1: Create profile settings page**

Create `src/app/settings/profile/page.tsx`:

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/hooks/use-auth";
import { useProfile, updateProfile, uploadAvatar } from "@/hooks/use-profile";
import { Loading } from "@/components/loading";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const inputClass = "w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]";
const labelClass = "text-sm";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, isLoading } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState({
    nickname: "",
    golf_experience_years: null as number | null,
    average_score: null as number | null,
    best_score: null as number | null,
    home_course: "",
    bio: "",
    sns_links: { instagram: "", x: "", line: "" },
  });

  useEffect(() => {
    if (profile) {
      setForm({
        nickname: profile.nickname ?? "",
        golf_experience_years: profile.golf_experience_years,
        average_score: profile.average_score,
        best_score: profile.best_score,
        home_course: profile.home_course ?? "",
        bio: profile.bio ?? "",
        sns_links: {
          instagram: profile.sns_links?.instagram ?? "",
          x: profile.sns_links?.x ?? "",
          line: profile.sns_links?.line ?? "",
        },
      });
    }
  }, [profile]);

  if (!user) return null;
  if (isLoading) return <Loading />;

  function update(field: string, value: string | number | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await uploadAvatar(file);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const snsLinks: Record<string, string> = {};
      if (form.sns_links.instagram) snsLinks.instagram = form.sns_links.instagram;
      if (form.sns_links.x) snsLinks.x = form.sns_links.x;
      if (form.sns_links.line) snsLinks.line = form.sns_links.line;

      await updateProfile({
        nickname: form.nickname || null,
        golf_experience_years: form.golf_experience_years,
        average_score: form.average_score,
        best_score: form.best_score,
        home_course: form.home_course || null,
        bio: form.bio || null,
        sns_links: snsLinks as any,
      });
      router.back();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col space-y-2">
        <PageHeader title="プロフィール設定" variant="dark" />

        {/* Avatar */}
        <h3 className="px-1 pt-2 text-base font-bold text-white">写真</h3>
        <div className="flex flex-col gap-2 rounded-lg bg-white p-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-[#006728] text-white text-xl">
                  {(profile?.nickname ?? user.display_name ?? "?")[0]}
                </AvatarFallback>
              </Avatar>
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full border border-[#006728] px-4 py-1.5 text-sm font-bold text-[#006728]"
            >
              変更
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
          </div>
        </div>

        {/* Basic info */}
        <h3 className="px-1 pt-2 text-base font-bold text-white">基本情報</h3>
        <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
          <div className="flex flex-col gap-0.5 py-1">
            <span className={labelClass}>ニックネーム</span>
            <input value={form.nickname} onChange={(e) => update("nickname", e.target.value)} placeholder="表示名" className={inputClass} />
          </div>
          <div className="flex flex-col gap-0.5 py-1">
            <span className={labelClass}>ひとこと</span>
            <textarea value={form.bio} onChange={(e) => update("bio", e.target.value)} placeholder="自己紹介..." rows={3} maxLength={140} className={inputClass} />
            <span className="text-xs text-[#8b8b8b] text-right">{form.bio.length}/140</span>
          </div>
        </div>

        {/* Golf info */}
        <h3 className="px-1 pt-2 text-base font-bold text-white">ゴルフ情報</h3>
        <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
          <div className="flex flex-col gap-0.5 py-1">
            <span className={labelClass}>ゴルフ歴（年）</span>
            <input type="number" value={form.golf_experience_years ?? ""} onChange={(e) => update("golf_experience_years", e.target.value ? Number(e.target.value) : null)} className={inputClass} />
          </div>
          <div className="flex flex-col gap-0.5 py-1">
            <span className={labelClass}>平均スコア</span>
            <input type="number" value={form.average_score ?? ""} onChange={(e) => update("average_score", e.target.value ? Number(e.target.value) : null)} className={inputClass} />
          </div>
          <div className="flex flex-col gap-0.5 py-1">
            <span className={labelClass}>ベストスコア</span>
            <input type="number" value={form.best_score ?? ""} onChange={(e) => update("best_score", e.target.value ? Number(e.target.value) : null)} className={inputClass} />
          </div>
          <div className="flex flex-col gap-0.5 py-1">
            <span className={labelClass}>ホームコース</span>
            <input value={form.home_course} onChange={(e) => update("home_course", e.target.value)} placeholder="" className={inputClass} />
          </div>
        </div>

        {/* SNS */}
        <h3 className="px-1 pt-2 text-base font-bold text-white">SNS</h3>
        <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
          <div className="flex flex-col gap-0.5 py-1">
            <span className={labelClass}>Instagram</span>
            <input value={form.sns_links.instagram} onChange={(e) => setForm((p) => ({ ...p, sns_links: { ...p.sns_links, instagram: e.target.value } }))} placeholder="https://instagram.com/..." className={inputClass} />
          </div>
          <div className="flex flex-col gap-0.5 py-1">
            <span className={labelClass}>X (Twitter)</span>
            <input value={form.sns_links.x} onChange={(e) => setForm((p) => ({ ...p, sns_links: { ...p.sns_links, x: e.target.value } }))} placeholder="https://x.com/..." className={inputClass} />
          </div>
          <div className="flex flex-col gap-0.5 py-1">
            <span className={labelClass}>LINE</span>
            <input value={form.sns_links.line} onChange={(e) => setForm((p) => ({ ...p, sns_links: { ...p.sns_links, line: e.target.value } }))} placeholder="LINE ID" className={inputClass} />
          </div>
        </div>

        {/* Save */}
        <div className="flex flex-col items-center gap-2 px-6 pt-4 pb-2">
          <button onClick={handleSave} disabled={isSaving} className="w-full max-w-xs rounded-full bg-white py-2.5 text-base font-bold text-[#006728] disabled:opacity-50">
            {isSaving ? "保存中..." : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add link to settings page**

In `src/app/settings/page.tsx`, add a link to the profile settings. Find the section after the avatar/display name area and add navigation links:

```tsx
<Link href="/settings/profile">
  <div className="flex items-center justify-between py-3 border-b border-[#ececec]">
    <span className="text-base">プロフィール設定</span>
    <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-60" />
  </div>
</Link>
<Link href="/settings/profile/courses">
  <div className="flex items-center justify-between py-3 border-b border-[#ececec]">
    <span className="text-base">お気に入りコース</span>
    <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-60" />
  </div>
</Link>
<Link href="/settings/share">
  <div className="flex items-center justify-between py-3 border-b border-[#ececec]">
    <span className="text-base">名刺・共有設定</span>
    <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-60" />
  </div>
</Link>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/settings/profile/page.tsx src/app/settings/page.tsx
git commit -m "feat: add profile settings page with avatar, info, SNS"
```

---

### Task 7: お気に入りコース設定ページ

**Files:**
- Create: `src/app/settings/profile/courses/page.tsx`

- [ ] **Step 1: Create favorite courses settings page**

Create `src/app/settings/profile/courses/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Search, Plus, X, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/hooks/use-auth";
import { useFavoriteCourses, addFavoriteCourse, removeFavoriteCourse } from "@/hooks/use-profile";
import { apiFetch } from "@/lib/api-client";
import { Loading } from "@/components/loading";

const inputClass = "w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]";

interface GoraCourse {
  golfCourseId: number;
  golfCourseName: string;
  address: string;
  golfCourseImageUrl: string;
  evaluation: number;
}

export default function FavoriteCoursesPage() {
  const { user } = useAuth();
  const { courses, isLoading, refetch } = useFavoriteCourses();
  const [keyword, setKeyword] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GoraCourse[]>([]);
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState("");

  if (!user) return null;

  async function handleSearch() {
    if (!keyword.trim()) return;
    setSearching(true);
    try {
      const res = await apiFetch(`/api/courses?keyword=${encodeURIComponent(keyword)}`);
      const data = await res.json();
      setResults(data.Items ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleAddGora(course: GoraCourse) {
    await addFavoriteCourse({
      gora_course_id: course.golfCourseId,
      course_name: course.golfCourseName,
      course_image_url: course.golfCourseImageUrl,
      evaluation: course.evaluation,
      address: course.address,
      is_manual: false,
    });
    setResults([]);
    setKeyword("");
    refetch();
  }

  async function handleAddManual() {
    if (!manualName.trim()) return;
    await addFavoriteCourse({
      course_name: manualName,
      is_manual: true,
    });
    setManualName("");
    setShowManual(false);
    refetch();
  }

  async function handleRemove(id: string) {
    await removeFavoriteCourse(id);
    refetch();
  }

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col space-y-2">
        <PageHeader title="お気に入りコース" variant="dark" />

        {/* Registered courses */}
        <h3 className="px-1 pt-2 text-base font-bold text-white">登録済み</h3>
        <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
          {isLoading ? (
            <Loading />
          ) : courses.length === 0 ? (
            <p className="py-4 text-center text-sm text-[#8b8b8b]">まだ登録されていません</p>
          ) : (
            courses.map((c) => (
              <div key={c.id} className="flex items-center gap-2 py-2 border-b border-[#ececec] last:border-0">
                {c.course_image_url && (
                  <img src={c.course_image_url} alt="" className="h-10 w-14 rounded object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{c.course_name}</p>
                  {c.address && <p className="text-xs text-[#8b8b8b] truncate">{c.address}</p>}
                </div>
                <button onClick={() => handleRemove(c.id)} className="shrink-0 p-1 text-[#8b8b8b]">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Search */}
        <h3 className="px-1 pt-2 text-base font-bold text-white">コースを追加</h3>
        <div className="flex flex-col gap-2 rounded-lg bg-white p-3">
          <div className="flex gap-2">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="コース名で検索..."
              className={inputClass}
            />
            <button onClick={handleSearch} disabled={searching} className="shrink-0 rounded-lg bg-[#006728] px-3 py-2 text-white">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </button>
          </div>

          {results.length > 0 && (
            <div className="flex flex-col max-h-60 overflow-y-auto">
              {results.map((r) => (
                <button
                  key={r.golfCourseId}
                  onClick={() => handleAddGora(r)}
                  className="flex items-center gap-2 py-2 border-b border-[#ececec] text-left"
                >
                  {r.golfCourseImageUrl && (
                    <img src={r.golfCourseImageUrl} alt="" className="h-10 w-14 rounded object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{r.golfCourseName}</p>
                    <p className="text-xs text-[#8b8b8b] truncate">{r.address}</p>
                  </div>
                  <Plus className="h-4 w-4 shrink-0 text-[#006728]" />
                </button>
              ))}
            </div>
          )}

          {/* Manual add */}
          {showManual ? (
            <div className="flex gap-2 pt-2 border-t border-[#ececec]">
              <input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="コース名を入力" className={inputClass} />
              <button onClick={handleAddManual} className="shrink-0 rounded-lg bg-[#006728] px-3 py-2 text-sm font-bold text-white">追加</button>
            </div>
          ) : (
            <button onClick={() => setShowManual(true)} className="pt-2 text-sm text-[#006728] font-bold text-left border-t border-[#ececec]">
              手動で入力する
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/settings/profile/courses/page.tsx
git commit -m "feat: add favorite courses settings page with GORA search"
```

---

### Task 8: 共有設定ページ

**Files:**
- Create: `src/app/settings/share/page.tsx`

- [ ] **Step 1: Create share settings page**

Create `src/app/settings/share/page.tsx`:

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Copy, Loader2, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/hooks/use-auth";
import { useProfile, updateProfile, setUsername as setUsernameApi } from "@/hooks/use-profile";
import { Loading } from "@/components/loading";

const inputClass = "w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]";

const VISIBLE_FIELD_LABELS: Record<string, string> = {
  nickname: "ニックネーム",
  golf_experience_years: "ゴルフ歴",
  average_score: "平均スコア",
  best_score: "ベストスコア",
  home_course: "ホームコース",
  bio: "ひとこと",
  bag: "MY BAG",
  favorite_courses: "お気に入りコース",
  sns_links: "SNSリンク",
};

export default function ShareSettingsPage() {
  const { user } = useAuth();
  const { profile, isLoading, refetch } = useProfile();
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.username) setUsername(profile.username);
  }, [profile]);

  if (!user) return null;
  if (isLoading) return <Loading />;

  const profileUrl = profile?.username ? `https://waggly.jp/p/${profile.username}` : null;

  async function handleSaveUsername() {
    setUsernameError("");
    setIsSavingUsername(true);
    try {
      await setUsernameApi(username);
      refetch();
    } catch (err: any) {
      setUsernameError(err.message);
    } finally {
      setIsSavingUsername(false);
    }
  }

  async function handleTogglePublic() {
    try {
      await updateProfile({ is_public: !profile?.is_public });
      refetch();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function toggleField(field: string) {
    const current = profile?.visible_fields ?? {};
    const updated = { ...current, [field]: current[field] === false ? true : false };
    await updateProfile({ visible_fields: updated });
    refetch();
  }

  function handleCopy() {
    if (!profileUrl) return;
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShowQR() {
    if (!profileUrl) return;
    const QRCode = (await import("qrcode")).default;
    const url = await QRCode.toDataURL(profileUrl, {
      width: 256,
      margin: 2,
      color: { dark: "#006728", light: "#ffffff" },
    });
    setQrUrl(url);
  }

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col space-y-2">
        <PageHeader title="名刺・共有設定" variant="dark" />

        {/* Username */}
        <h3 className="px-1 pt-2 text-base font-bold text-white">ユーザー名</h3>
        <div className="flex flex-col gap-2 rounded-lg bg-white p-3">
          <p className="text-xs text-[#8b8b8b]">公開ページのURLに使われます（英数字・ハイフン・アンダースコア、3〜20文字）</p>
          <div className="flex gap-2">
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" className={inputClass} />
            <button
              onClick={handleSaveUsername}
              disabled={isSavingUsername || username === profile?.username}
              className="shrink-0 rounded-lg bg-[#006728] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {isSavingUsername ? <Loader2 className="h-4 w-4 animate-spin" /> : "設定"}
            </button>
          </div>
          {usernameError && <p className="text-xs text-red-500">{usernameError}</p>}
          {profile?.username && (
            <p className="text-xs text-[#8b8b8b]">URL: waggly.jp/p/{profile.username}</p>
          )}
        </div>

        {/* Public toggle */}
        <h3 className="px-1 pt-2 text-base font-bold text-white">公開設定</h3>
        <div className="flex flex-col gap-2 rounded-lg bg-white p-3">
          <div className="flex items-center justify-between">
            <span className="text-base">名刺を公開する</span>
            <button
              onClick={handleTogglePublic}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                profile?.is_public ? "bg-[#006728]" : "bg-gray-300"
              }`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                profile?.is_public ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>
          {!profile?.username && (
            <p className="text-xs text-amber-600">公開するにはユーザー名を先に設定してください</p>
          )}
        </div>

        {/* Visible fields */}
        <h3 className="px-1 pt-2 text-base font-bold text-white">公開する項目</h3>
        <div className="flex flex-col rounded-lg bg-white p-3">
          {Object.entries(VISIBLE_FIELD_LABELS).map(([field, label]) => {
            const visible = profile?.visible_fields?.[field] !== false;
            return (
              <div key={field} className="flex items-center justify-between py-2.5 border-b border-[#ececec] last:border-0">
                <span className="text-base">{label}</span>
                <button
                  onClick={() => toggleField(field)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    visible ? "bg-[#006728]" : "bg-gray-300"
                  }`}
                >
                  <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    visible ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Share */}
        {profileUrl && profile?.is_public && (
          <>
            <h3 className="px-1 pt-2 text-base font-bold text-white">シェア</h3>
            <div className="flex flex-col gap-3 rounded-lg bg-white p-3">
              <a href={profileUrl} target="_blank" rel="noopener" className="flex items-center gap-2 text-[#006728] text-sm font-bold">
                <ExternalLink className="h-4 w-4" />
                プレビューを見る
              </a>
              <button onClick={handleCopy} className="flex items-center gap-2 rounded-full border border-[#006728] px-4 py-2 text-sm font-bold text-[#006728]">
                {copied ? <><Check className="h-4 w-4" /> コピーしました</> : <><Copy className="h-4 w-4" /> リンクをコピー</>}
              </button>
              <button onClick={handleShowQR} className="flex items-center gap-2 rounded-full bg-[#006728] px-4 py-2 text-sm font-bold text-white justify-center">
                QRコードを表示
              </button>
              {qrUrl && (
                <div className="flex flex-col items-center gap-2 pt-2">
                  <img src={qrUrl} alt="QR Code" className="h-48 w-48" />
                  <a href={qrUrl} download="waggly-qr.png" className="text-sm text-[#006728] font-bold">画像をダウンロード</a>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Install qrcode package**

```bash
npm install qrcode @types/qrcode
```

- [ ] **Step 3: Commit**

```bash
git add src/app/settings/share/page.tsx package.json package-lock.json
git commit -m "feat: add share settings page with username, visibility, QR code"
```

---

### Task 9: 公開プロフィールページ

**Files:**
- Create: `src/app/p/[username]/page.tsx`
- Create: `src/app/p/[username]/page-client.tsx`

- [ ] **Step 1: Create SSR wrapper**

Create `src/app/p/[username]/page.tsx`:

```tsx
import ClientPage from "./page-client";

export function generateStaticParams() {
  return [{ username: "_" }];
}

export default function Page(props: { params: Promise<{ username: string }> }) {
  return <ClientPage params={props.params} />;
}
```

- [ ] **Step 2: Create public profile client page**

Create `src/app/p/[username]/page-client.tsx`:

```tsx
"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Loading } from "@/components/loading";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PublicProfile {
  username: string;
  avatar_url: string | null;
  nickname?: string | null;
  bio?: string | null;
  golf_experience_years?: number | null;
  average_score?: number | null;
  best_score?: number | null;
  home_course?: string | null;
  sns_links?: { instagram?: string; x?: string; line?: string };
  clubs?: Array<{
    id: string;
    category: string;
    club_number: string;
    maker: string | null;
    model: string | null;
    club_images: Array<{ image_url: string; is_primary: boolean }>;
  }>;
  courses?: Array<{
    id: string;
    course_name: string;
    course_image_url: string | null;
    evaluation: number | null;
    address: string | null;
  }>;
}

const clubNoImage: Record<string, string> = {
  driver: "/no-images/driver.png",
  fairway_wood: "/no-images/fw.png",
  utility: "/no-images/ut.png",
  iron: "/no-images/Iron.png",
  wedge: "/no-images/wedge.png",
  putter: "/no-images/putter.png",
};

export default function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/p/${username}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch");
        setProfile(await res.json());
      } catch {
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [username]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-[#139847]">
        <Loading />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-[#139847] text-white gap-4">
        <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
        <div className="relative z-10 text-center">
          <h1 className="text-2xl font-bold">ページが見つかりません</h1>
          <p className="mt-2 text-white/70">このプロフィールは公開されていないか、存在しません。</p>
        </div>
      </div>
    );
  }

  const displayName = profile.nickname || profile.username;

  return (
    <div className="relative flex flex-col bg-[#139847]" style={{ minHeight: "100dvh" }}>
      <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 pt-10 pb-6 px-4">
          <Avatar className="h-20 w-20 ring-2 ring-white">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="bg-white text-[#006728] text-2xl font-bold">
              {(displayName ?? "?")[0]}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-xl font-bold text-white">{displayName}</h1>
          {profile.bio && <p className="text-sm text-white/80 text-center max-w-xs">{profile.bio}</p>}
        </div>

        <div className="flex flex-col gap-2 px-2 pb-8">
          {/* Golf info */}
          {(profile.golf_experience_years != null || profile.average_score != null || profile.best_score != null || profile.home_course) && (
            <div className="rounded-lg bg-white p-4">
              <h2 className="text-sm font-bold text-[#006728] mb-2">ゴルフ情報</h2>
              <div className="grid grid-cols-2 gap-3">
                {profile.golf_experience_years != null && (
                  <div>
                    <p className="text-xs text-[#8b8b8b]">ゴルフ歴</p>
                    <p className="text-base font-bold">{profile.golf_experience_years}年</p>
                  </div>
                )}
                {profile.average_score != null && (
                  <div>
                    <p className="text-xs text-[#8b8b8b]">平均スコア</p>
                    <p className="text-base font-bold">{profile.average_score}</p>
                  </div>
                )}
                {profile.best_score != null && (
                  <div>
                    <p className="text-xs text-[#8b8b8b]">ベストスコア</p>
                    <p className="text-base font-bold">{profile.best_score}</p>
                  </div>
                )}
                {profile.home_course && (
                  <div>
                    <p className="text-xs text-[#8b8b8b]">ホームコース</p>
                    <p className="text-base font-bold">{profile.home_course}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MY BAG */}
          {profile.clubs && profile.clubs.length > 0 && (
            <div className="rounded-lg bg-white p-4">
              <h2 className="text-sm font-bold text-[#006728] mb-2">MY BAG</h2>
              <div className="grid grid-cols-2 gap-3">
                {profile.clubs.map((club) => {
                  const img = club.club_images?.find((i) => i.is_primary) ?? club.club_images?.[0];
                  return (
                    <div key={club.id} className="flex flex-col gap-1">
                      <div className="h-[100px] w-full overflow-hidden rounded-md bg-[#f0f0f0] flex items-center justify-center">
                        {img ? (
                          <img src={img.image_url} alt="" className="size-full object-cover" />
                        ) : (
                          <img src={clubNoImage[club.category] ?? "/no-images/etc.png"} alt="" className="size-full object-cover" />
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="shrink-0 bg-[#005c24] text-white text-[10px] font-bold rounded-md px-1.5 py-0.5">{club.club_number}</span>
                        <span className="text-sm font-bold truncate">{club.model ?? "—"}</span>
                      </div>
                      <span className="text-xs text-[#8b8b8b]">{club.maker ?? ""}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Favorite courses */}
          {profile.courses && profile.courses.length > 0 && (
            <div className="rounded-lg bg-white p-4">
              <h2 className="text-sm font-bold text-[#006728] mb-2">お気に入りコース</h2>
              <div className="flex flex-col gap-2">
                {profile.courses.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    {c.course_image_url && (
                      <img src={c.course_image_url} alt="" className="h-10 w-14 rounded object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{c.course_name}</p>
                      {c.address && <p className="text-xs text-[#8b8b8b] truncate">{c.address}</p>}
                    </div>
                    {c.evaluation != null && (
                      <span className="text-xs text-amber-500 shrink-0">★{c.evaluation.toFixed(1)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SNS Links */}
          {profile.sns_links && Object.values(profile.sns_links).some(Boolean) && (
            <div className="rounded-lg bg-white p-4">
              <h2 className="text-sm font-bold text-[#006728] mb-2">SNS</h2>
              <div className="flex gap-3">
                {profile.sns_links.instagram && (
                  <a href={profile.sns_links.instagram} target="_blank" rel="noopener" className="rounded-full bg-[#f0f0f0] px-4 py-2 text-sm font-bold">Instagram</a>
                )}
                {profile.sns_links.x && (
                  <a href={profile.sns_links.x} target="_blank" rel="noopener" className="rounded-full bg-[#f0f0f0] px-4 py-2 text-sm font-bold">X</a>
                )}
                {profile.sns_links.line && (
                  <span className="rounded-full bg-[#f0f0f0] px-4 py-2 text-sm font-bold">LINE: {profile.sns_links.line}</span>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-col items-center gap-2 pt-4 pb-6">
            <p className="text-xs text-white/60">Wagglyで作成</p>
            <a href="https://waggly.jp" className="text-sm font-bold text-white underline">waggly.jp</a>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/p/
git commit -m "feat: add public profile page /p/[username]"
```

---

### Task 10: 設定ページへのリンク統合 + 動作確認

**Files:**
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1: Add profile/share links to settings page**

Read `src/app/settings/page.tsx` and add `Link` import (if not already imported) and profile navigation links inside the main white card area, after the existing user info section. The exact location depends on the current file structure — add a new card section:

```tsx
{/* Profile & Share links - add after existing settings content */}
<div className="flex flex-col rounded-lg bg-white p-3">
  <Link href="/settings/profile">
    <div className="flex items-center justify-between py-3 border-b border-[#ececec]">
      <span className="text-base">プロフィール設定</span>
      <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-60" />
    </div>
  </Link>
  <Link href="/settings/profile/courses">
    <div className="flex items-center justify-between py-3 border-b border-[#ececec]">
      <span className="text-base">お気に入りコース</span>
      <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-60" />
    </div>
  </Link>
  <Link href="/settings/share">
    <div className="flex items-center justify-between py-3">
      <span className="text-base">名刺・共有設定</span>
      <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-60" />
    </div>
  </Link>
</div>
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit 2>&1 | grep -v __tests__
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/settings/page.tsx
git commit -m "feat: add profile and share links to settings page"
```
