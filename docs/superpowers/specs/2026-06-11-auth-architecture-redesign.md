# 認証アーキテクチャ再設計

## 概要

マルチプロバイダ認証（Google/LINE/Apple）の根本的な設計問題を解決するため、認証アーキテクチャを全面的に再設計する。

## 背景と問題

現在の設計では `auth.users.id = users.id` という前提で動いているが、プロバイダごとにauth.users.idが異なるため、連携・解除・再ログインのたびに矛盾が発生する。

### 主要な問題

1. **セッション上書き**: Google連携時に`signInWithOAuth`が現在のLINEセッションを上書き
2. **孤児auth user**: 連携解除時にauth.usersを削除しないため、古いセッション（JWT）が有効なまま残る
3. **ID結合の脆弱性**: `auth.users.id = users.id`の前提がマージ後に壊れる
4. **auth-providerの複雑化**: 孤児解決、プロバイダ判定、プロフィール作成がクライアント側に散在

## 設計方針

- `users.id`を独自UUID化し、`auth.users.id`とは別管理
- プロバイダ情報はusersテーブルにカラムで保持
- 連携時に`signInWithOAuth`を使わない（セッション上書き防止）
- 連携解除時にauth.usersを削除（孤児防止）
- 認証ロジックをサーバーAPIに集約（auth-providerはシンプルに）
- RLSは使わず、APIレイヤーで`users.id`ベースのアクセス制御

## 新テーブル構造

```sql
users:
  id              UUID PRIMARY KEY  -- 独自生成（auth.users.idとは無関係）
  google_auth_id  TEXT NULL         -- auth.users.id (Google)
  line_auth_id    TEXT NULL         -- auth.users.id (LINE)
  apple_auth_id   TEXT NULL         -- auth.users.id (Apple)
  google_sub      TEXT NULL         -- Google sub（プロバイダ側ユーザーID）
  line_user_id    TEXT NULL         -- LINE userId
  apple_sub       TEXT NULL         -- Apple sub
  display_name    TEXT NOT NULL
  avatar_url      TEXT NULL
  google_email    TEXT NULL
  agreed_terms_at TEXT NULL
  created_at      TEXT NOT NULL
```

### 今との違い

- `id`がauth.users.idではなく独自UUID
- `xxx_auth_id`カラム追加（auth.users.idとの紐づけ用）
- `xxx_sub`/`xxx_user_id`カラムでプロバイダ側IDを保持（連携検出用）
- 将来のプロバイダ追加（楽天/X/FB/Insta）はカラム追加で対応

## ログインフロー

全プロバイダ共通：

```
1. プロバイダ認証（Google/LINE/Apple）
   → Supabase auth.users にセッション作成（auth_user_id取得）
   ↓
2. POST /api/auth/resolve-session { auth_user_id, provider }
   ↓
   サーバー側:
   ├─ google_auth_id / line_auth_id / apple_auth_id で users 検索
   ├─ 見つかった → users.id + プロフィール返却
   ├─ 見つからないが provider_sub で別ユーザーが見つかる → 衝突検出（データ選択UIへ）
   └─ 完全に見つからない → 新規ユーザー作成 → 返却
   ↓
3. クライアント: React state に users.id + プロフィール保持
   ↓
4. 以降のAPIリクエスト: JWT(認証) + users.id(ビジネスロジック)
```

### auth-providerの変更

```typescript
// 新しい auth-provider（概念）
async function authenticate() {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    // 未ログイン → ネイティブならローカルモード、WebならLIFF or ランディング
    return;
  }

  const res = await apiFetch("/api/auth/resolve-session", {
    method: "POST",
    body: JSON.stringify({
      auth_user_id: authUser.id,
      provider: authUser.app_metadata?.provider,
    }),
  });

  if (res.ok) {
    const { user, conflict } = await res.json();
    if (conflict) {
      // 衝突 → 選択UIへ
    } else {
      setUser(user);
    }
  }
}
```

今のauth-providerにある孤児解決、プロバイダ判定、プロフィール作成ロジックは全て`resolve-session`API側に移動する。

## アカウント連携フロー

### Google連携

```
Web:
1. Google OAuth URL に直接リダイレクト（signInWithOAuth は使わない）
2. callback でサーバーがコード交換 → google_sub 取得
3. POST /api/auth/link-provider で users テーブル更新
4. 元のセッション（LINE等）は一切触らない
5. /settings にリダイレクト

Native:
1. GoogleAuth.signIn() → idToken 取得
2. POST /api/auth/link-provider { provider: "google", idToken }
3. サーバーが idToken 検証 → google_sub 取得 → users テーブル更新
4. 完了（セッション変更なし）
```

### LINE連携

```
Web:
1. LINE OAuth URL にリダイレクト
2. callback でサーバーがコード交換 → line_user_id 取得
3. POST /api/auth/link-provider で users テーブル更新
4. 元のセッション触らない

Native:
1. LineLogin.login() → userId 取得
2. POST /api/auth/link-provider { provider: "line", userId }
3. サーバーが users テーブル更新
```

### Apple連携

Google連携と同じパターン。idToken検証でapple_subを取得。

### 連携時の衝突検出

link-provider API内で、連携先のプロバイダIDが既に別ユーザーに紐づいている場合：
1. 衝突を検出
2. 両ユーザーのデータサマリー（件数 + 最終更新）を返す
3. クライアントが選択UIを表示（設定ページ内インライン）
4. ユーザーが選択 → 敗者のユーザー + データ + auth.users を完全削除 → 勝者にプロバイダ情報付与

### 今との最大の違い

- 連携時に`signInWithOAuth`を使わない → 現在のセッションが上書きされない
- 新しいauth.usersは連携時には作らない。ログイン時に初めて作られる
- 連携は純粋に「usersテーブルにプロバイダIDを書く」だけ

## 連携解除フロー

```
1. DELETE /api/auth/link-provider { provider: "google" }
   ↓
2. サーバー側:
   a. users: google_sub = null, google_auth_id = null, google_email = null
   b. auth.users: google の auth user を削除（admin API）
      → 古いJWTも自動無効化
   c. 最低1つのプロバイダが残ってるか検証（全解除禁止）
   ↓
3. 現在のセッションが解除対象の場合:
   → 現在のJWTが無効になる
   → クライアント: サインアウト → 別プロバイダで再ログインを促す
   ↓
4. 現在のセッションが別プロバイダの場合:
   → セッションに影響なし。完了
```

### 今との違い

- auth.usersを削除するので孤児が残らない
- 古いJWTが自動で無効化されるのでセッション問題が構造的に発生しない

## データ衝突解決（ローカル→クラウド同期）

今日実装した選択UIはそのまま使う。バックエンド処理のみ変更。

### 初回サインイン（衝突あり）

```
1. resolve-session: auth_user_id で users 検索 → 見つからない
2. provider_sub（google_sub等）で検索 → 別ユーザーが見つかる → 衝突
3. 選択UI表示
4. ユーザーが選択:
   ├─ ローカル → 既存ユーザーのデータ削除、ローカルデータアップロード
   └─ サーバー → ローカル捨てて fullSync
5. auth_user_id を勝者ユーザーに紐づけ
```

### アカウント連携（衝突あり）

```
1. link-provider: provider_sub が別ユーザーに紐づいてる → 衝突
2. 選択UI表示
3. 敗者ユーザー + データ + auth.users を完全削除
4. 勝者に新プロバイダ情報付与
```

## API設計

### 新規API

#### POST /api/auth/resolve-session

ログイン後のユーザー解決。

リクエスト:
```typescript
{ auth_user_id: string; provider: string; }
```

レスポンス（正常）:
```typescript
{ user: User; conflict: false; }
```

レスポンス（衝突）:
```typescript
{
  conflict: true;
  existingUser: { wid: string; lastUpdated: string; counts: {...}; };
}
```

レスポンス（新規作成）:
```typescript
{ user: User; conflict: false; isNew: true; }
```

処理:
1. `xxx_auth_id = auth_user_id` で users 検索
2. 見つかった → ユーザー返却
3. 見つからない → `xxx_sub`でプロバイダメタデータから検索
4. 別ユーザーが見つかった → 衝突レスポンス
5. 誰も見つからない → 新規ユーザー作成

#### POST /api/auth/link-provider

プロバイダ連携。

リクエスト:
```typescript
{
  provider: "google" | "line" | "apple";
  // Google/Apple: idToken で検証
  idToken?: string;
  // LINE Native: userId 直接
  userId?: string;
  // LINE Web: OAuth code
  code?: string;
  redirectUri?: string;
}
```

レスポンス（成功）:
```typescript
{ linked: true; }
```

レスポンス（衝突）:
```typescript
{
  needsConfirm: true;
  currentAccount: { id: string; lastUpdated: string; counts: {...}; };
  existingAccount: { id: string; lastUpdated: string; counts: {...}; };
  providerId: string;
}
```

処理:
1. idToken/code/userIdを検証してプロバイダIDを取得
2. そのプロバイダIDが別ユーザーに紐づいてるか検索
3. 衝突あり → データサマリー付きで返却
4. 衝突なし → usersテーブル更新

#### DELETE /api/auth/link-provider

プロバイダ解除。

リクエスト:
```typescript
{ provider: "google" | "line" | "apple"; }
```

処理:
1. 最低1つのプロバイダが残るか検証
2. usersテーブル: xxx_sub, xxx_auth_id, xxx_email を null
3. auth.users: 該当プロバイダの auth user を admin API で削除
4. 現在のセッションが解除対象 → クライアントにサインアウト指示

### 廃止するAPI

| エンドポイント | 理由 |
|---|---|
| `/api/auth/resolve-google-user` | resolve-sessionに統合 |
| `/api/auth/link` (POST/DELETE) | link-providerに統合 |
| `/api/auth/check-conflict` | resolve-sessionに統合 |
| `/api/auth/resolve-conflict` | resolve-sessionとlink-providerに統合 |

### 変更するAPI

| エンドポイント | 変更内容 |
|---|---|
| `/api/auth/line` | resolve-sessionパターンに合わせる |
| `/api/auth/line-oauth` | 同上 |
| `/api/auth/callback` | signInWithOAuth廃止、直接OAuth + link-provider |
| 全データAPI | RLS依存をやめ、resolve済みusers.idでフィルタ |

### 変更するクライアント

| ファイル | 変更内容 |
|---|---|
| `auth-provider.tsx` | resolve-sessionを叩くだけにシンプル化 |
| `native-auth.ts` | signIn後にresolve-session。孤児解決ロジック削除 |
| `settings/page.tsx` | AccountLinkingがlink-provider APIを使う |
| `liff.ts` | 変更なし（signOutで十分。auth.users削除は解除時に済み） |
| `supabase/client.ts` | 変更なし |
| `supabase/api.ts` | getApiAuth()でauth_user_id→users.id変換を追加 |

## マイグレーション戦略

既存データの移行:

1. usersテーブルに新カラム追加（google_auth_id, line_auth_id, apple_auth_id, google_sub, apple_sub）
2. 既存データを移行:
   - 現在の`id`（= auth.users.id）を`google_auth_id`または`line_auth_id`にコピー
   - 現在の`google_id`を`google_sub`にコピー
   - 現在の`line_user_id`のうちプレースホルダでないものをそのまま保持
3. 新しい独自UUIDで`id`を付け替え
4. 全データテーブル（clubs, accessories等）の`user_id`を新しいIDに更新
5. RLSポリシーを削除（APIレイヤーで制御に移行）

### 注意

- マイグレーションはダウンタイムが必要（IDの付け替えが発生）
- または段階的移行：新カラム追加 → デュアル対応 → 旧カラム削除

## セキュリティ改善

1. **callback認証**: OAuth callbackでoriginalUserIdを検証（JWTまたはサーバーサイドstate）
2. **CSRF対策**: 連携リダイレクト時にstateパラメータで検証
3. **auth.users削除**: 連携解除時に確実に削除してJWTを無効化
4. **APIレイヤー認証**: 全データAPIでresolve済みusers.idを使用、RLS不要
