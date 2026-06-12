# 認証リアーキテクチャ 残課題 + UX改善

## 概要

2026-06-12 に実施した認証アーキテクチャ再設計の残課題と、セッション中に発見されたUX改善をまとめる。

## A. デバッグログ・デバッグ用 alert の削除

実装中のデバッグ用コードが残っている。本番に不要なので全削除する。

### 対象

- `src/app/settings/page.tsx`: サインインエラーの `alert()` (`サインインエラー:`, `サインイン例外:`)
- `src/app/settings/page.tsx`: LINE accessToken チェックの `alert()`（削除済みの可能性あり、要確認）
- サーバー側 API ルートの `console.log("[link-provider]"` 等（削除済みの可能性あり、要確認）

### 作業

1. `grep -r "alert\|console\.log.*link-provider\|console\.log.*resolve-session\|console\.log.*callback" src/ --include="*.ts" --include="*.tsx"` で残りを検索
2. デバッグ用のものを全削除
3. 本番で必要なエラーハンドリング（`alert("連携に失敗しました")` 等）は残す

## B. E2E 自動テスト

認証フローの自動テストを Vitest で実装する。サーバーサイド API のユニットテスト。

### テスト対象

#### resolve-session (POST)

| ケース | 入力 | 期待結果 |
|--------|------|----------|
| Case 1: 既存ユーザー（ローカルデータなし） | auth_user_id が user_providers に存在 | `{ user, conflict: false }` |
| Case 1: 既存ユーザー（ローカルデータあり、日時一致） | hasLocalData=true, localLastUpdated=サーバーと同じ | `{ user, conflict: false }` |
| Case 1: 既存ユーザー（ローカルデータあり、日時不一致） | hasLocalData=true, localLastUpdated=異なる | `{ conflict: true, existingUser: {...} }` |
| Case 1: 既存ユーザー（ローカルデータあり、サーバーデータなし） | hasLocalData=true, サーバー件数0 | `{ user, uploadLocal: true }` |
| Case 2: provider_sub で見つかる（ローカルデータなし） | auth_user_id なし、provider_sub 一致 | auth_user_id 更新、`{ user, conflict: false }` |
| Case 2: provider_sub で見つかる（ローカルデータあり） | hasLocalData=true | `{ conflict: true }` |
| Case 3: 新規ユーザー | 何も見つからない | users + user_providers 作成、`{ user, isNew: true }` |

#### resolve-session (PUT)

| ケース | 入力 | 期待結果 |
|--------|------|----------|
| ローカル選択 | choice="local", localData あり | サーバーデータ削除、ローカルデータ挿入 |
| サーバー選択 | choice="server" | データ変更なし、user_providers 更新 |
| provider/providerSub なし（再ログイン衝突） | choice="local" | provider 更新スキップ、データのみ処理 |

#### link-provider (POST)

| ケース | 入力 | 期待結果 |
|--------|------|----------|
| 新規連携（衝突なし） | provider, accessToken/idToken | user_providers に行追加、`{ linked: true }` |
| 衝突あり（確認なし） | provider_sub が別ユーザーに存在 | `{ needsConfirm: true, currentAccount, existingAccount }` |
| 衝突あり（マージ確認） | confirmMerge=true, keepAccountId | 敗者削除、勝者にプロバイダ移動、`{ merged: true }` |
| 既にリンク済み | 同じ user_id に同じ provider | `{ alreadyLinked: true }` |

#### link-provider (DELETE)

| ケース | 入力 | 期待結果 |
|--------|------|----------|
| 正常解除 | 2つ以上のプロバイダ、ログイン中でない方 | user_providers 削除、`{ unlinked: true, needsRelogin: false }` |
| 最後の1つ | 1つしかない | 400: `最低1つのログイン方法が必要です` |
| ログイン中のプロバイダ | auth_user_id が現在のセッション | 400: `現在...でログイン中のため解除できません` |

#### providers (GET)

| ケース | 期待結果 |
|--------|----------|
| 正常 | `[{ provider, provider_email, is_current }]` |
| 未認証 | 401 |

#### getApiAuth

| ケース | 期待結果 |
|--------|----------|
| Bearer トークン（user_providers あり） | `{ supabase, userId: users.id }` |
| Bearer トークン（user_providers なし） | `null` |
| Cookie セッション（user_providers あり） | `{ supabase, userId: users.id }` |
| Dev モード | dev ユーザー自動作成 |

#### extractProviderInfo

既にテスト済み（`__tests__/lib/auth-helpers.test.ts`）。追加不要。

### テスト方針

- Supabase クライアントをモックし、`user_providers` / `users` テーブルの操作を検証
- `getApiAuth` / `getApiAuthWithAuthUserId` をモックして API ルートハンドラを直接テスト
- テストファイル: `__tests__/api/auth/resolve-session.test.ts`, `__tests__/api/auth/link-provider.test.ts` 等

## C. UX改善: 処理中のローディング表示 + 操作ブロック

### 問題

サーバー通信中（ログアウト、サインイン、連携/解除、衝突解決）に UI がフリーズしたように見え、ユーザーが不安になる。誤操作（二重タップ等）も防げない。

### 対象操作

| 操作 | メッセージ | 所要時間目安 |
|------|-----------|------------|
| ログアウト | ログアウト中... | 2-5秒（fullSync + signOut） |
| Google サインイン | ログイン中... | 10-30秒（signInWithIdToken + resolve-session + fullSync） |
| LINE サインイン | ログイン中... | 10-30秒（同上） |
| プロバイダ連携 | 連携中... | 2-5秒 |
| プロバイダ解除 | 解除中... | 1-2秒 |
| 衝突解決 | データを処理中... | 3-10秒（データ削除/挿入 + fullSync） |

### 実装方針

フルスクリーンオーバーレイ + スピナー + メッセージ。

```tsx
// 共通コンポーネント
function ProcessingOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
        <p className="text-white font-bold">{message}</p>
      </div>
    </div>
  );
}
```

使用箇所:
- `src/app/settings/page.tsx`: サインイン、連携/解除、衝突解決、ログアウト
- `src/lib/liff.ts` の `liffLogout`: 直接 DOM 操作は避け、settings ページ側で状態管理

### 状態管理

```tsx
const [processing, setProcessing] = useState<string | null>(null);
// processing が non-null の場合にオーバーレイ表示

// 使用例
setProcessing("ログアウト中...");
await liffLogout();
setProcessing(null);
```

ログアウトは `liffLogout` 内で `fullSync` + `signOut` を行うが、呼び出し元で `processing` 状態を管理する。`liffLogout` を直接 `onClick` に渡すのではなく、ラッパー関数で囲む。
