# Admin CRUD 管理画面 設計

## 概要

カタログ（モデル・スペック・シャフト・メーカー）とお知らせのCRUD管理画面。既存のadmin基盤（認証・レイアウト・テーブルコンポーネント）を活用して構築する。

## スコープ

1. カタログモデル管理（一覧・追加・編集・削除）
2. カタログスペック管理（横型テーブルでの番手別編集）
3. シャフト管理（独立マスターデータ）
4. グリップ管理（独立マスターデータ）
5. メーカー管理（一覧・追加・編集・並べ替え・表示切替）
6. お知らせ管理（一覧・作成・編集・削除・公開制御）
7. 登録クラブ管理（全ユーザーのクラブ一覧・カタログモデル紐付け）
8. 登録アイテム一覧（全ユーザーのアイテム閲覧。将来カタログ化予定）
9. ダッシュボード（KPI表示・週次推移グラフ）

## DB変更

### 新テーブル: `catalog_shafts`

シャフトの独立マスターデータ。クラブモデルには紐付かない。

```
catalog_shafts
  id: uuid (PK)
  shaft_name: text NOT NULL
  maker: text NULL               -- シャフトメーカー（フジクラ、日本シャフト等）
  shaft_type: text NULL          -- カーボンシャフト / スチールシャフト
  flex: text NULL                -- R, SR, S, X, S200 等
  shaft_weight: numeric NULL     -- g
  torque: numeric NULL           -- 度
  kick_point: text NULL          -- 先調子, 中調子, 元調子 等
  image_url: text NULL           -- シャフト画像
  is_visible: boolean DEFAULT true                 -- 公開/非公開
  verification_status: text DEFAULT 'unverified'  -- 'verified' / 'in_review' / 'unverified'
  spec_updated_at: timestamptz NULL               -- 最終スペック更新日時（手動設定可）
  sort_order: integer DEFAULT 0
  created_at: timestamptz DEFAULT now()
  updated_at: timestamptz DEFAULT now()
```

### 新テーブル: `catalog_grips`

グリップの独立マスターデータ。

```
catalog_grips
  id: uuid (PK)
  grip_name: text NOT NULL
  maker: text NULL               -- グリップメーカー（Golf Pride, IOMIC等）
  grip_size: text NULL           -- M58, M60, M62 等
  weight: numeric NULL           -- g
  material: text NULL            -- ラバー, コード 等
  image_url: text NULL           -- グリップ画像
  is_visible: boolean DEFAULT true                 -- 公開/非公開
  verification_status: text DEFAULT 'unverified'  -- 'verified' / 'in_review' / 'unverified'
  spec_updated_at: timestamptz NULL               -- 最終スペック更新日時（手動設定可）
  sort_order: integer DEFAULT 0
  created_at: timestamptz DEFAULT now()
  updated_at: timestamptz DEFAULT now()
```

### 新テーブル: `catalog_model_attributes`

モデルのその他情報（キーバリュー形式）。ルール適合、ヘッド形状、備考等の自由入力。

```
catalog_model_attributes
  id: uuid (PK)
  model_id: uuid (FK → catalog_models)
  label: text NOT NULL           -- "ルールの適合/不適合", "ヘッド形状" 等
  value: text NOT NULL           -- "2010年角溝ルール適合", "キャビティ" 等
  sort_order: integer DEFAULT 0
  created_at: timestamptz DEFAULT now()
```

### 新テーブル: `catalog_model_links`

モデルの購入先リンク（ラベル+URL）。

```
catalog_model_links
  id: uuid (PK)
  model_id: uuid (FK → catalog_models)
  label: text NOT NULL           -- "Amazon", "楽天市場", "アルペン" 等
  url: text NOT NULL
  sort_order: integer DEFAULT 0
  created_at: timestamptz DEFAULT now()
```

### 新テーブル: `catalog_model_images`

モデルの画像（複数）。Supabase Storageに保存し、URLを記録。

```
catalog_model_images
  id: uuid (PK)
  model_id: uuid (FK → catalog_models)
  image_url: text NOT NULL
  sort_order: integer DEFAULT 0  -- 0 = メイン画像
  created_at: timestamptz DEFAULT now()
```

### 既存テーブル変更: `catalog_models`

確認ステータスと最終スペック更新日時を追加。

```
catalog_models (既存テーブルに追加)
  verification_status: text DEFAULT 'unverified'  -- 'verified' / 'in_review' / 'unverified'
  spec_updated_at: timestamptz NULL               -- 最終スペック更新日時（手動設定可）
```

### 既存テーブル変更: `clubs`

カタログモデルとの紐付け用カラムを追加。

```
clubs (既存テーブルに追加)
  catalog_model_id: uuid NULL (FK → catalog_models)  -- カタログとの紐付け
```

既存テーブル `catalog_specs` の変更はなし。`shaft_name`/`shaft_flex` はクラブ重量・バランスの前提となるシャフト情報のラベルとしてそのまま使う。

### データの関係

- `catalog_shafts` は独立マスター（どのモデルにも紐付かない）
- `catalog_specs` の `shaft_name`/`shaft_flex` は `catalog_shafts` の参照ラベル（FKではない。メーカー公表値の前提条件として記録）
- モデル編集画面でシャフトを選ぶ際、`catalog_shafts` から呼び出してラベルを設定

## ルーティング

### ページ

| パス | 内容 |
|------|------|
| `/admin` | ダッシュボード |
| `/admin/catalog/models` | モデル一覧（検索・フィルタ付き） |
| `/admin/catalog/models/new` | モデル新規作成 |
| `/admin/catalog/models/[id]` | モデル編集 + スペック管理（2セクション） |
| `/admin/catalog/shafts` | シャフト一覧・管理 |
| `/admin/catalog/grips` | グリップ一覧・管理 |
| `/admin/catalog/makers` | メーカー一覧・編集 |
| `/admin/clubs` | マイクラブ一覧・カタログ紐付け |
| `/admin/items` | アイテム一覧（閲覧のみ） |
| `/admin/announcements` | お知らせ一覧 |
| `/admin/announcements/new` | お知らせ新規作成 |
| `/admin/announcements/[id]` | お知らせ編集 |

### API

| メソッド | パス | 内容 |
|----------|------|------|
| GET/POST/PATCH/DELETE | `/api/admin/catalog/models` | モデルCRUD（既存を拡張、DELETE追加） |
| GET/POST/PATCH/DELETE | `/api/admin/catalog/specs` | スペックCRUD（既存を拡張、DELETE追加） |
| GET/POST/PATCH/DELETE | `/api/admin/catalog/shafts` | シャフトマスターCRUD（新規） |
| GET/POST/PATCH/DELETE | `/api/admin/catalog/grips` | グリップマスターCRUD（新規） |
| GET/POST/PATCH | `/api/admin/catalog/makers` | メーカー管理（既存を拡張、POST追加） |
| GET | `/api/admin/clubs` | 登録クラブ一覧（新規） |
| GET | `/api/admin/items` | 登録アイテム一覧（新規） |
| GET | `/api/admin/dashboard` | ダッシュボードKPI集計（新規） |
| PATCH | `/api/admin/clubs/[id]` | カタログ紐付け更新（新規） |
| GET/POST | `/api/admin/announcements` | お知らせ一覧・作成（新規） |
| GET/PATCH/DELETE | `/api/admin/announcements/[id]` | お知らせ個別操作（新規） |

全APIで `requireAdmin()` による認証ガード。

## 画面設計

### サイドバー

既存の `AdminSidebar` を拡張:

```
ダッシュボード
カタログ
  モデル管理
  シャフト管理
  グリップ管理
  メーカー管理
ユーザーデータ
  登録クラブ
  登録アイテム
コンテンツ
  お知らせ
  ナレッジベース（既存）
```

### 0. ダッシュボード (`/admin`)

運営KPIの一覧表示。

**KPIカード（上部横並び）:**
- 総会員数（+先週比）
- 有料会員数
- 総クラブ登録数（+先週比）
- 練習記録数（今週）

**グラフ（下部）:**
- 新規登録数の週次推移（過去12週）
- クラブ登録数の週次推移（過去12週）

**集計方法:** DBの `created_at` タイムスタンプから集計。外部サービス不要。`/api/admin/dashboard` で全KPIを一括返却。

### 1. モデル一覧 (`/admin/catalog/models`)

**フィルタ:**
- テキスト検索（モデル名）
- メーカー（プルダウン）
- カテゴリ（プルダウン: ドライバー/FW/UT/アイアン/ウェッジ/パター）
- 発売年（プルダウン）
- 公開状態（プルダウン: 全て/公開中/非公開）
- 確認状態（プルダウン: 全て/確認済み/確認中/未確認）
- チェックボックス: 「スペックなしのみ」

**テーブル列:** モデル名、メーカー、カテゴリ、発売年、スペック数、確認状態、公開、操作（編集リンク）

既存の `AdminTable` コンポーネントを使用。ページネーション付き（20件/ページ）。

**一括操作:** チェックボックスで複数選択 →
- 「公開にする」「非公開にする」
- 「確認済み」「確認中」「未確認」に変更

**アクション:** 「+ 新規追加」ボタン → `/admin/catalog/models/new`

### 2. モデル編集 (`/admin/catalog/models/[id]`)

**基本情報セクション:**
- モデル名、メーカー（プルダウン）、カテゴリ（プルダウン）
- 発売年、発売月、Slug、価格
- 表示/非表示チェックボックス

**セクション1: ヘッドスペック（横型テーブル）:**

番手を列、スペック項目を行とする横型テーブル。セルをクリックして直接編集。

- デフォルト行: ロフト角、ライ角、クラブ長さ
- 「+ 項目追加」ボタン → プルダウンで `catalog_specs` のカラムから選択（バンス角、ヘッド体積、ヘッド重量、フェース角、将来追加カラムも自動対応）
- 「+ 番手追加」ボタン → 列追加
- 番手列の「×」で列削除
- 空セルは「-」表示。DBには null として保存。

**セクション2: シャフト別クラブスペック（横型テーブル）:**

同じく横型テーブル。シャフト×スペック項目の行、番手が列。

- デフォルト行: 重量(g)、バランス
- 「+ 項目追加」でDB内カラムを追加可能（将来カラム追加時も自動対応）
- 「+ シャフト追加」→ `catalog_shafts` マスターからプルダウンで呼出。シャフト名・フレックスがラベルとして設定される
- シャフトごとに背景色を交互表示（視認性向上）
- 各シャフトのクラブ重量・バランス等はメーカー公表値をそのまま入力（シャフトスペックからの自動計算はしない）

**画像セクション:**

クラブの画像を複数登録。Supabase Storageに保存。

- ドラッグ&ドロップまたはファイル選択で複数アップロード
- サムネイルのグリッド表示
- 1枚目がメイン画像（カタログ一覧・詳細で使用）。ドラッグで並べ替え可能
- 各画像に削除ボタン
- `catalog_model_images` テーブルに保存

**購入先リンクセクション:**

購入先のリンクを複数登録。ラベルとURLのペア。

- 「+ リンク追加」ボタンで行追加
- ラベル例: Amazon、楽天市場、アルペン、メーカー公式
- URL入力欄
- 行の並べ替え（↑↓）、削除可能
- `catalog_model_links` テーブルに保存

**セクション3: その他情報（キーバリューテーブル）:**

見出し（ラベル）と内容のペアを自由に追加できるテーブル。

- 「+ 行追加」ボタンでラベル・値の入力行を追加
- ラベル例: ルールの適合/不適合、ヘッド形状、重心などの測定値、その他
- 値はMarkdown入力対応（長文テキスト・リスト・改行等）
- 行の並べ替え（↑↓）、削除可能
- `catalog_model_attributes` テーブルに保存

**ボタン:** 保存、キャンセル、削除（確認ダイアログ付き）

### 3. モデル新規作成 (`/admin/catalog/models/new`)

モデル編集と同じフォーム。基本情報のみ入力して保存 → 保存後に編集画面に遷移してスペック入力。

### 4. シャフト管理 (`/admin/catalog/shafts`)

シャフトの独立マスターデータ管理。

**フィルタ:**
- テキスト検索（シャフト名）
- 種類（プルダウン: 全て/カーボン/スチール）
- メーカー（プルダウン）

**テーブル列:** シャフト名、メーカー、種類、フレックス、重量(g)、トルク(°)、キックポイント、確認状態、公開、操作

**一括操作:** チェックボックスで複数選択 →
- 「公開にする」「非公開にする」
- 「確認済み」「確認中」「未確認」に変更

**アクション:**
- 「+ 新規追加」ボタン → インライン or モーダルで入力
- 行の「複製」ボタン（同シャフト別フレックスの効率入力）
- 行の「編集」「削除」ボタン

### 5. メーカー管理 (`/admin/catalog/makers`)

**テーブル列:** 並び順（↑↓ボタン）、名前、日本語名、Slug、モデル数、表示状態、操作

**インライン編集:** 行クリックでモーダル or インライン展開して名前・日本語名・Slugを編集。

**アクション:** 「+ 新規追加」ボタン、表示/非表示トグル。

### 6. マイクラブ管理 (`/admin/clubs`)

全ユーザーの登録クラブ一覧。カタログモデルとの手動紐付け。

**フィルタ:**
- テキスト検索（メーカー名・モデル名）
- 紐付け状態（プルダウン: 全て/未紐付け/紐付け済み）
- カテゴリ（プルダウン）

**テーブル列:** ユーザー名、メーカー、モデル名、カテゴリ、カタログ紐付け、操作

**紐付け操作:**
- 未紐付けの行に「紐付け」ボタン → カタログモデル検索モーダル → 選択して紐付け
- 紐付け済みの行はカタログモデル名をリンク表示 + 「解除」ボタン
- 紐付けると `clubs.catalog_model_id` に `catalog_models.id` を保存

**名刺連携:**
- 紐付け済みクラブは、ユーザーの名刺ページ (`/p/[username]`) でクラブ名がカタログ詳細 (`/catalog/[maker]/[slug]`) へのリンクになる

### 7. アイテム一覧 (`/admin/items`)

全ユーザーの登録アイテム一覧。閲覧のみ（将来カタログ化予定）。

**フィルタ:**
- テキスト検索（アイテム名）
- カテゴリ（プルダウン）

**テーブル列:** ユーザー名、アイテム名、カテゴリ、登録日

**備考:** 現時点ではCRUD不要。ユーザーがどんなアイテムを登録しているかの把握用。将来的にアイテムカタログ化する際にカタログ紐付け機能を追加する。

### 8. お知らせ一覧 (`/admin/announcements`)

**フィルタ:**
- カテゴリ（プルダウン: 全て/お知らせ/機能追加/メンテナンス/キャンペーン）
- ステータス（プルダウン: 全て/公開中/下書き）

**テーブル列:** タイトル、カテゴリ（バッジ表示）、公開日、状態、操作（編集リンク）

### 7. お知らせ編集 (`/admin/announcements/[id]`)

**フォーム:**
- タイトル（テキスト）
- カテゴリ（プルダウン: info/feature/maintenance/campaign）
- 公開日（date picker）
- 本文（Markdown テキストエリア）
- 公開する（チェックボックス）

**ボタン:** 保存、キャンセル、削除（確認ダイアログ付き）

## 技術方針

- 既存コンポーネント活用: `AdminTable`, `AdminSidebar`, `AdminFormSection`, `AdminBreadcrumb`
- 全ページ `"use client"` のClient Component（管理画面なのでSSR不要）
- API層: `requireAdmin()` で認証、`adminClient`（service_role）でDB操作
- 横型スペックテーブルは専用コンポーネント `SpecGridEditor` として新規作成
- お知らせ本文はMarkdown入力（表示側が既にMarkdown対応済み）
- 削除操作は全て確認ダイアログ（`window.confirm`）を表示
- 「+ 項目追加」はDBカラム名をプルダウンで選択、将来カラム追加時は選択肢が自然に増える設計
- シャフト呼出は `catalog_shafts` マスターからプルダウン選択、未登録シャフトはシャフト管理で先に追加
