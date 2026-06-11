# ローカル→クラウドデータ同期設計

## 概要

ネイティブアプリで未ログイン状態で作成したローカルデータと、サインイン/アカウント連携時のサーバーデータの衝突を検出し、ユーザーに選択させて統合する仕組み。

## 背景

現状、未ログインでSQLiteにデータを作成した後にサインインすると、`fullSync()`がサーバーデータでローカルを上書きし、ローカルデータが消失する。Androidアプリは未ログインでも使える設計のため、ユーザーが先にデータを作ってからサインインする流れは自然であり、データ消失は許容できない。

## 設計方針

- **ユーザーに選ばせる**: どちらのデータを使うか全体一括で選択
- **負けた側は完全削除**: データ + ユーザーレコード + auth.usersごと削除。復元不可。利用規約で明記
- **サーバー主導型**: 統合処理はサーバー側トランザクションで安全に実行
- **統一的なフロー**: 初回サインインとアカウント連携で同じ選択UIパターンを使用

## フロー

### 選択UIが表示されるケース（WID衝突あり）

| 場面 | 条件 | 選択肢 |
|------|------|--------|
| 初回サインイン | サインイン先のGoogle/Apple/LINEが既にWIDを持っている | ローカルデータ vs サーバーデータ |
| アカウント連携 | 連携先のGoogle/Apple/LINEが既にWIDを持っている | 現在のWIDデータ vs 連携先のWIDデータ |

### 選択UIが表示されないケース（WID衝突なし）

| 場面 | 条件 | 動作 |
|------|------|------|
| 初回サインイン | サインイン先がWIDを持っていない | ローカルデータを新WIDに紐づけてアップロード、通常同期開始 |
| アカウント連携 | 連携先がWIDを持っていない | プロバイダ情報を付与するだけ |

### 初回サインインフロー

```
ユーザーがサインイン（Google/Apple/LINE）
  ↓
認証成功 → サーバーに衝突チェック要求
  POST /api/auth/check-conflict
  ↓
┌─ 衝突なし（そのプロバイダにWIDが紐づいていない）
│   → ローカルデータあり: 新WID作成、ローカルデータをアップロード、fullSync、ホーム
│   → ローカルデータなし: 新WID作成、fullSync、ホーム
│
└─ 衝突あり（既存WIDが見つかった）
    → サーバーが既存WIDのサマリーを返す
    → クライアントがローカル側のサマリーを補完して選択UI表示
    → ユーザーが選択
      ↓
    ┌─「ローカルデータを使う」
    │   POST /api/auth/resolve-conflict { choice: "local", localData: {...} }
    │   → 既存WIDのデータを削除（WID自体は残す）
    │   → ローカルデータをその既存WIDでINSERT
    │   → 既存WIDのセッションでfullSync、ホーム
    │   ※ 初回サインインではローカル側にWIDがないため、
    │     既存WIDを引き継いでデータだけ入れ替える
    │
    ├─「サーバーデータを使う」
    │   POST /api/auth/resolve-conflict { choice: "server" }
    │   → ローカルは捨てる、既存WIDのセッションでfullSync、ホーム
    │
    └─「キャンセル」
        → 認証セッション破棄、元の状態に戻る
```

### アカウント連携フロー

```
ユーザーが「Googleを連携する」を押す
  ↓
OAuth認証成功 → サーバーに衝突チェック要求
  POST /api/auth/check-conflict
  ↓
┌─ 衝突なし
│   → プロバイダ情報を付与、完了
│
└─ 衝突あり（連携先Googleに別WIDが紐づいている）
    → サーバーが両側のサマリーを返す
    → 選択UI表示
      ↓
    ┌─「現在のデータを使う」
    │   POST /api/auth/resolve-conflict { choice: "current" }
    │   → 敗者WID完全削除、勝者にプロバイダ付与
    │
    ├─「連携先のデータを使う」
    │   POST /api/auth/resolve-conflict { choice: "existing" }
    │   → 敗者WID完全削除、勝者にプロバイダ付与、セッション切替
    │
    └─「キャンセル」
        → 連携せず元の状態に戻る
```

## 選択UI

### 画面

フルスクリーンページ（`/auth/resolve-conflict`）。選択が完了するまでホーム画面には遷移させない。

### レイアウト

```
┌──────────────────────────────────┐
│                                  │
│   使用するデータを選んでください    │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ ローカルのデータ              │ │
│ │ クラブ: 14件 練習記録: 8件    │ │
│ │ アクセサリー: 3件             │ │
│ │ 最終更新: 2026/12/12 13:11  │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ [NEW] Googleアカウントのデータ │ │
│ │ クラブ: 5件 練習記録: 2件     │ │
│ │ アクセサリー: 1件             │ │
│ │ 最終更新: 2026/12/13 13:11  │ │
│ └──────────────────────────────┘ │
│                                  │
│  ⚠ 選ばなかった側のデータは       │
│    削除され、復元できません        │
│                                  │
│        [ キャンセル ]             │
│                                  │
└──────────────────────────────────┘
```

### 表示要素

- **データソース名**: 「ローカルのデータ」「Googleアカウントのデータ」「LINEアカウントのデータ」等
- **[NEW]バッジ**: 新たに連携/サインインした側に付与
- **件数**: clubs, practice_sessions, accessories の各件数
- **最終更新日時**: `sync_meta`から取得（ローカル側）/ サーバーAPIから取得（サーバー側）
- **データなし表示**: 件数0の場合「データはありません」
- **警告文**: 選ばなかった側は削除される旨
- **キャンセルボタン**: 連携/サインイン自体を取りやめ

### 選択操作

カードをタップで選択状態（ハイライト）→ 確認ダイアログ「○○のデータを使用します。もう一方のデータは削除されます。よろしいですか？」→ OK で実行。

## サーバーAPI

### POST /api/auth/check-conflict

衝突の有無を判定し、衝突時はデータサマリーを返す。

**リクエスト:**
```typescript
{
  provider: "google" | "apple" | "line";
  providerUserId: string;       // Google sub, LINE userId, Apple sub
  currentWid?: string;           // アカウント連携時のみ（現在のユーザーID）
}
```

**レスポンス（衝突なし）:**
```typescript
{ conflict: false }
```

**レスポンス（衝突あり）:**
```typescript
{
  conflict: true;
  existingUser: {
    wid: string;
    lastUpdated: string;          // ISO 8601
    counts: { clubs: number; practices: number; accessories: number; }
  };
  currentUser?: {                  // アカウント連携時のみ
    wid: string;
    lastUpdated: string;
    counts: { clubs: number; practices: number; accessories: number; }
  };
}
```

**処理:** `google_id` / `line_user_id` / `apple_id` でusersテーブルを検索。ヒット＆別WIDなら衝突あり。

### POST /api/auth/resolve-conflict

選択結果に基づいて統合処理を実行。全てトランザクション内で処理。

**リクエスト:**
```typescript
{
  scenario: "first-signin" | "account-linking";
  provider: "google" | "apple" | "line";
  providerUserId: string;
  choice: "local" | "server" | "current" | "existing";
  winnerWid?: string;
  loserWid?: string;
  localData?: {                   // ローカルデータ選択時のみ
    clubs: Club[];
    accessories: Accessory[];
    practiceSessions: PracticeSession[];
  };
}
```

**レスポンス:**
```typescript
{
  success: true;
  userId: string;                  // 最終的に使うWID
  sessionToken?: string;           // セッション切替が必要な場合
}
```

**サーバー処理（トランザクション内）:**

初回サインイン（WID衝突あり）:
1. 既存WIDのデータを削除（ローカル選択時のみ）
2. ローカルデータ選択時: localDataを既存WIDでINSERT
3. 既存WIDのセッションを返す
※ 初回サインインではローカル側にWIDがないため、敗者ユーザー削除は発生しない

アカウント連携（WID衝突あり）:
1. 敗者のデータ削除（clubs, accessories, practice_sessions + 子テーブルはCASCADE）
2. 敗者のユーザー削除（usersテーブル + auth.users）
3. 勝者にプロバイダ情報付与（google_id, line_user_id等を更新）
4. 必要に応じて新規セッション発行（勝者が連携先の場合）

### GET /api/auth/data-summary

ログイン中ユーザーのデータサマリーを返す。アカウント連携時のcurrentUser情報取得用。

```typescript
{
  wid: string;
  lastUpdated: string;
  counts: { clubs: number; practices: number; accessories: number; }
}
```

## クライアント実装

### sync_meta拡張

`sync_meta`テーブルに`last_data_updated`カラムを追加。`mutateData()`内でデータ変更のたびにUPSERT。選択UI表示時に1行SELECTで取得。

### ローカルデータサマリー取得

```typescript
getLocalDataSummary(): {
  lastUpdated: string | null;
  counts: { clubs: number; practices: number; accessories: number; }
}
```

件数は`SELECT COUNT(*) FROM <table> WHERE user_id = 'local'`で取得。最終更新は`sync_meta.last_data_updated`から。

### サインイン/連携フローの変更

現状:
```
認証成功 → fullSync() → ホーム画面
```

新しい流れ:
```
認証成功
  → check-conflict API呼び出し
  → 衝突なし + ローカルデータあり → ローカルデータをアップロード → fullSync → ホーム
  → 衝突なし + ローカルデータなし → fullSync → ホーム
  → 衝突あり → /auth/resolve-conflict ページに遷移（ブロッキング）
    → 選択完了 → resolve-conflict API → fullSync → ホーム
    → キャンセル → セッション破棄 → 元の状態に戻る
```

### 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/lib/native-auth.ts` | サインイン後にcheck-conflict呼び出し、衝突時はページ遷移 |
| `src/lib/sync.ts` | ローカルデータアップロード関数追加 |
| `src/lib/sqlite/schema.ts` | `sync_meta`に`last_data_updated`追加 |
| `src/lib/sqlite/migrations.ts` | マイグレーション追加 |
| `src/lib/data-store.ts` | `mutateData()`で`last_data_updated`更新 |
| `src/app/auth/resolve-conflict/page.tsx` | **新規** 選択UIページ |
| `src/app/api/auth/check-conflict/route.ts` | **新規** 衝突チェックAPI |
| `src/app/api/auth/resolve-conflict/route.ts` | **新規** 統合処理API |
| `src/app/api/auth/data-summary/route.ts` | **新規** サマリーAPI |
| `src/components/auth-provider.tsx` | 連携フローに衝突チェック追加 |

## エラーハンドリング

- **resolve-conflict APIが途中で失敗**: トランザクションでロールバック。クライアントにエラー表示、再試行可能
- **ネットワーク断**: 選択UIページで待機、再接続後にリトライ
- **ローカルデータアップロード**: クラブ数百件は非現実的なので当面ページネーション不要
