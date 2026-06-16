# クラブ自動入力精度改善 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** クラブスペック自動入力をWeb検索併用 + DBキャッシュ + 楽天API画像/リンク取得に改善する

**Architecture:** 自動入力リクエスト時にまずDBキャッシュを検索、ミス時はTavily Web検索 + 楽天APIを並列実行してスペック・画像・リンクを取得しDBに保存。verified=trueのレコードは管理者固定データとして上書き保護。

**Tech Stack:** Next.js 16, Supabase (PostgreSQL), Tavily API (既存), 楽天商品検索API, Claude Haiku (既存)

---

## ファイル構成

| ファイル | 責務 |
|---------|------|
| `supabase/migrations/209_club_specs_cache.sql` | club_specsテーブル + トリガー作成 |
| `src/types/database.ts` | ClubSpec型追加 |
| `src/lib/normalize.ts` | メーカー/モデル名正規化 |
| `src/lib/rakuten-search.ts` | 楽天商品検索API |
| `src/app/api/clubs/autofill/route.ts` | 自動入力API改修 |

---

### Task 1: DBマイグレーション + 型定義

**Files:**
- Create: `supabase/migrations/209_club_specs_cache.sql`
- Modify: `src/types/database.ts`

- [ ] **Step 1: マイグレーションファイル作成**

`supabase/migrations/209_club_specs_cache.sql`:

```sql
CREATE TABLE club_specs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  maker text NOT NULL,
  model text NOT NULL,
  category text NOT NULL,
  club_number text,
  maker_normalized text NOT NULL,
  model_normalized text NOT NULL,
  loft numeric,
  lie numeric,
  length numeric,
  distance numeric,
  weight numeric,
  swing_weight text,
  head_volume numeric,
  head_weight numeric,
  image_url text,
  affiliate_url text,
  source text NOT NULL DEFAULT 'ai',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- NULLセーフなユニークインデックス
CREATE UNIQUE INDEX idx_club_specs_unique
  ON club_specs(maker_normalized, model_normalized, category, COALESCE(club_number, ''));

CREATE INDEX idx_club_specs_lookup
  ON club_specs(maker_normalized, model_normalized, category);

ALTER TABLE club_specs ENABLE ROW LEVEL SECURITY;

-- service roleはRLSをバイパスして直接アクセス。anon/authenticatedは全拒否。
CREATE POLICY "Deny all for non-service roles" ON club_specs
  FOR ALL USING (false);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_club_specs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER club_specs_updated_at
  BEFORE UPDATE ON club_specs
  FOR EACH ROW EXECUTE FUNCTION update_club_specs_updated_at();
```

- [ ] **Step 2: 型定義追加**

`src/types/database.ts` の末尾（`Report` インターフェースの後）に追加:

```typescript
export interface ClubSpec {
  id: string;
  maker: string;
  model: string;
  category: string;
  club_number: string | null;
  maker_normalized: string;
  model_normalized: string;
  loft: number | null;
  lie: number | null;
  length: number | null;
  distance: number | null;
  weight: number | null;
  swing_weight: string | null;
  head_volume: number | null;
  head_weight: number | null;
  image_url: string | null;
  affiliate_url: string | null;
  source: 'ai' | 'manual';
  verified: boolean;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 3: コミット**

```bash
git add supabase/migrations/209_club_specs_cache.sql src/types/database.ts
git commit -m "feat: add club_specs cache table and ClubSpec type"
```

---

### Task 2: 正規化ユーティリティ

**Files:**
- Create: `src/lib/normalize.ts`

- [ ] **Step 1: 正規化関数作成**

`src/lib/normalize.ts`:

```typescript
/**
 * Normalize club maker/model names for cache lookup.
 * Handles: full-width→half-width, case folding, whitespace removal, hyphen unification.
 * Does NOT handle: katakana↔English mapping (intentional — see spec).
 */
export function normalizeClubName(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[ー−‐]/g, "-");
}
```

- [ ] **Step 2: コミット**

```bash
git add src/lib/normalize.ts
git commit -m "feat: add club name normalization utility"
```

---

### Task 3: 楽天商品検索

**Files:**
- Create: `src/lib/rakuten-search.ts`

- [ ] **Step 1: 楽天検索関数作成**

`src/lib/rakuten-search.ts`:

```typescript
const RAKUTEN_API = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706";
const RAKUTEN_GOLF_CLUB_GENRE_ID = "565751";

/**
 * Search Rakuten for a golf club product.
 * Returns image URL and affiliate URL, or nulls on any error.
 * Never throws — caller should treat nulls as "no product info available".
 */
export async function searchRakutenClub(maker: string, model: string): Promise<{
  imageUrl: string | null;
  affiliateUrl: string | null;
}> {
  const appId = process.env.RAKUTEN_APP_ID;
  const affiliateId = process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID;
  if (!appId) return { imageUrl: null, affiliateUrl: null };

  const keyword = `${maker} ${model} ゴルフクラブ`;
  const params = new URLSearchParams({
    format: "json",
    applicationId: appId,
    keyword,
    genreId: RAKUTEN_GOLF_CLUB_GENRE_ID,
    hits: "1",
    imageFlag: "1",
    ...(affiliateId ? { affiliateId } : {}),
  });

  try {
    const res = await fetch(`${RAKUTEN_API}?${params}`);
    if (!res.ok) return { imageUrl: null, affiliateUrl: null };
    const data = await res.json();
    const item = data.Items?.[0]?.Item;
    if (!item) return { imageUrl: null, affiliateUrl: null };

    return {
      imageUrl: item.mediumImageUrls?.[0]?.imageUrl ?? null,
      affiliateUrl: item.affiliateUrl ?? item.itemUrl ?? null,
    };
  } catch {
    return { imageUrl: null, affiliateUrl: null };
  }
}
```

- [ ] **Step 2: コミット**

```bash
git add src/lib/rakuten-search.ts
git commit -m "feat: add Rakuten product search for club images and affiliate links"
```

---

### Task 4: autofill API改修

**Files:**
- Modify: `src/app/api/clubs/autofill/route.ts`

- [ ] **Step 1: autofill APIを全面改修**

`src/app/api/clubs/autofill/route.ts` を以下で全置換:

```typescript
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { normalizeClubName } from "@/lib/normalize";
import { searchGolfKnowledge } from "@/lib/knowledge/search";
import { searchRakutenClub } from "@/lib/rakuten-search";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  driver: "ドライバー",
  fairway_wood: "フェアウェイウッド",
  utility: "ユーティリティ",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};

export async function POST(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { category, club_number, maker, model, shaft_name, shaft_flex, release_year } = await request.json();

  if (!maker || !model) {
    return NextResponse.json({ error: "メーカーとモデルは必須です" }, { status: 400 });
  }

  const makerNorm = normalizeClubName(maker);
  const modelNorm = normalizeClubName(model);
  const admin = getAdminClient();

  // 1. Check cache
  const query = admin
    .from("club_specs")
    .select("*")
    .eq("maker_normalized", makerNorm)
    .eq("model_normalized", modelNorm)
    .eq("category", category ?? "");

  if (club_number) {
    query.eq("club_number", club_number);
  } else {
    query.is("club_number", null);
  }

  const { data: cached } = await query.maybeSingle();

  if (cached) {
    return NextResponse.json({
      loft: cached.loft,
      lie: cached.lie,
      length: cached.length,
      distance: cached.distance,
      weight: cached.weight,
      swing_weight: cached.swing_weight,
      head_volume: cached.head_volume,
      head_weight: cached.head_weight,
      image_url: cached.image_url,
      affiliate_url: cached.affiliate_url,
    });
  }

  // 2. Cache miss — fetch in parallel
  const categoryLabel = CATEGORY_LABELS[category] ?? category ?? "";
  const searchQuery = `${maker} ${model} ${club_number ?? ""} ${categoryLabel} ゴルフ スペック ロフト角 ライ角 長さ 重量`.trim();

  const [searchResult, rakutenResult] = await Promise.all([
    searchGolfKnowledge(searchQuery).catch(() => ({ results: [], answer: null })),
    searchRakutenClub(maker, model),
  ]);

  // 3. Build prompt with search context
  const hasSearchResults = searchResult.results.length > 0;
  const searchContext = hasSearchResults
    ? searchResult.results.map((r) => `### ${r.title}\n${r.content}`).join("\n\n")
    : "";

  const prompt = hasSearchResults
    ? `以下のWeb検索結果を参考に、ゴルフクラブのスペック情報をJSON形式で回答してください。
検索結果に記載されている情報のみを使用し、推測はしないでください。
該当する情報がない項目はnullにしてください。

## Web検索結果
${searchContext}

## クラブ情報
メーカー: ${maker}
モデル: ${model}
種別: ${categoryLabel || "不明"}
番手: ${club_number ?? "不明"}
シャフト: ${shaft_name ?? "不明"}
フレックス: ${shaft_flex ?? "不明"}
発売年: ${release_year ?? "不明"}

以下のJSON形式で回答してください。JSON以外のテキストは不要です:
\`\`\`json
{
  "loft": ロフト角(数値またはnull),
  "lie": ライ角(数値またはnull),
  "length": 長さインチ(数値またはnull),
  "distance": メーカー公称飛距離またはHS40m/s想定の一般的な飛距離yd(数値またはnull),
  "weight": 総重量g(数値またはnull),
  "swing_weight": バランス("D0","D1","D2"等の文字列またはnull),
  "head_volume": ヘッド体積cc(数値またはnull),
  "head_weight": ヘッド重量g(数値またはnull)
}
\`\`\``
    : `以下のゴルフクラブの公開スペック情報を検索して、JSON形式で回答してください。
分からない項目はnullにしてください。推測ではなく、公開情報に基づいて回答してください。

種別: ${categoryLabel || "不明"}
番手: ${club_number ?? "不明"}
メーカー: ${maker}
モデル: ${model}
シャフト: ${shaft_name ?? "不明"}
フレックス: ${shaft_flex ?? "不明"}
発売年: ${release_year ?? "不明"}

以下のJSON形式で回答してください。JSON以外のテキストは不要です:
\`\`\`json
{
  "loft": ロフト角(数値またはnull),
  "lie": ライ角(数値またはnull),
  "length": 長さインチ(数値またはnull),
  "distance": メーカー公称飛距離またはHS40m/s想定の一般的な飛距離yd(数値またはnull),
  "weight": 総重量g(数値またはnull),
  "swing_weight": バランス("D0","D1","D2"等の文字列またはnull),
  "head_volume": ヘッド体積cc(数値またはnull),
  "head_weight": ヘッド重量g(数値またはnull)
}
\`\`\``;

  try {
    const { text, usage } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt,
      maxOutputTokens: 300,
    });

    // Save AI usage
    if (usage) {
      await supabase.from("ai_usage").insert({
        user_id: userId,
        input_tokens: usage.inputTokens ?? 0,
        output_tokens: usage.outputTokens ?? 0,
        model: "claude-haiku-4-5",
        source: "autofill",
      });
    }

    // Parse JSON
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse response" }, { status: 500 });
    }

    const jsonStr = jsonMatch[1] ?? jsonMatch[0];
    const specs = JSON.parse(jsonStr);

    // 4. Save to cache (UPSERT, skip if verified=true)
    await admin.rpc("upsert_club_spec", {
      p_maker: maker,
      p_model: model,
      p_category: category ?? "",
      p_club_number: club_number ?? null,
      p_maker_normalized: makerNorm,
      p_model_normalized: modelNorm,
      p_loft: specs.loft ?? null,
      p_lie: specs.lie ?? null,
      p_length: specs.length ?? null,
      p_distance: specs.distance ?? null,
      p_weight: specs.weight ?? null,
      p_swing_weight: specs.swing_weight ?? null,
      p_head_volume: specs.head_volume ?? null,
      p_head_weight: specs.head_weight ?? null,
      p_image_url: rakutenResult.imageUrl,
      p_affiliate_url: rakutenResult.affiliateUrl,
    }).catch((err: any) => console.error("[autofill] Cache save error:", err?.message));

    return NextResponse.json({
      ...specs,
      image_url: rakutenResult.imageUrl,
      affiliate_url: rakutenResult.affiliateUrl,
    });
  } catch (error: any) {
    console.error("[autofill] Error:", error?.message);
    return NextResponse.json({ error: error?.message ?? "Unknown error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: UPSERTのRPC関数をマイグレーションに追加**

`supabase/migrations/209_club_specs_cache.sql` の末尾に追加:

```sql
-- UPSERT function (skips update if verified=true)
CREATE OR REPLACE FUNCTION upsert_club_spec(
  p_maker text,
  p_model text,
  p_category text,
  p_club_number text,
  p_maker_normalized text,
  p_model_normalized text,
  p_loft numeric,
  p_lie numeric,
  p_length numeric,
  p_distance numeric,
  p_weight numeric,
  p_swing_weight text,
  p_head_volume numeric,
  p_head_weight numeric,
  p_image_url text,
  p_affiliate_url text
) RETURNS void AS $$
BEGIN
  INSERT INTO club_specs (
    maker, model, category, club_number,
    maker_normalized, model_normalized,
    loft, lie, length, distance, weight, swing_weight, head_volume, head_weight,
    image_url, affiliate_url, source, verified
  ) VALUES (
    p_maker, p_model, p_category, p_club_number,
    p_maker_normalized, p_model_normalized,
    p_loft, p_lie, p_length, p_distance, p_weight, p_swing_weight, p_head_volume, p_head_weight,
    p_image_url, p_affiliate_url, 'ai', false
  )
  ON CONFLICT (maker_normalized, model_normalized, category, COALESCE(club_number, ''))
  DO UPDATE SET
    loft = EXCLUDED.loft,
    lie = EXCLUDED.lie,
    length = EXCLUDED.length,
    distance = EXCLUDED.distance,
    weight = EXCLUDED.weight,
    swing_weight = EXCLUDED.swing_weight,
    head_volume = EXCLUDED.head_volume,
    head_weight = EXCLUDED.head_weight,
    image_url = EXCLUDED.image_url,
    affiliate_url = EXCLUDED.affiliate_url
  WHERE club_specs.verified = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 3: コミット**

```bash
git add src/app/api/clubs/autofill/route.ts supabase/migrations/209_club_specs_cache.sql
git commit -m "feat: autofill with web search, DB cache, and Rakuten product info"
```

---

### Task 5: DBマイグレーション実行 + 動作確認

**Files:** なし（設定・テストのみ）

- [ ] **Step 1: Supabase SQLエディタでマイグレーション実行**

SupabaseダッシュボードのSQL Editorで `supabase/migrations/209_club_specs_cache.sql` の内容を実行。

- [ ] **Step 2: UPSERTテスト**

SQL Editorで以下を実行し、式インデックスでのON CONFLICTが正しく動作するか確認:

```sql
-- INSERT テスト
SELECT upsert_club_spec(
  'テーラーメイド', 'ステルス2', 'driver', NULL,
  'テーラーメイド', 'ステルス2',
  10.5, 56, 45.75, 230, 300, 'D2', 460, 198,
  'https://example.com/image.jpg', 'https://example.com/affiliate'
);

-- 確認
SELECT * FROM club_specs WHERE maker = 'テーラーメイド';

-- UPSERT テスト（同じキーで更新されるか）
SELECT upsert_club_spec(
  'テーラーメイド', 'ステルス2', 'driver', NULL,
  'テーラーメイド', 'ステルス2',
  10.5, 56, 45.5, 235, 305, 'D2', 460, 200,
  'https://example.com/image2.jpg', 'https://example.com/affiliate2'
);

-- 値が更新されたか確認
SELECT length, distance, weight, image_url FROM club_specs WHERE maker = 'テーラーメイド';

-- verified=true テスト（更新されないか）
UPDATE club_specs SET verified = true WHERE maker = 'テーラーメイド';
SELECT upsert_club_spec(
  'テーラーメイド', 'ステルス2', 'driver', NULL,
  'テーラーメイド', 'ステルス2',
  9.0, 55, 44.0, 200, 280, 'D1', 450, 190,
  'https://example.com/should-not-update.jpg', 'https://example.com/nope'
);

-- 値が変わっていないことを確認
SELECT loft, length, image_url FROM club_specs WHERE maker = 'テーラーメイド';
-- Expected: loft=10.5, length=45.5, image_url='https://example.com/image2.jpg'

-- テストデータ削除
DELETE FROM club_specs WHERE maker = 'テーラーメイド';
```

- [ ] **Step 3: E2E動作確認**

ブラウザで `/bag/new` にアクセス:
1. ドライバーを選択
2. メーカー: `テーラーメイド`、モデル: `ステルス2` を入力
3. 「スペック自動入力」ボタンを押す
4. スペックが自動入力されることを確認
5. Supabaseダッシュボードで `club_specs` テーブルにレコードが作成されていることを確認
6. もう一度同じクラブで「スペック自動入力」→ 今度はキャッシュヒットで即座に返ることを確認（devサーバーのログでTavily/AI呼び出しがないことを確認）

- [ ] **Step 4: ビルド確認**

```bash
npm run build
```

Expected: ビルド成功

- [ ] **Step 5: コミット（ビルド修正があれば）**

必要に応じてビルドエラーを修正してコミット。
