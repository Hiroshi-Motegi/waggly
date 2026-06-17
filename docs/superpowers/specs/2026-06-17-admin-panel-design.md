# Admin Panel Redesign

## Overview

Wagglyの管理画面を再構築する。固定サイドバー + テーブル一覧 + 編集ページ遷移の標準CRUD管理画面パターン。今後のリソース追加（ユーザー管理、サブスク管理、問い合わせ管理等）に対応できる拡張性を持たせる。

## Tech Stack

- **SWR**（既存依存）— データフェッチ + キャッシュ + 再検証
- **@tanstack/react-table v8**（新規追加）— テーブル表示（ソート・フィルタ・ページネーション）
- **既存UI** — Tailwind CSS + shadcn系コンポーネント
- **既存API routes** — `apiFetch` 経由でサーバーサイドのサービスロールキーを使用（変更なし）

Refineは不採用。カスタムdataProviderで既存APIをラップするだけの薄いボイラープレートになり、3パッケージ追加に見合わない。

## 前提: マイグレーション

`210_club_spec_series.sql`（club_spec_seriesテーブル + club_specs.series_id）は適用済み。

## Architecture

### ルーティング

```
src/app/admin/
  layout.tsx              ← サイドバーレイアウト（"use client"）
  page.tsx                ← /admin → /admin/specs にリダイレクト
  /specs
    page.tsx              ← スペック一覧（テーブル）
    /[id]
      page.tsx            ← スペック編集
  /series
    page.tsx              ← シリーズ一覧（テーブル）
    /[id]
      page.tsx            ← シリーズ編集
  /knowledge
    page.tsx              ← ナレッジ一覧（テーブル）
    /[id]
      page.tsx            ← ナレッジ編集
    /new
      page.tsx            ← ナレッジ新規作成
```

スペックとシリーズにcreateルートがないのは、これらのデータはAI自動収集 or バッチ処理で生成されるため。adminは確認・修正が主目的。ナレッジだけは手動作成があるためnewルートを持つ。

### データフェッチパターン

```typescript
// SWR + apiFetch で統一
function useAdminList<T>(resource: string, params?: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  return useSWR<{ data: T[]; total: number }>(
    `/api/admin/${resource}?${query}`,
    (url) => apiFetch(url).then(r => r.json()),
  );
}

function useAdminOne<T>(resource: string, id: string) {
  return useSWR<T>(
    `/api/admin/${resource}/${id}`,
    (url) => apiFetch(url).then(r => r.json()),
  );
}
```

## 認証保護

### middleware.ts

現状 `/admin/*` は認証ガードがゼロ。本設計のスコープに含める。

```typescript
// src/lib/supabase/middleware.ts の publicRoutes から /admin を除外
// + admin専用チェック: ログイン済みユーザーのみ通過
```

管理者ロール（role列）による制御は別タスクとし、今回は「ログイン済みであること」を最低条件とする。未認証ユーザーは `/login` にリダイレクト。

## UI Design

### サイドバー

- 幅220px、ダークカラー（#1a1a1a）、画面左固定
- PC専用（admin画面はモバイル非対応。アクセスした場合は「PCでアクセスしてください」表示）
- セクション分け:
  - **クラブスペック**: すべて / ドライバー / FW / UT / アイアン / ウェッジ / パター
  - **シリーズ**: シリーズ一覧
  - **その他**: ナレッジ（将来: ユーザー、サブスク、問い合わせ等を追加）
- カテゴリ項目は `/admin/specs?category=iron` のようにクエリパラメータでフィルタ
- アクティブ項目はグリーンハイライト（#006728）
- トップに「Waggly Admin」ロゴ

### 一覧ページ（テーブル）

- ページタイトル + 総件数
- テーブルカラム:
  - スペック: サムネイル | メーカー | モデル | カテゴリ | 番手 | ロフト | ライ角 | 長さ | 状態 | 編集
  - シリーズ: 画像 | メーカー | モデル | スペック数 | 状態 | 編集
  - ナレッジ: タイトル | カテゴリ | ステータス | 更新日 | 編集
- ページネーション: 20件/ページ、ページ番号ナビ
- ソート: カラムヘッダークリックでトグル（asc/desc）

### 編集ページ

- パンくずナビ: クラブスペック > アイアン > Callaway Apex 4i
- 2カラム: 画像（左160px）| フォーム（右）
- フォームセクション:
  1. **基本情報**: メーカー / モデル / カテゴリ / 番手 / シリーズ選択
  2. **スペック**: ロフト / ライ角 / 長さ / 総重量 / バランス / ヘッド体積 / ヘッド重量 / 飛距離
  3. **画像・リンク**: 楽天URL逆引き / 画像URL / アフィリエイトURL（シリーズ紐づき時は非表示）
- 画像エリア下にLock/Unlock、source表示、シリーズバッジ
- アクションボタン: AI再取得 / 画像再取得 / 楽天で見る / Google検索 / 楽天検索
- 保存ボタンはヘッダーとフッター両方に配置

### シリーズ編集ページ

- 同じ2カラムレイアウト
- 基本情報: メーカー / モデル
- 画像・リンク: 楽天URL逆引き / 画像URL / アフィリエイトURL
- 紐づきスペック一覧: カテゴリ・番手・ロフトをバッジ表示 + 各スペック編集ページへのリンク

## Shared Components

admin用に新規作成:

| コンポーネント | 役割 |
|--|--|
| `AdminLayout` | サイドバー + コンテンツエリアのflex配置。admin/layout.tsxで使用 |
| `AdminSidebar` | ナビゲーションリンク。usePathnameでアクティブ判定 |
| `AdminTable` | TanStack Table wrapper。ソート・ページネーション・空状態表示 |
| `AdminBreadcrumb` | パンくずナビ。パス配列を受け取って描画 |
| `AdminFormSection` | セクションヘッダー（緑太字）+ 白背景カード + 子要素 |

配置: `src/components/admin/`

## API Route Changes

### ページネーション仕様

一覧APIは以下のクエリパラメータに対応:

| パラメータ | 型 | デフォルト | 説明 |
|--|--|--|--|
| `page` | number | 1 | ページ番号（1始まり） |
| `pageSize` | number | 20 | 1ページの件数 |
| `sort` | string | `maker` | ソートカラム名 |
| `order` | `asc` \| `desc` | `asc` | ソート順 |
| `category` | string | - | カテゴリフィルタ（specsのみ） |

レスポンス形式:
```json
{
  "data": [...],
  "total": 397,
  "page": 1,
  "pageSize": 20
}
```

totalの取得: Supabaseの `.select('*', { count: 'exact' })` を使用。

### 個別取得ルート（新規ファイル）

```
src/app/api/admin/specs/[id]/route.ts   → GET: 単一スペック（series JOIN込み）
src/app/api/admin/series/[id]/route.ts  → GET: 単一シリーズ（紐づきspecs込み）
```

### 既存ルート変更

- `GET /api/admin/specs` — ページネーション・ソート・フィルタ対応追加。レスポンスを `{ data, total, page, pageSize }` 形式に変更
- `GET /api/admin/series` — 同上
- PATCH/POST/DELETE — 変更なし

## 既存ロジックの移行方針

既存の `page-client.tsx` にはAI再取得・楽天逆引き・Lock切替などのアクションロジックが含まれる。移行方針:

1. **カスタムhooksに抽出**: `src/hooks/admin/` に配置
   - `useSpecActions(specId)` → `refreshSpec()`, `refreshImage()`, `lookupRakuten(url)`, `toggleVerified()`
   - `useSeriesActions(seriesId)` → `lookupRakuten(url)`, `toggleVerified()`
2. **新UIの編集ページで使用**: hooks経由でアクションを呼び出し、SWRのmutateで画面更新
3. **一括書き換え**: 新旧共存は複雑になるため、リソースごとに完全移行（specs完了→series完了→knowledge完了→旧削除）

## Implementation Order

1. `@tanstack/react-table` インストール
2. middleware.ts に `/admin` 認証ガード追加
3. AdminLayout + AdminSidebar（admin/layout.tsx）
4. AdminTable共通コンポーネント
5. API route拡張（ページネーション、個別取得ルート追加）
6. カスタムhooks抽出（useSpecActions, useSeriesActions）
7. スペック一覧ページ
8. スペック編集ページ
9. シリーズ一覧・編集ページ
10. ナレッジ一覧・編集ページの移行
11. 旧admin page-client.tsx 削除

## Out of Scope（今回含めない）

- ユーザー管理、サブスク管理、問い合わせ管理（将来リソースとして追加）
- 管理者ロール（role列）によるアクセス制御（認証のみ今回実装）
- 監査ログ

## 補足

- `update_club_specs_updated_at()` トリガー関数をclub_spec_seriesでも流用している。名前が紛らわしいが、汎用の `updated_at` 自動更新関数として動作するため実害なし。リネームは既存マイグレーションとの整合性を考慮して今回は見送る。
