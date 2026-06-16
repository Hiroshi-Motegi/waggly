# Profile Share Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the business card sharing feature to include items (accessories), support multiple bag views (main/sub/reserve), and add per-club/item "hide from profile" toggles.

**Architecture:** Add `hidden_from_profile` boolean column to `clubs` and `accessories` tables. Expand public profile API to fetch clubs across all bag types and accessories. Whitelist PATCH fields. Update the public profile page with 3 club accordion sections + items section with category filtering.

**Tech Stack:** Next.js, Supabase (Postgres), TypeScript, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-06-16-profile-share-expansion-design.md`

---

### Task 1: Database Migration + Type Updates

**Files:**
- Create: `supabase/migrations/206_profile_share_expansion.sql`
- Modify: `src/types/database.ts:31-67` (Club interface)
- Modify: `src/types/database.ts:149-161` (Accessory interface)
- Modify: `src/lib/sqlite/schema.ts:1-7` (schema version + migration)

- [ ] **Step 1: Create Supabase migration**

Create `supabase/migrations/206_profile_share_expansion.sql`:

```sql
ALTER TABLE clubs ADD COLUMN hidden_from_profile boolean NOT NULL DEFAULT false;
ALTER TABLE accessories ADD COLUMN hidden_from_profile boolean NOT NULL DEFAULT false;
```

- [ ] **Step 2: Add `hidden_from_profile` to Club type**

In `src/types/database.ts`, add to the `Club` interface after the `rating` field (line ~65):

```typescript
  rating: number | null;
  hidden_from_profile: boolean;
  created_at: string;
```

- [ ] **Step 3: Add `hidden_from_profile` to Accessory type**

In `src/types/database.ts`, add to the `Accessory` interface after `image_url` (line ~159):

```typescript
  image_url: string | null;
  hidden_from_profile: boolean;
  created_at: string;
```

- [ ] **Step 4: Add SQLite schema migration**

In `src/lib/sqlite/schema.ts`, bump version and add migration:

```typescript
export const SCHEMA_VERSION = 6;

export const SCHEMA_V6 = `
ALTER TABLE clubs ADD COLUMN hidden_from_profile INTEGER NOT NULL DEFAULT 0;
ALTER TABLE accessories ADD COLUMN hidden_from_profile INTEGER NOT NULL DEFAULT 0;
`;
```

- [ ] **Step 5: Run migration locally**

```bash
npx supabase db push
```

Verify columns exist:
```bash
npx supabase db dump --schema public | grep hidden_from_profile
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/206_profile_share_expansion.sql src/types/database.ts src/lib/sqlite/schema.ts
git commit -m "feat: add hidden_from_profile column to clubs and accessories"
```

---

### Task 2: Whitelist PATCH Fields for Accessories and Clubs APIs

**Files:**
- Modify: `src/app/api/accessories/[id]/route.ts:28-49`
- Modify: `src/app/api/clubs/[clubId]/route.ts:28-49`

- [ ] **Step 1: Whitelist accessories PATCH**

Replace the PATCH handler body in `src/app/api/accessories/[id]/route.ts`:

```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const body = await request.json();

  const ALLOWED = ["category", "brand", "model", "memo", "rating", "status", "purchase_url", "hidden_from_profile"];
  const updates = Object.fromEntries(
    Object.entries(body).filter(([k]) => ALLOWED.includes(k))
  );

  const { data, error } = await supabase
    .from("accessories")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 2: Whitelist clubs PATCH**

Replace the PATCH handler body in `src/app/api/clubs/[clubId]/route.ts`:

```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const body = await request.json();

  const ALLOWED = [
    "category", "club_number", "maker", "model", "shaft_name", "shaft_flex",
    "loft", "lie", "length", "distance", "release_year", "memo",
    "purchase_date", "purchase_shop", "purchase_price", "status", "bag_number", "sort_order",
    "weight", "swing_weight", "frequency", "kick_point", "head_volume", "head_weight",
    "grip_name", "grip_size", "bounce", "sole_shape", "face_angle", "shaft_weight",
    "rating", "hidden_from_profile",
  ];
  const updates = Object.fromEntries(
    Object.entries(body).filter(([k]) => ALLOWED.includes(k))
  );

  const { data, error } = await supabase
    .from("clubs")
    .update(updates)
    .eq("id", clubId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 3: Verify existing edit flows still work**

Start dev server and test:
1. Edit a club at `/bag/{clubId}/edit` — save should work
2. Edit an item at `/items/{id}` — toggle edit mode, save should work

- [ ] **Step 4: Commit**

```bash
git add src/app/api/accessories/[id]/route.ts src/app/api/clubs/[clubId]/route.ts
git commit -m "fix: whitelist PATCH fields for clubs and accessories APIs"
```

---

### Task 3: Expand Public Profile and Preview APIs

**Files:**
- Modify: `src/app/api/p/[username]/route.ts`
- Modify: `src/app/api/profile/preview/route.ts`

- [ ] **Step 1: Update `/api/p/[username]` to fetch expanded clubs + items**

Replace the full GET handler in `src/app/api/p/[username]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .eq("is_public", true)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: courses } = await supabase
    .from("favorite_courses")
    .select("*")
    .eq("user_id", profile.id)
    .order("sort_order", { ascending: true });

  // Clubs: bag (bag_number 1 or 2) + reserve, excluding hidden
  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, category, club_number, maker, model, bag_number, status, club_images(image_url, is_primary)")
    .eq("user_id", profile.id)
    .eq("hidden_from_profile", false)
    .in("status", ["bag", "reserve"])
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  // Filter out bag_number=0 for bag status clubs
  const filteredClubs = (clubs ?? []).filter(
    (c) => c.status === "reserve" || (c.status === "bag" && (c.bag_number === 1 || c.bag_number === 2))
  );

  // Items: active, excluding hidden
  const { data: items } = await supabase
    .from("accessories")
    .select("id, category, brand, model, accessory_images(image_url, is_primary)")
    .eq("user_id", profile.id)
    .eq("status", "active")
    .eq("hidden_from_profile", false)
    .order("created_at", { ascending: false });

  const vf = profile.visible_fields ?? {};
  const publicProfile: Record<string, any> = {
    username: profile.username,
    avatar_url: profile.avatar_url,
  };
  if (vf.nickname !== false) publicProfile.nickname = profile.nickname;
  if (vf.bio !== false) publicProfile.bio = profile.bio;
  if (vf.golf_start_date !== false) publicProfile.golf_start_date = profile.golf_start_date;
  if (vf.average_score !== false) publicProfile.average_score = profile.average_score;
  if (vf.best_score !== false) publicProfile.best_score = profile.best_score;
  if (vf.home_course !== false) publicProfile.home_course = profile.home_course;
  if (vf.sns_links !== false) publicProfile.sns_links = profile.sns_links;
  if (vf.bag !== false) publicProfile.clubs = filteredClubs;
  if (vf.items !== false) publicProfile.items = items ?? [];
  if (vf.favorite_courses !== false) publicProfile.courses = courses ?? [];

  return NextResponse.json(publicProfile);
}
```

- [ ] **Step 2: Update `/api/profile/preview` with the same logic**

Replace the full GET handler in `src/app/api/profile/preview/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

export async function GET() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: courses } = await supabase
    .from("favorite_courses")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, category, club_number, maker, model, bag_number, status, club_images(image_url, is_primary)")
    .eq("user_id", userId)
    .eq("hidden_from_profile", false)
    .in("status", ["bag", "reserve"])
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const filteredClubs = (clubs ?? []).filter(
    (c) => c.status === "reserve" || (c.status === "bag" && (c.bag_number === 1 || c.bag_number === 2))
  );

  const { data: items } = await supabase
    .from("accessories")
    .select("id, category, brand, model, accessory_images(image_url, is_primary)")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("hidden_from_profile", false)
    .order("created_at", { ascending: false });

  const vf = profile.visible_fields ?? {};
  const publicProfile: Record<string, any> = {
    username: profile.username,
    avatar_url: profile.avatar_url,
  };
  if (vf.nickname !== false) publicProfile.nickname = profile.nickname;
  if (vf.bio !== false) publicProfile.bio = profile.bio;
  if (vf.golf_start_date !== false) publicProfile.golf_start_date = profile.golf_start_date;
  if (vf.average_score !== false) publicProfile.average_score = profile.average_score;
  if (vf.best_score !== false) publicProfile.best_score = profile.best_score;
  if (vf.home_course !== false) publicProfile.home_course = profile.home_course;
  if (vf.sns_links !== false) publicProfile.sns_links = profile.sns_links;
  if (vf.bag !== false) publicProfile.clubs = filteredClubs;
  if (vf.items !== false) publicProfile.items = items ?? [];
  if (vf.favorite_courses !== false) publicProfile.courses = courses ?? [];

  return NextResponse.json(publicProfile);
}
```

- [ ] **Step 3: Test API responses**

```bash
# Preview endpoint (requires auth cookie from browser devtools)
curl -s http://localhost:3000/api/profile/preview -H "Cookie: ..." | jq '.clubs[0].bag_number, .clubs[0].status, .items'
```

Verify: clubs array contains `bag_number` and `status` fields. items array is present (may be empty if no active accessories).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/p/[username]/route.ts src/app/api/profile/preview/route.ts
git commit -m "feat: expand profile API with multi-bag clubs and items"
```

---

### Task 4: Update Share Settings Page

**Files:**
- Modify: `src/app/settings/share/page.tsx:13-24`

- [ ] **Step 1: Update VISIBLE_FIELD_LABELS**

In `src/app/settings/share/page.tsx`, replace the `VISIBLE_FIELD_LABELS` constant:

```typescript
const VISIBLE_FIELD_LABELS: Record<string, string> = {
  nickname: "ニックネーム",
  golf_start_date: "ゴルフ歴",
  average_score: "平均スコア",
  best_score: "ベストスコア",
  home_course: "ホームコース",
  bio: "ひとこと",
  bag: "クラブ",
  items: "アイテム",
  favorite_courses: "お気に入りコース",
  sns_links: "SNS",
  custom_links: "その他のリンク",
};
```

Changes: `bag` label from "マイバッグ" to "クラブ", added `items: "アイテム"`.

- [ ] **Step 2: Verify in browser**

Navigate to `/settings/share`. Confirm:
1. "クラブ" toggle appears (was "マイバッグ")
2. "アイテム" toggle appears between "クラブ" and "お気に入りコース"

- [ ] **Step 3: Commit**

```bash
git add src/app/settings/share/page.tsx
git commit -m "feat: add items toggle and rename bag label in share settings"
```

---

### Task 5: Add Hidden-From-Profile Toggle to Club Edit Page

**Files:**
- Modify: `src/app/bag/[clubId]/edit/page-client.tsx`

- [ ] **Step 1: Add toggle state and include in submit**

Replace the full content of `src/app/bag/[clubId]/edit/page-client.tsx`:

```typescript
"use client";
import { Loading } from "@/components/loading";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ClubForm } from "@/components/club/club-form";
import { PageHeader } from "@/components/layout/page-header";
import { ClubImageGallery } from "@/components/club/club-image-gallery";
import { useClub, updateClub } from "@/hooks/use-clubs";
import type { Club, ClubImage } from "@/types/database";
import { nativeHref } from "@/lib/native-routes";
import { ProcessingOverlay } from "@/components/ui/processing-overlay";

export default function EditClubPageClient({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = use(params);
  const { club, isLoading } = useClub(clubId);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hiddenFromProfile, setHiddenFromProfile] = useState(false);
  const [hiddenInitialized, setHiddenInitialized] = useState(false);

  if (club && !hiddenInitialized) {
    setHiddenFromProfile(club.hidden_from_profile ?? false);
    setHiddenInitialized(true);
  }

  async function handleSubmit(data: Partial<Club>) {
    setIsSubmitting(true);
    try {
      await updateClub(clubId, { ...data, hidden_from_profile: hiddenFromProfile });
      router.replace(nativeHref(`/bag/${clubId}`));
    } catch (error) {
      console.error("Failed to update club:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const [clubImages, setClubImages] = useState<ClubImage[]>([]);
  const [imagesInitialized, setImagesInitialized] = useState(false);

  if (club && !imagesInitialized) {
    setClubImages(club.club_images ?? []);
    setImagesInitialized(true);
  }

  const handleImageUpload = useCallback((newImage: ClubImage) => {
    setClubImages((prev) => [...prev, newImage]);
  }, []);

  if (isLoading) return <Loading variant="light" />;
  if (!club) return <div className="px-2 pt-16"><div className="rounded-lg bg-white p-6 text-center"><p className="text-base text-[#8b8b8b]">クラブが見つかりません</p></div></div>;

  const { club_images, maintenances, id, user_id, created_at, ...editableData } = club as any;

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      {isSubmitting && <ProcessingOverlay />}
      <div className="relative z-10 flex flex-col space-y-2">
        <PageHeader title="クラブを編集" variant="dark" />
        <h3 className="px-1 pt-2 text-lg font-bold text-white">写真</h3>
        <div>
          <div className="rounded-lg bg-white p-3">
            <ClubImageGallery
              clubId={clubId}
              images={clubImages}
              onUpload={handleImageUpload}
              onDelete={(imageId) => setClubImages((prev) => prev.filter((img) => img.id !== imageId))}
            />
          </div>
        </div>
        <ClubForm initialData={editableData} onSubmit={handleSubmit} isSubmitting={isSubmitting} onCancel={() => router.back()} />

        {/* Hidden from profile toggle */}
        <div className="rounded-lg bg-white p-3">
          <div className="flex items-center justify-between">
            <span className="text-base">名刺に表示しない</span>
            <button
              type="button"
              onClick={() => setHiddenFromProfile(!hiddenFromProfile)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                hiddenFromProfile ? "bg-[#006728]" : "bg-gray-300"
              }`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                hiddenFromProfile ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

Key changes:
- Added `hiddenFromProfile` state, initialized from `club.hidden_from_profile`
- `handleSubmit` includes `hidden_from_profile` in the update payload
- Toggle rendered after `ClubForm`, before the page ends

- [ ] **Step 2: Verify in browser**

Navigate to `/bag/{clubId}/edit`. Confirm:
1. "名刺に表示しない" toggle appears below the club form
2. Toggling and saving persists the value (check DB or re-open edit page)

- [ ] **Step 3: Commit**

```bash
git add src/app/bag/[clubId]/edit/page-client.tsx
git commit -m "feat: add hidden-from-profile toggle to club edit page"
```

---

### Task 6: Add Hidden-From-Profile Toggle to Item Edit Mode

**Files:**
- Modify: `src/app/items/[id]/page-client.tsx`

- [ ] **Step 1: Add toggle to item edit form**

In `src/app/items/[id]/page-client.tsx`, make these changes:

1. In the `handleSave` function, add `hidden_from_profile` to the body object (after `purchase_url`):

```typescript
      const body = {
        category: editForm.category,
        brand: editForm.brand || null,
        model: editForm.model || null,
        memo: editForm.memo || null,
        rating: editForm.rating ?? null,
        status: editForm.status,
        purchase_url: editForm.purchase_url || null,
        hidden_from_profile: editForm.hidden_from_profile ?? false,
      };
```

2. After the status `<select>` div (after line ~280), add the toggle:

```typescript
          {/* 名刺に表示しない */}
          <div className="flex items-center justify-between py-2.5">
            <span className="text-base">名刺に表示しない</span>
            <button
              type="button"
              onClick={() => updateEdit("hidden_from_profile", editForm.hidden_from_profile ? false : true)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                editForm.hidden_from_profile ? "bg-[#006728]" : "bg-gray-300"
              }`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                editForm.hidden_from_profile ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>
```

Insert this between the closing `</div>` of the status select and the closing `</form>` tag.

- [ ] **Step 2: Verify in browser**

Navigate to `/items/{id}`, click edit. Confirm:
1. "名刺に表示しない" toggle appears below status
2. Toggling and saving persists the value

- [ ] **Step 3: Commit**

```bash
git add src/app/items/[id]/page-client.tsx
git commit -m "feat: add hidden-from-profile toggle to item edit mode"
```

---

### Task 7: Update Public Profile Page — Club Accordion Sections

**Files:**
- Modify: `src/app/p/[username]/page-client.tsx`

- [ ] **Step 1: Update PublicProfile interface**

In `src/app/p/[username]/page-client.tsx`, replace the `PublicProfile` interface:

```typescript
interface PublicProfile {
  username: string;
  avatar_url: string | null;
  nickname?: string | null;
  bio?: string | null;
  golf_start_date?: string | null;
  average_score?: number | null;
  best_score?: number | null;
  home_course?: string | null;
  sns_links?: { instagram?: string; x?: string; custom_links?: { label: string; url: string }[] };
  clubs?: Array<{
    id: string;
    category: string;
    club_number: string;
    maker: string | null;
    model: string | null;
    bag_number: number;
    status: string;
    club_images: Array<{ image_url: string; is_primary: boolean }>;
  }>;
  items?: Array<{
    id: string;
    category: string;
    brand: string | null;
    model: string | null;
    accessory_images: Array<{ image_url: string; is_primary: boolean }>;
  }>;
  courses?: Array<{
    id: string;
    gora_course_id: number | null;
    course_name: string;
    course_image_url: string | null;
    evaluation: number | null;
    address: string | null;
  }>;
}
```

- [ ] **Step 2: Add helper function and category data for items**

After the `clubNoImage` constant, add:

```typescript
const categoryLabels: Record<string, string> = {
  ball: "ボール",
  glove: "グローブ",
  tee: "ティー",
  apparel: "アパレル",
  bag: "バッグ",
  rangefinder: "距離計",
  grip: "グリップ",
  shaft: "シャフト",
  other: "その他",
};

const categoryIcons: Record<string, string> = {
  ball: "/no-images/ball.png",
  glove: "/no-images/globe.png",
  tee: "/no-images/tee.png",
  apparel: "/no-images/ware.png",
  bag: "/no-images/bag.png",
  rangefinder: "/no-images/distance.png",
  grip: "/no-images/grip.png",
  shaft: "/no-images/shaft.png",
  other: "/no-images/etc.png",
};
```

- [ ] **Step 3: Replace club section with 3 accordion sections**

Replace the existing `{/* マイバッグ (accordion) */}` block (lines ~210-237) with:

```typescript
          {/* クラブセクション（マイバッグ / 予備バッグ / 保管庫） */}
          {profile.clubs && profile.clubs.length > 0 && (() => {
            const mainBag = profile.clubs!.filter((c) => c.status === "bag" && c.bag_number === 1);
            const subBag = profile.clubs!.filter((c) => c.status === "bag" && c.bag_number === 2);
            const reserve = profile.clubs!.filter((c) => c.status === "reserve");

            const renderClubList = (clubs: typeof mainBag) => (
              <div className="flex flex-col">
                {clubs.map((club, i) => {
                  const img = club.club_images?.find((c) => c.is_primary) ?? club.club_images?.[0];
                  return (
                    <div key={club.id} className={`flex items-center gap-2.5 py-2 ${i < clubs.length - 1 ? "border-b border-[#dfdfdf]" : ""}`}>
                      <div className="size-[50px] shrink-0 overflow-hidden rounded bg-[#f0f0f0] flex items-center justify-center">
                        {img ? (
                          <img src={img.image_url} alt="" className="size-full object-cover" />
                        ) : (
                          <img src={clubNoImage[club.category] ?? "/no-images/etc.png"} alt="" className="size-full object-cover" />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="shrink-0 bg-[#006728] text-white text-xs font-bold rounded-md px-2 py-0.5 min-w-[32px] text-center">{club.club_number}</span>
                          <span className="text-base font-bold text-black truncate">{club.model ?? "—"}</span>
                        </div>
                        <span className="text-sm text-[#8b8b8b] truncate pl-0.5">{club.maker ?? "—"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );

            return (
              <>
                {mainBag.length > 0 && (
                  <AccordionSection title="マイバッグ">
                    {renderClubList(mainBag)}
                  </AccordionSection>
                )}
                {subBag.length > 0 && (
                  <AccordionSection title="予備バッグ">
                    {renderClubList(subBag)}
                  </AccordionSection>
                )}
                {reserve.length > 0 && (
                  <AccordionSection title="保管庫">
                    {renderClubList(reserve)}
                  </AccordionSection>
                )}
              </>
            );
          })()}
```

- [ ] **Step 4: Verify in browser**

Navigate to `/p/{username}?preview=1`. Confirm:
1. Clubs are split into separate accordion sections by bag type
2. Empty sections are hidden
3. Each section shows clubs with thumbnails, club number badge, model, maker

- [ ] **Step 5: Commit**

```bash
git add src/app/p/[username]/page-client.tsx
git commit -m "feat: split club display into 3 accordion sections on profile page"
```

---

### Task 8: Add Items Section to Public Profile Page

**Files:**
- Modify: `src/app/p/[username]/page-client.tsx`

- [ ] **Step 1: Add items accordion with category filter**

Insert the following after the club accordion sections block (the `</>` closing tag from Task 7) and before the `{/* お気に入りコース */}` section:

```typescript
          {/* アイテム (accordion) */}
          {profile.items && profile.items.length > 0 && (() => {
            const allCategories = [...new Set(profile.items!.map((item) => item.category))];

            return (
              <ItemsAccordion items={profile.items!} categories={allCategories} />
            );
          })()}
```

- [ ] **Step 2: Create ItemsAccordion component**

Add this component inside the same file, after the `AccordionSection` component (before the `PublicProfilePage` component):

```typescript
function ItemsAccordion({ items, categories }: { items: PublicProfile["items"] & {}; categories: string[] }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const filtered = filter ? items.filter((item) => item.category === filter) : items;

  return (
    <div className="rounded-lg bg-white overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex items-center w-full px-3 py-4">
        <h2 className="flex-1 text-sm font-bold text-[#006728] text-left">アイテム</h2>
        {open ? <ChevronUp className="h-4 w-4 text-[#8b8b8b]" /> : <ChevronDown className="h-4 w-4 text-[#8b8b8b]" />}
      </button>
      {open && (
        <div className="px-3 pb-3">
          {/* Category filter tabs */}
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-1.5 pb-3">
              <button
                onClick={() => setFilter(null)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                  filter === null ? "bg-[#006728] text-white" : "bg-[#f0f0f0] text-[#8b8b8b]"
                }`}
              >
                すべて
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                    filter === cat ? "bg-[#006728] text-white" : "bg-[#f0f0f0] text-[#8b8b8b]"
                  }`}
                >
                  {categoryLabels[cat] ?? cat}
                </button>
              ))}
            </div>
          )}

          {/* Item list */}
          <div className="flex flex-col">
            {filtered.map((item, i) => {
              const img = item.accessory_images?.find((a) => a.is_primary) ?? item.accessory_images?.[0];
              return (
                <div key={item.id} className={`flex items-center gap-2.5 py-2 ${i < filtered.length - 1 ? "border-b border-[#dfdfdf]" : ""}`}>
                  <div className="size-[50px] shrink-0 overflow-hidden rounded bg-[#f0f0f0] flex items-center justify-center">
                    {img ? (
                      <img src={img.image_url} alt="" className="size-full object-cover" />
                    ) : (
                      <img src={categoryIcons[item.category] ?? "/no-images/etc.png"} alt="" className="size-full object-cover" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                    <span className="text-xs font-medium text-[#8b8b8b]">
                      {categoryLabels[item.category] ?? item.category}
                    </span>
                    <span className="text-base font-bold text-black truncate">
                      {[item.brand, item.model].filter(Boolean).join(" ") || "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

Navigate to `/p/{username}?preview=1`. Confirm:
1. "アイテム" accordion appears between clubs and courses
2. Opening it shows item list with thumbnails, category labels, brand/model
3. If multiple categories exist, filter tabs appear
4. Clicking a category tab filters the list
5. "すべて" tab shows all items
6. If no items exist, the section is hidden entirely

- [ ] **Step 4: Commit**

```bash
git add src/app/p/[username]/page-client.tsx
git commit -m "feat: add items section with category filter to public profile"
```

---

### Task 9: End-to-End Verification

- [ ] **Step 1: Test hidden_from_profile toggle on club**

1. Go to `/bag/{clubId}/edit`
2. Toggle "名刺に表示しない" ON → save
3. Go to `/p/{username}?preview=1` → verify that club is NOT shown
4. Go back, toggle OFF → save
5. Preview → verify club IS shown

- [ ] **Step 2: Test hidden_from_profile toggle on item**

1. Go to `/items/{id}` → edit mode
2. Toggle "名刺に表示しない" ON → save
3. Preview profile → verify item is NOT shown
4. Toggle OFF → verify it reappears

- [ ] **Step 3: Test visible_fields toggles**

1. Go to `/settings/share`
2. Toggle "クラブ" OFF → preview → no club sections visible
3. Toggle "アイテム" OFF → preview → no item section visible
4. Toggle both back ON → sections reappear

- [ ] **Step 4: Test multi-bag display**

1. Ensure you have clubs in bag_number=1 and bag_number=2 (or reserve status)
2. Preview profile → verify "マイバッグ", "予備バッグ", "保管庫" appear as separate sections
3. Verify empty sections are hidden

- [ ] **Step 5: Test item category filter**

1. Ensure you have items in 2+ categories
2. Preview profile → open "アイテム" accordion
3. Verify category tabs appear
4. Click each tab → verify items filter correctly

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: profile share expansion — items, multi-bag, hidden-from-profile"
```
