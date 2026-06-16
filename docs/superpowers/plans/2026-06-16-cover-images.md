# Cover Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Facebook-style cover image carousel to the public profile/business card page, with upload/crop/reorder in profile settings.

**Architecture:** New `profile_cover_images` table + storage in existing `club-images` bucket. `ImageCropper` gets `maxOutputWidth` prop. `ImagePicker` passes through `aspectRatio`/`maxOutputWidth`. New gallery component for 2:1 cover images. Profile page gets CSS scroll-snap carousel with avatar overlay.

**Tech Stack:** Next.js, Supabase (Postgres + Storage), TypeScript, Tailwind CSS, cropperjs (existing)

**Spec:** `docs/superpowers/specs/2026-06-16-cover-images-design.md`

---

### Task 1: ImageCropper + ImagePicker Props Extension

**Files:**
- Modify: `src/components/ui/image-cropper.tsx:5,8,95-99`
- Modify: `src/components/ui/image-picker.tsx:20-23,139-143`

- [ ] **Step 1: Add `maxOutputWidth` prop to ImageCropper**

In `src/components/ui/image-cropper.tsx`, update the interface and usage:

```typescript
interface ImageCropperProps {
  imageUrl: string;
  onCrop: (file: File) => void;
  onRetake: () => void;
  onCancel: () => void;
  aspectRatio?: number;
  maxOutputWidth?: number;
}
```

Update the component signature:

```typescript
export function ImageCropper({
  imageUrl,
  onCrop,
  onRetake,
  onCancel,
  aspectRatio = 1,
  maxOutputWidth = MAX_OUTPUT_SIZE,
}: ImageCropperProps) {
```

Update `getCroppedCanvas` in `handleConfirm`:

```typescript
      const croppedCanvas = cropper.getCroppedCanvas({
        maxWidth: maxOutputWidth,
        maxHeight: maxOutputWidth,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: "high",
      });
```

- [ ] **Step 2: Add props passthrough to ImagePicker**

In `src/components/ui/image-picker.tsx`, update the interface:

```typescript
interface ImagePickerProps {
  onPick: (file: File) => void;
  children: React.ReactNode;
  aspectRatio?: number;
  maxOutputWidth?: number;
}
```

Update the component:

```typescript
export function ImagePicker({ onPick, children, aspectRatio, maxOutputWidth }: ImagePickerProps) {
```

Update the `ImageCropper` render in the portal (around line 139):

```typescript
            <ImageCropper
              imageUrl={state.imageUrl}
              onCrop={handleCrop}
              onRetake={handleRetake}
              onCancel={handleCancel}
              aspectRatio={aspectRatio}
              maxOutputWidth={maxOutputWidth}
            />
```

- [ ] **Step 3: Verify existing galleries still work**

```bash
npx next build
```

Existing galleries don't pass `aspectRatio`/`maxOutputWidth`, so they use defaults (1:1, 1200px). No breakage.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/image-cropper.tsx src/components/ui/image-picker.tsx
git commit -m "feat: add maxOutputWidth and aspectRatio passthrough to ImageCropper/ImagePicker"
```

---

### Task 2: Database Migration + Type

**Files:**
- Create: `supabase/migrations/207_cover_images.sql`
- Modify: `src/types/database.ts`

- [ ] **Step 1: Create Supabase migration**

Create `supabase/migrations/207_cover_images.sql`:

```sql
CREATE TABLE profile_cover_images (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_profile_cover_images_user ON profile_cover_images(user_id);

ALTER TABLE profile_cover_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cover images"
  ON profile_cover_images FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Public can view cover images"
  ON profile_cover_images FOR SELECT
  USING (true);
```

- [ ] **Step 2: Add ProfileCoverImage type**

In `src/types/database.ts`, add after the `AccessoryImage` interface:

```typescript
export interface ProfileCoverImage {
  id: string;
  user_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/207_cover_images.sql src/types/database.ts
git commit -m "feat: add profile_cover_images table and type"
```

---

### Task 3: Cover Image Upload + Delete APIs

**Files:**
- Create: `src/app/api/profile/cover-images/route.ts`
- Create: `src/app/api/profile/cover-images/[id]/route.ts`

- [ ] **Step 1: Create upload API**

Create `src/app/api/profile/cover-images/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

const MAX_COVER_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const EXT_MAP: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

export async function GET() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { data, error } = await supabase
    .from("profile_cover_images")
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

  // Check count limit
  const { count } = await supabase
    .from("profile_cover_images")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count ?? 0) >= MAX_COVER_IMAGES) {
    return NextResponse.json({ error: "Maximum 5 cover images allowed" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 413 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  const ext = EXT_MAP[file.type] || "jpg";
  const filePath = `covers/${userId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("club-images")
    .upload(filePath, file);

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage
    .from("club-images")
    .getPublicUrl(filePath);

  const { data: image, error } = await supabase
    .from("profile_cover_images")
    .insert({
      user_id: userId,
      image_url: publicUrl,
      sort_order: (count ?? 0),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(image, { status: 201 });
}
```

- [ ] **Step 2: Create delete API**

Create `src/app/api/profile/cover-images/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  // Fetch image to get URL for storage cleanup
  const { data: image } = await supabase
    .from("profile_cover_images")
    .select("id, image_url")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete from storage
  try {
    const url = new URL(image.image_url);
    const storagePath = url.pathname.split("/object/public/club-images/")[1];
    if (storagePath) {
      await supabase.storage.from("club-images").remove([storagePath]);
    }
  } catch {
    // Storage cleanup failure is non-fatal
  }

  const { error } = await supabase
    .from("profile_cover_images")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/profile/cover-images/route.ts src/app/api/profile/cover-images/[id]/route.ts
git commit -m "feat: add cover image upload and delete APIs"
```

---

### Task 4: Cover Image Reorder API

**Files:**
- Create: `src/app/api/profile/cover-images/reorder/route.ts`

- [ ] **Step 1: Create reorder API**

Create `src/app/api/profile/cover-images/reorder/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

export async function PATCH(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }

  // Verify all IDs belong to this user
  const { data: owned } = await supabase
    .from("profile_cover_images")
    .select("id")
    .eq("user_id", userId)
    .in("id", ids);

  if (!owned || owned.length !== ids.length) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Update sort_order for each
  for (let i = 0; i < ids.length; i++) {
    await supabase
      .from("profile_cover_images")
      .update({ sort_order: i })
      .eq("id", ids[i])
      .eq("user_id", userId);
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/profile/cover-images/reorder/route.ts
git commit -m "feat: add cover image reorder API"
```

---

### Task 5: CoverImageGallery Component

**Files:**
- Create: `src/components/profile/cover-image-gallery.tsx`

- [ ] **Step 1: Create gallery component**

Create `src/components/profile/cover-image-gallery.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Plus, Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import type { ProfileCoverImage } from "@/types/database";
import { ImagePicker } from "@/components/ui/image-picker";

interface CoverImageGalleryProps {
  images: ProfileCoverImage[];
  onUpload: (newImage: ProfileCoverImage) => void;
  onDelete: (imageId: string) => void;
  onReorder: (images: ProfileCoverImage[]) => void;
}

const MAX_IMAGES = 5;

export function CoverImageGallery({ images, onUpload, onDelete, onReorder }: CoverImageGalleryProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handlePick(file: File) {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiFetch("/api/profile/cover-images", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const newImage = await res.json();
        onUpload(newImage);
      }
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(imageId: string) {
    if (!confirm("このカバー画像を削除しますか？")) return;
    setDeletingId(imageId);
    try {
      const res = await apiFetch(`/api/profile/cover-images/${imageId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onDelete(imageId);
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= images.length) return;
    const reordered = [...images];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];

    onReorder(reordered);

    await apiFetch("/api/profile/cover-images/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((img) => img.id) }),
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {images.map((img, i) => (
        <div key={img.id} className="flex flex-col gap-1.5">
          <div className="relative aspect-[2/1] w-full overflow-hidden rounded-lg bg-[#f0f0f0]">
            <img src={img.image_url} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => handleMove(i, -1)}
                className="p-1 text-[#8b8b8b] disabled:opacity-20"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={i === images.length - 1}
                onClick={() => handleMove(i, 1)}
                className="p-1 text-[#8b8b8b] disabled:opacity-20"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(img.id)}
              disabled={deletingId === img.id}
              className="rounded-full border border-[#c4c4c4] px-3 py-1 text-sm font-bold text-[#8b8b8b]"
            >
              {deletingId === img.id ? "削除中..." : "削除"}
            </button>
          </div>
        </div>
      ))}
      {images.length < MAX_IMAGES && (
        isUploading ? (
          <div className="flex aspect-[2/1] w-full items-center justify-center rounded-lg border-2 border-dashed border-[#006728] text-[#006728]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <ImagePicker onPick={handlePick} aspectRatio={2} maxOutputWidth={1600}>
            <button
              type="button"
              className="flex w-full aspect-[2/1] items-center justify-center rounded-lg border-2 border-dashed border-[#c4c4c4] text-[#8b8b8b]"
            >
              <Plus className="h-6 w-6" />
            </button>
          </ImagePicker>
        )
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/profile/cover-image-gallery.tsx
git commit -m "feat: add CoverImageGallery component"
```

---

### Task 6: Profile Settings — Cover Image Section

**Files:**
- Modify: `src/app/settings/profile/page.tsx:1-128`

- [ ] **Step 1: Add cover image state and section**

In `src/app/settings/profile/page.tsx`, add import at the top:

```typescript
import { CoverImageGallery } from "@/components/profile/cover-image-gallery";
import type { ProfileCoverImage } from "@/types/database";
```

Add state and fetch inside the component, after the existing `useEffect`:

```typescript
  const [coverImages, setCoverImages] = useState<ProfileCoverImage[]>([]);

  useEffect(() => {
    async function loadCoverImages() {
      try {
        const { apiFetch } = await import("@/lib/api-client");
        const res = await apiFetch("/api/profile/cover-images");
        if (res.ok) setCoverImages(await res.json());
      } catch {}
    }
    loadCoverImages();
  }, []);
```

Add the section after the Avatar `</div>` closing tag (after line ~127) and before `{/* Basic info */}`:

```typescript
        {/* Cover images */}
        <h3 className="px-1 pt-2 text-lg font-bold text-white">カバー画像</h3>
        <div className="rounded-lg bg-white p-3">
          <p className="text-sm text-[#8b8b8b] pb-2">名刺ページの背景に表示されます（最大5枚、2:1比率）</p>
          <CoverImageGallery
            images={coverImages}
            onUpload={(img) => setCoverImages((prev) => [...prev, img])}
            onDelete={(id) => setCoverImages((prev) => prev.filter((img) => img.id !== id))}
            onReorder={setCoverImages}
          />
        </div>
```

- [ ] **Step 2: Verify in browser**

Navigate to `/settings/profile`. Confirm:
1. 「カバー画像」セクションがアバターの下、基本情報の上に表示
2. 追加ボタンが2:1比率の点線ボックスで表示
3. タップで画像選択 → 2:1クロッパー → アップロード動作

- [ ] **Step 3: Commit**

```bash
git add src/app/settings/profile/page.tsx
git commit -m "feat: add cover image section to profile settings"
```

---

### Task 7: Share Settings — Cover Images Toggle

**Files:**
- Modify: `src/app/settings/share/page.tsx:13-25`

- [ ] **Step 1: Add cover_images to VISIBLE_FIELD_LABELS**

In `src/app/settings/share/page.tsx`, update `VISIBLE_FIELD_LABELS`:

```typescript
const VISIBLE_FIELD_LABELS: Record<string, string> = {
  nickname: "ニックネーム",
  golf_start_date: "ゴルフ歴",
  average_score: "平均スコア",
  best_score: "ベストスコア",
  home_course: "ホームコース",
  bio: "ひとこと",
  cover_images: "カバー画像",
  bag: "クラブ",
  items: "アイテム",
  favorite_courses: "お気に入りコース",
  sns_links: "SNS",
  custom_links: "その他のリンク",
};
```

- [ ] **Step 2: Commit**

```bash
git add src/app/settings/share/page.tsx
git commit -m "feat: add cover_images toggle to share settings"
```

---

### Task 8: Expand Profile APIs with Cover Images

**Files:**
- Modify: `src/app/api/p/[username]/route.ts`
- Modify: `src/app/api/profile/preview/route.ts`

- [ ] **Step 1: Update public profile API**

In `src/app/api/p/[username]/route.ts`, add after the items query and before the `vf` line:

```typescript
  // Cover images
  const { data: coverImages } = await supabase
    .from("profile_cover_images")
    .select("id, image_url")
    .eq("user_id", profile.id)
    .order("sort_order", { ascending: true });
```

Add to the publicProfile object, after the `sns_links` line and before the `bag` line:

```typescript
  if (vf.cover_images !== false) publicProfile.cover_images = coverImages ?? [];
```

- [ ] **Step 2: Update preview API**

In `src/app/api/profile/preview/route.ts`, add after the items query and before the `vf` line:

```typescript
  const { data: coverImages } = await supabase
    .from("profile_cover_images")
    .select("id, image_url")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });
```

Add to the publicProfile object, after the `sns_links` line and before the `bag` line:

```typescript
  if (vf.cover_images !== false) publicProfile.cover_images = coverImages ?? [];
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/p/[username]/route.ts src/app/api/profile/preview/route.ts
git commit -m "feat: include cover_images in profile APIs"
```

---

### Task 9: Profile Page — Cover Image Carousel + Layout

**Files:**
- Modify: `src/app/p/[username]/page-client.tsx`

- [ ] **Step 1: Update PublicProfile interface**

Add `cover_images` to the `PublicProfile` interface:

```typescript
  cover_images?: Array<{ id: string; image_url: string }>;
```

- [ ] **Step 2: Add CoverCarousel component**

Add after the `ItemsAccordion` component, before `PublicProfilePage`:

```typescript
function CoverCarousel({ images }: { images: Array<{ id: string; image_url: string }> }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const index = Math.round(el.scrollLeft / el.clientWidth);
      setActiveIndex(index);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {images.map((img) => (
          <div key={img.id} className="w-full shrink-0 snap-start">
            <div className="aspect-[2/1] w-full">
              <img src={img.image_url} alt="" className="h-full w-full object-cover" />
            </div>
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === activeIndex ? "bg-white" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

Add `useRef` to the imports at the top of the file:

```typescript
import { useState, useEffect, use, useRef } from "react";
```

- [ ] **Step 3: Replace header section**

Replace the existing header section (the `{/* Header */}` block with avatar, name, bio, SNS icons) with:

```typescript
        {/* Header */}
        {profile.cover_images && profile.cover_images.length > 0 ? (
          <>
            <CoverCarousel images={profile.cover_images} />
            <div className="flex flex-col items-center gap-2 -mt-10 pb-4 px-4">
              <Avatar className="h-20 w-20 ring-2 ring-white">
                <AvatarImage src={profile.avatar_url ?? undefined} />
                <AvatarFallback className="bg-white text-[#006728] text-2xl font-bold">
                  {(displayName ?? "?")[0]}
                </AvatarFallback>
              </Avatar>
              <h1 className="text-xl font-bold text-white">{displayName}</h1>
              {profile.bio && <p className="text-sm text-white/80 text-center max-w-xs">{profile.bio}</p>}

              {profile.sns_links && (profile.sns_links.instagram || profile.sns_links.x) && (
                <div className="flex gap-3 mt-1">
                  {profile.sns_links.instagram && (
                    <a href={profile.sns_links.instagram} target="_blank" rel="noopener" className="flex items-center justify-center size-9 rounded-full bg-white/20">
                      <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                    </a>
                  )}
                  {profile.sns_links.x && (
                    <a href={profile.sns_links.x} target="_blank" rel="noopener" className="flex items-center justify-center size-9 rounded-full bg-white/20">
                      <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    </a>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 pt-10 pb-4 px-4">
            <Avatar className="h-20 w-20 ring-2 ring-white">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="bg-white text-[#006728] text-2xl font-bold">
                {(displayName ?? "?")[0]}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-xl font-bold text-white">{displayName}</h1>
            {profile.bio && <p className="text-sm text-white/80 text-center max-w-xs">{profile.bio}</p>}

            {profile.sns_links && (profile.sns_links.instagram || profile.sns_links.x) && (
              <div className="flex gap-3 mt-1">
                {profile.sns_links.instagram && (
                  <a href={profile.sns_links.instagram} target="_blank" rel="noopener" className="flex items-center justify-center size-9 rounded-full bg-white/20">
                    <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  </a>
                )}
                {profile.sns_links.x && (
                  <a href={profile.sns_links.x} target="_blank" rel="noopener" className="flex items-center justify-center size-9 rounded-full bg-white/20">
                    <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </a>
                )}
              </div>
            )}
          </div>
        )}
```

Note: `displayName` is defined right before the return statement as `const displayName = profile.nickname || profile.username;` — this is already in the existing code.

- [ ] **Step 4: Verify in browser**

Navigate to `/p/{username}?preview=1`. Confirm:
1. カバー画像なし → 今まで通りの緑背景
2. カバー画像あり → カバー画像表示、アバターが被さる
3. 複数枚 → スワイプでカルーセル、ドットインジケータ

- [ ] **Step 5: Commit**

```bash
git add src/app/p/[username]/page-client.tsx
git commit -m "feat: add cover image carousel to public profile page"
```

---

### Task 10: Build Verification

- [ ] **Step 1: Run build**

```bash
npx next build
```

- [ ] **Step 2: Final commit if needed**

```bash
git add -A
git commit -m "feat: cover image feature — upload, carousel, profile integration"
```
