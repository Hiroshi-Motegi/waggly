# クラブVS比較ページ — 設計仕様

## 概要

クラブスペックのVS比較ページを自動生成し、SEO流入を狙う。CPUベンチマーク比較サイトのように、メーカー横断でクラブスペックを並べて比較できるページを提供する。

## ゴール

- 「G440 vs X FORGED 比較」等のロングテールキーワードで検索流入を獲得
- メーカー横断の全カテゴリ（ドライバー/FW/UT/アイアン/ウェッジ/パター）対応
- DBの組み合わせから数百〜数千の比較ページを自動生成

## DB設計

3層構造。ユーザーのclubsテーブルとスペック項目を揃える。

### catalog_series（シリーズ）

G440、Paradym Ai Smoke など製品ファミリーの単位。

| カラム | 型 | 説明 |
|--------|------|------|
| id | uuid PK | |
| maker | text NOT NULL | "PING" |
| name | text NOT NULL | "G440" |
| maker_slug | text NOT NULL | "ping"（URL用） |
| name_slug | text NOT NULL | "g440"（URL用） |
| image_url | text | 製品画像 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**ユニーク制約:** `(maker_slug, name_slug)`

### catalog_models（モデル）

G440アイアン、G440 MAXドライバー など、比較の単位。

| カラム | 型 | 説明 |
|--------|------|------|
| id | uuid PK | |
| series_id | uuid FK → catalog_series | NOT NULL |
| name | text NOT NULL | "G440 アイアン" |
| category | text NOT NULL | "iron" / "driver" / "fairway_wood" / "utility" / "wedge" / "putter" |
| category_slug | text NOT NULL | "iron"（URL用） |
| head_material | text | "ハイパー17-4ステンレススチール" |
| finish | text | "ハイドロパールクローム仕上げ" |
| price | integer | 31900（税込、1本あたり） |
| price_note | text | "カーボン" / "スチール" 等の補足 |
| release_year | integer | 2025 |
| shaft_names | text[] | {"ALTA J CB BLUE","AWT 3.0 LITE"} |
| grip_name | text | "GP360 LITE TOUR VELVET ROUND" |
| url | text | メーカー公式ページURL |
| image_url | text | 製品画像 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**ユニーク制約:** `(series_id, category)`

### catalog_specs（番手別スペック）

番手ごとのスペック行。clubsテーブルと項目を揃える。

| カラム | 型 | 説明 |
|--------|------|------|
| id | uuid PK | |
| model_id | uuid FK → catalog_models | NOT NULL |
| club_number | text NOT NULL | "7I" / "1W" / "PW" |
| loft | numeric | ロフト角（°） |
| lie | numeric | ライ角（°） |
| bounce | numeric | バウンス角（°） |
| length | numeric | 標準クラブ長さ（inch） |
| weight | numeric | 標準総重量（g） |
| swing_weight | text | バランス（"D1"等） |
| head_volume | numeric | ヘッド体積（cc）ドライバー/FW |
| head_weight | numeric | ヘッド重量（g） |
| face_angle | numeric | フェース角（°）ドライバー |
| sort_order | integer | 番手の並び順 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**ユニーク制約:** `(model_id, club_number)`

### RLS

全テーブルとも公開読み取り可能（SEOページとして公開するため）。書き込みはservice roleのみ。

## URL設計

### カタログ系

```
/catalog                                  → 全メーカー一覧
/catalog/:maker                           → メーカー内シリーズ一覧
/catalog/:maker/:series                   → シリーズ内モデル一覧
/catalog/:maker/:series/:category         → モデル詳細 + スペック表
```

例：
- `/catalog/ping` → PINGのシリーズ一覧
- `/catalog/ping/g440` → G440のモデル一覧（ドライバー、アイアン...）
- `/catalog/ping/g440/iron` → G440アイアンのスペック表

### 比較系

```
/compare/:category                        → カテゴリ別比較インデックス
/compare/:category/:modelA-vs-:modelB     → VS比較ページ
```

例：
- `/compare/iron` → アイアン比較一覧（SEOインデックス）
- `/compare/iron/ping-g440-vs-titleist-x-forged` → VS比較ページ

slugは `{maker_slug}-{name_slug}` を結合して生成（例: `ping-g440`）。

## ページ構成

### モデル詳細ページ（`/catalog/:maker/:series/:category`）

- 製品画像
- 基本情報（素材、仕上げ、価格、発売年）
- 番手別スペック表
- 標準シャフト一覧
- **「他モデルと比較」ボタン** → 相手モデル選択 → 比較ページへ遷移

### 比較インデックスページ（`/compare/:category`）

- カテゴリ内の全モデル組み合わせリンク一覧
- Googleクローラーが全比較ページを辿るための導線

### VS比較ページ（`/compare/:category/:slug`）

- 2モデルの基本情報を横並び
- 番手別スペック比較表（同番手を横に並べる）
- カテゴリにより表示項目を変える：
  - **ドライバー**: loft, lie, length, weight, swing_weight, head_volume, head_weight, face_angle
  - **アイアン**: loft, lie, bounce, length, weight, swing_weight
  - **ウェッジ**: loft, lie, bounce, length, weight, swing_weight
  - **パター**: loft, lie, length, weight, swing_weight

## SEO対策

- `<title>`: 「G440 アイアン vs X FORGED 比較 | Waggly」
- `<meta description>`: 番手別ロフト角・ライ角の比較を自動生成
- JSON-LD構造化データでProduct情報をマークアップ
- ISR（Incremental Static Regeneration）でページ生成、revalidate=86400（1日）
- 比較インデックスページでクローラビリティ確保
- sitemap.xmlに全カタログ・比較ページのURLを含める

## レンダリング方式

- Next.js ISR を使用
- テンプレートファイルは最小限：
  - `src/app/catalog/[maker]/page.tsx`
  - `src/app/catalog/[maker]/[series]/page.tsx`
  - `src/app/catalog/[maker]/[series]/[category]/page.tsx`
  - `src/app/compare/[category]/page.tsx`
  - `src/app/compare/[category]/[slug]/page.tsx`
- DBの組み合わせから動的にページ生成

## スペック項目とclubsテーブルの対応

| catalog_specs | clubs | VS比較で使用 |
|---------------|-------|:-:|
| loft | loft | ✅ |
| lie | lie | ✅ |
| bounce | bounce | ✅ |
| length | length | ✅ |
| weight | weight | ✅ |
| swing_weight | swing_weight | ✅ |
| head_volume | head_volume | ✅ |
| head_weight | head_weight | ✅ |
| face_angle | face_angle | ✅ |

clubsテーブルにあるがカタログスペックに不要な項目：
- shaft_flex, shaft_weight, kick_point（シャフト依存の個人設定）
- grip_size（個人設定）
- distance（個人差が大きい）

## データ収集

- メーカー公式サイト・カタログPDFからスペック表を収集
- Admin UIで手動入力（将来的に自動収集スクリプトも検討）
- 初期はPING + 主要メーカー数社から開始

## 対象外（今回のスコープ外）

- ユーザーレビュー・統計の紐付け（ユーザー増加後の将来施策）
- シャフト単体の詳細スペックDB
- 3モデル以上の同時比較
- ユーザーのclubsとcatalog_specsのリンク機能
