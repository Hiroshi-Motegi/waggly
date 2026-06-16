# クラブ自動入力精度改善 + 商品情報取得

## 概要

クラブスペック自動入力をWeb検索（Tavily）併用に変更し、取得結果をDBにキャッシュして精度を継続的に向上させる。さらに楽天商品検索APIでクラブ画像とアフィリエイトリンクを取得し、一緒にキャッシュする。管理者がSupabaseで修正したデータは `verified=true` として固定し、再収集で上書きしない。

## DB変更

### マイグレーション: `209_club_specs_cache.sql`

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

-- NULLセーフなユニークインデックス（ドライバー・パター等の番手なしクラブ対応）
CREATE UNIQUE INDEX idx_club_specs_unique
  ON club_specs(maker_normalized, model_normalized, category, COALESCE(club_number, ''));

-- 検索用インデックス（正規化カラムで検索）
CREATE INDEX idx_club_specs_lookup
  ON club_specs(maker_normalized, model_normalized, category);

ALTER TABLE club_specs ENABLE ROW LEVEL SECURITY;

-- service roleはRLSをバイパスして直接アクセス。anon/authenticatedは全拒否。
CREATE POLICY "Deny all for non-service roles" ON club_specs
  FOR ALL USING (false);

-- updated_at 自動更新トリガー（Supabaseダッシュボードからの管理者編集時にも対応）
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

### 正規化カラム

`maker_normalized` / `model_normalized` はINSERT時にアプリ側で正規化した値を保存する。検索はこちらのカラムで行い、表示用には元の `maker` / `model` を使う。

正規化処理（`src/lib/normalize.ts`）:
```typescript
export function normalizeClubName(s: string): string {
  return s
    .normalize("NFKC")        // 全角英数→半角、濁点結合等
    .toLowerCase()             // 小文字化
    .replace(/\s+/g, "")       // スペース除去
    .replace(/[ー−‐]/g, "-"); // ハイフン統一
}
```

**正規化のスコープ**: Unicode正規化（全角↔半角）、大文字小文字統一、スペース除去のみ。カタカナ↔英語の変換（「テーラーメイド」↔「TaylorMade」）は行わない。これは意図的な割り切りで、カタカナ⇔英語マッピングはメーカーごとの辞書が必要になり複雑度が高い。同じクラブがカタカナと英語で別レコードになる可能性はあるが、キャッシュヒットしなければ再取得→再保存されるだけなので実害は小さい。

### シャフト・年式の扱い

現在の autofill API は `shaft_name`, `shaft_flex`, `release_year` も受け取ってプロンプトに含めているが、`club_specs` のユニークキーにはこれらを含めない。これは意図的な割り切り:

- 同モデルのシャフト違いで変わるのは主に `weight`（総重量）のみ
- シャフトまでキーに含めると組み合わせ爆発でキャッシュ効率が大幅に低下
- ヘッドスペック（loft, lie, head_volume等）はシャフトに依存しない
- AIプロンプトにはシャフト情報を引き続き含め、より正確な重量推定に使う
- キャッシュ済みの場合、重量はヘッド単体のスペックとして参考値となる

### カラム説明

- `maker` / `model`: 元の表記（表示用）
- `maker_normalized` / `model_normalized`: 正規化値（検索用）
- `image_url`: 楽天APIから取得した商品画像URL
- `affiliate_url`: 楽天アフィリエイトリンク
- `source`: `ai`（自動収集）/ `manual`（管理者手動修正）
- `verified`: `true` なら再収集で上書きしない（管理者が固定したデータ）
- `distance`: メーカー公称飛距離またはヘッドスピード40m/s想定の一般的な飛距離。プレイヤーのレベルで大きく変わるため参考値

### キャッシュの鮮度管理

`verified=false` のデータにTTL（有効期限）は設けない。誤ったキャッシュへの対処:

- **管理者対応**: Supabaseで `verified=false` のレコードを削除すれば、次回の自動入力で再取得される
- **将来検討**: ユーザーからの「不正確」フィードバックボタンを設けて、管理者にレビュー依頼を飛ばす仕組み（今回のスコープ外）

## 型定義

`src/types/database.ts` に追加:

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

## 自動入力フロー

```
ユーザー: メーカー + モデル入力 → 「スペック自動入力」押下
  ↓
1. 入力値を正規化してclub_specs DBを検索
  ↓ ヒット → スペック + 画像 + リンクを返す
  ↓ ミス
2. 並列で実行:
   a. Tavily でWeb検索（既存 searchGolfKnowledge を再利用）→ Claude Haikuでスペック抽出
   b. 楽天商品検索APIで画像URL + アフィリエイトURL取得
3. 結果を club_specs にINSERT（verified=false）
4. スペック + 画像 + リンクをユーザーに返す
```

## 楽天API連携

### セットアップ

既に楽天アフィリエイト連携が組み込み済み（`src/lib/affiliate.ts`）。追加で商品検索機能を実装する。

既存の環境変数:
- `RAKUTEN_APP_ID` — 楽天API認証用（既存設定済み）
- `NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID` — アフィリエイトID（既存設定済み、フロントからも使うためNEXT_PUBLIC）

楽天商品検索APIの認証は `applicationId`（= `RAKUTEN_APP_ID`）のみで動作する。`RAKUTEN_ACCESS_KEY` は楽天ペイ等の別APIで使用するもので、商品検索には不要。

### 商品検索

```typescript
// src/lib/rakuten-search.ts
const RAKUTEN_API = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706";

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

- `genreId: "565751"` — 楽天ジャンル「ゴルフ > クラブ」
- `hits: "1"` で最も関連性の高い1件のみ取得
- エラー時はnullを返す（スペック取得に影響させない）
- `affiliateUrl` が存在しない場合は `itemUrl` にフォールバック

### レート制限

楽天APIは1秒1リクエストの制限あり。自動入力は個別ユーザーアクションなので通常は問題ないが、連続実行時は注意。

## API変更

### POST `/api/clubs/autofill`（既存改修）

現在のフロー:
1. Claude Haikuにプロンプト送信（Web検索なし）
2. レスポンスを返す

変更後のフロー:
1. **認証**: `getApiAuth()` でユーザー認証（既存のまま）
2. **入力値を正規化**
3. **DB検索**: `getAdminClient()` で `club_specs` テーブルを正規化値で検索（RLSが全拒否のためservice roleが必要）
4. **ヒット時**: DBのスペック + 画像 + リンクをそのまま返す（AI/Web検索不要、トークン消費なし、`ai_usage` 記録なし）
5. **ミス時**:
   a. **並列実行**:
      - 既存 `searchGolfKnowledge()` でTavily検索（`src/lib/knowledge/search.ts`）→ Claude Haikuでスペック抽出
      - `searchRakutenClub()` で楽天API検索 → 画像URL + アフィリエイトURL取得
   b. **DB保存**: `getAdminClient()` で結果を `club_specs` にUPSERT（`source='ai'`, `verified=false`）
   c. **トークン記録**: `ai_usage` にINSERT（既存のまま）
   d. スペック + 画像 + リンクをレスポンス

**クライアント使い分け**: `getApiAuth()` はユーザー認証にのみ使用。`club_specs` テーブルへの SELECT/UPSERT は全て `getAdminClient()`（service role）で行う。RLSポリシーが全拒否のため、anon/authenticated クライアントではアクセスできない。

### Tavily検索の利用

既存の `searchGolfKnowledge()` を再利用する。パラメータ（`maxResults: 5`, `searchDepth: "advanced"`）はスペック取得にも適切なのでそのまま使用。検索クエリのみクラブスペック向けに構築する。

### エラーハンドリング

- **Tavily 結果0件**: 現行と同じくClaude HaikuのLLM知識ベースにフォールバック（Web検索結果なしでプロンプト送信）
- **Tavily エラー**: 同上、LLM知識ベースにフォールバック
- **楽天API エラー/レート制限**: `image_url` / `affiliate_url` をnullとしてスペックだけ返す（楽天がダウンしてもスペック自動入力は動く）
- **Claude Haiku エラー**: 500を返す（現行と同じ）

### 並行リクエスト時のコスト重複

同じクラブに対して複数ユーザーが同時にキャッシュミスした場合、Tavily + 楽天 API が複数回呼ばれる。UPSERT で安全に処理されるのでデータ破損はないが、APIコスト的には無駄がある。現時点のユーザー規模では問題ないので許容する。

### レスポンス形式の変更

```typescript
// 現在
{ loft, lie, length, distance, weight, swing_weight, head_volume, head_weight }

// 変更後
{ loft, lie, length, distance, weight, swing_weight, head_volume, head_weight, image_url, affiliate_url }
```

### DB検索クエリ

```sql
SELECT * FROM club_specs
WHERE maker_normalized = $1
  AND model_normalized = $2
  AND category = $3
  AND COALESCE(club_number, '') = COALESCE($4, '')
LIMIT 1;
```

### categoryマッピング

フォームの category 値と日本語ラベルの対応（Tavily検索クエリ構築用）:

| category | categoryLabel |
|----------|--------------|
| `driver` | ドライバー |
| `fairway_wood` | フェアウェイウッド |
| `utility` | ユーティリティ |
| `iron` | アイアン |
| `wedge` | ウェッジ |
| `putter` | パター |

これらは既存の `ClubCategory` 型（`src/types/database.ts`）で定義済みの値域と一致。

### Tavilyの検索クエリ構築

```typescript
const categoryLabels: Record<string, string> = {
  driver: "ドライバー",
  fairway_wood: "フェアウェイウッド",
  utility: "ユーティリティ",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};
const categoryLabel = categoryLabels[category] ?? category;
const query = `${maker} ${model} ${club_number ?? ""} ${categoryLabel} ゴルフ スペック ロフト角 ライ角 長さ 重量`;
```

### AIプロンプト変更

現在のプロンプト（LLMの知識のみに依存）を、Web検索結果をコンテキストとして含む形に変更:

```
以下のWeb検索結果を参考に、ゴルフクラブのスペック情報をJSON形式で回答してください。
検索結果に記載されている情報のみを使用し、推測はしないでください。
該当する情報がない項目はnullにしてください。

## Web検索結果
{searchResults}

## クラブ情報
メーカー: {maker}
モデル: {model}
種別: {category}
番手: {club_number}

以下のJSON形式で回答してください。JSON以外のテキストは不要です:
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
```

Tavily結果が0件の場合は `## Web検索結果` セクションを省略し、現行と同等のプロンプト（LLM知識ベース）にフォールバック。

### UPSERT時のverifiedチェック

```sql
INSERT INTO club_specs (maker, model, category, club_number, maker_normalized, model_normalized, loft, lie, ..., image_url, affiliate_url)
VALUES ($1, $2, $3, $4, $5, $6, ..., $15, $16)
ON CONFLICT (maker_normalized, model_normalized, category, COALESCE(club_number, ''))
DO UPDATE SET
  loft = EXCLUDED.loft,
  lie = EXCLUDED.lie,
  ...,
  image_url = EXCLUDED.image_url,
  affiliate_url = EXCLUDED.affiliate_url
WHERE club_specs.verified = false;
```

`verified=true` のレコードは `WHERE` 句で更新をスキップ。`updated_at` はトリガーで自動更新。

## フロントエンド変更

### クラブフォーム (`src/components/club/club-form.tsx`)

自動入力レスポンスに `image_url` と `affiliate_url` が含まれるが、今回はフォーム側では無視する（既存のスペックフィールドのみ使用）。

DB側に保存しておくことで、将来のUI拡張（クラブカタログページ、購入リンク表示等）時にすぐ使える。

## 管理者運用

Supabaseダッシュボードで `club_specs` テーブルを直接編集:
- スペック値を修正
- `image_url` / `affiliate_url` を修正（必要に応じて）
- `source` を `manual` に変更
- `verified` を `true` に変更
- **誤ったキャッシュの削除**: `verified=false` のレコードを削除すれば、次回の自動入力で再取得される

以降、`verified=true` の同じクラブの自動入力ではこの修正済みデータが返される。

## 環境変数

既存設定済み（追加不要）:
- `RAKUTEN_APP_ID` — 楽天API認証用
- `NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID` — アフィリエイトID
- `TAVILY_API_KEY` — Web検索用

`RAKUTEN_ACCESS_KEY` は楽天ペイ等の別API用。商品検索には不要。

## 影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `supabase/migrations/209_club_specs_cache.sql` | テーブル + トリガー作成 |
| `src/types/database.ts` | ClubSpec型追加 |
| `src/lib/normalize.ts` | メーカー/モデル名正規化ユーティリティ（新規） |
| `src/lib/rakuten-search.ts` | 楽天商品検索API（新規） |
| `src/app/api/clubs/autofill/route.ts` | DB検索 + Web検索 + 楽天API併用に改修 |
| `src/lib/knowledge/search.ts` | 変更なし（既存の `searchGolfKnowledge` を再利用） |
| `src/lib/supabase/api.ts` | 変更なし（既存の `getAdminClient` パターンを使用） |

### マイグレーション番号

209 — 最新208（contact_report）の次。衝突なし。
