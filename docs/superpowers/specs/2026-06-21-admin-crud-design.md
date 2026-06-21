# Admin CRUD 管理画面 設計

## 概要

カタログ（モデル・スペック・シャフト・メーカー）とお知らせのCRUD管理画面。既存のadmin基盤（認証・レイアウト・テーブルコンポーネント）を活用して構築する。

## スコープ

1. カタログモデル管理（一覧・追加・編集・削除）
2. カタログスペック管理（横型テーブルでの番手別編集）
3. シャフトスペック管理（モデル単位のシャフト情報）
4. メーカー管理（一覧・追加・編集・並べ替え・表示切替）
5. お知らせ管理（一覧・作成・編集・削除・公開制御）

## DB変更

### 新テーブル: `catalog_shaft_specs`

モデル単位のシャフトスペック。番手には依存しない。

```
catalog_shaft_specs
  id: uuid (PK)
  model_id: uuid (FK → catalog_models)
  shaft_name: text NOT NULL
  shaft_type: text NULL          -- カーボンシャフト / スチールシャフト
  flex: text NULL                -- R, SR, S, X, S200 等
  shaft_weight: numeric NULL     -- g
  torque: numeric NULL           -- 度
  kick_point: text NULL          -- 先調子, 中調子, 元調子 等
  sort_order: integer DEFAULT 0
  created_at: timestamptz DEFAULT now()
  updated_at: timestamptz DEFAULT now()
```

既存テーブルの変更はなし。`catalog_specs` の `shaft_name`/`shaft_flex` はクラブ重量・バランスとの紐付け用にそのまま使う。

## ルーティング

### ページ

| パス | 内容 |
|------|------|
| `/admin` | → `/admin/catalog/models` にリダイレクト |
| `/admin/catalog/models` | モデル一覧（検索・フィルタ付き） |
| `/admin/catalog/models/new` | モデル新規作成 |
| `/admin/catalog/models/[id]` | モデル編集 + スペック管理（3セクション） |
| `/admin/catalog/makers` | メーカー一覧・編集 |
| `/admin/announcements` | お知らせ一覧 |
| `/admin/announcements/new` | お知らせ新規作成 |
| `/admin/announcements/[id]` | お知らせ編集 |

### API

| メソッド | パス | 内容 |
|----------|------|------|
| GET/POST/PATCH/DELETE | `/api/admin/catalog/models` | モデルCRUD（既存を拡張、DELETE追加） |
| GET/POST/PATCH/DELETE | `/api/admin/catalog/specs` | スペックCRUD（既存を拡張、DELETE追加） |
| GET/POST/PATCH/DELETE | `/api/admin/catalog/shaft-specs` | シャフトスペックCRUD（新規） |
| GET/POST/PATCH | `/api/admin/catalog/makers` | メーカー管理（既存を拡張、POST追加） |
| GET/POST | `/api/admin/announcements` | お知らせ一覧・作成（新規） |
| GET/PATCH/DELETE | `/api/admin/announcements/[id]` | お知らせ個別操作（新規） |

全APIで `requireAdmin()` による認証ガード。

## 画面設計

### サイドバー

既存の `AdminSidebar` を拡張:

```
カタログ
  モデル管理
  メーカー管理
コンテンツ
  お知らせ
  ナレッジベース（既存）
```

### 1. モデル一覧 (`/admin/catalog/models`)

**フィルタ:**
- テキスト検索（モデル名）
- メーカー（プルダウン）
- カテゴリ（プルダウン: ドライバー/FW/UT/アイアン/ウェッジ/パター）
- 発売年（プルダウン）
- ステータス（プルダウン: 全て/表示中/非表示）
- チェックボックス: 「スペックなしのみ」

**テーブル列:** モデル名、メーカー、カテゴリ、発売年、スペック数、表示状態、操作（編集リンク）

既存の `AdminTable` コンポーネントを使用。ページネーション付き（20件/ページ）。

**アクション:** 「+ 新規追加」ボタン → `/admin/catalog/models/new`

### 2. モデル編集 (`/admin/catalog/models/[id]`)

**基本情報セクション:**
- モデル名、メーカー（プルダウン）、カテゴリ（プルダウン）
- 発売年、発売月、Slug、価格
- 表示/非表示チェックボックス

**ヘッドスペックセクション（横型テーブル）:**

番手を列、スペック項目を行とする横型テーブル。セルをクリックして直接編集。

- デフォルト行: ロフト角、ライ角、クラブ長さ
- 「+ 項目追加」ボタン → プルダウンで `catalog_specs` のカラムから選択（バンス角、ヘッド体積、ヘッド重量、フェース角）
- 「+ 番手追加」ボタン → 列追加
- 番手列の「×」で列削除

空セルは「-」表示。DBには null として保存。

**シャフト別クラブスペックセクション（横型テーブル）:**

同じく横型テーブル。シャフト名×スペック項目の行、番手が列。

- デフォルト行: 重量(g)、バランス
- 「+ 項目追加」でDB内カラムを追加可能
- 「+ シャフト追加」でシャフト名・フレックスを入力して行セットを追加
- シャフトごとに背景色を交互表示（視認性向上）

**シャフトスペックセクション:**

モデル単位のシャフト情報テーブル（番手に依存しない）。

- 列: シャフト名、種類（カーボン/スチール）、フレックス、シャフト重量(g)、トルク(度)、キックポイント
- 1行1シャフト×フレックス
- 「+ シャフト追加」ボタン
- 行の複製ボタン（同シャフト別フレックスの入力効率化）
- 行の削除ボタン

**ボタン:** 保存、キャンセル、削除（確認ダイアログ付き）

### 3. モデル新規作成 (`/admin/catalog/models/new`)

モデル編集と同じフォーム。基本情報のみ入力して保存 → 保存後に編集画面に遷移してスペック入力。

### 4. メーカー管理 (`/admin/catalog/makers`)

**テーブル列:** 並び順（↑↓ボタン）、名前、日本語名、Slug、モデル数、表示状態、操作

**インライン編集:** 行クリックでモーダル or インライン展開して名前・日本語名・Slugを編集。

**アクション:** 「+ 新規追加」ボタン、表示/非表示トグル。

### 5. お知らせ一覧 (`/admin/announcements`)

**フィルタ:**
- カテゴリ（プルダウン: 全て/お知らせ/機能追加/メンテナンス/キャンペーン）
- ステータス（プルダウン: 全て/公開中/下書き）

**テーブル列:** タイトル、カテゴリ（バッジ表示）、公開日、状態、操作（編集リンク）

### 6. お知らせ編集 (`/admin/announcements/[id]`)

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
