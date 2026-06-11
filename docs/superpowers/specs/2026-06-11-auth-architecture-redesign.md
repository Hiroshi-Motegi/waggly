# 認証アーキテクチャ再設計

## 概要

マルチプロバイダ認証（Google/LINE/Apple + 将来の楽天/X/FB/Insta）の根本的な設計問題を解決するため、認証アーキテクチャを全面的に再設計する。

## 背景と問題

現在の設計では `auth.users.id = users.id` という前提で動いているが、プロバイダごとにauth.users.idが異なるため、連携・解除・再ログインのたびに矛盾が発生する。

### 主要な問題

1. **セッション上書き**: Google連携時に`signInWithOAuth`が現在のLINEセッションを上書き
2. **孤児auth user**: 連携解除時にauth.usersを削除しないため、古いセッション（JWT）が有効なまま残る
3. **ID結合の脆弱性**: `auth.users.id = users.id`の前提がマージ後に壊れる
4. **auth-providerの複雑化**: 孤児解決、プロバイダ判定、プロフィール作成がクライアント側に散在
5. **LINE Nativeのセキュリティ**: クライアントからのuserIdを検証なしで信頼している
6. **callback認証不足**: OAuth callbackでoriginalUserIdの認可チェックがない

## 設計方針

- `users.id`を独自UUID化し、`auth.users.id`とは別管理
- プロバイダ情報は`user_providers`ジャンクションテーブルで管理（拡張性重視）
- 連携時に`signInWithOAuth`を使わない（セッション上書き防止）
- 連携解除時にauth.usersを削除（孤児防止）
- 認証ロジックをサーバーAPIに集約（auth-providerはシンプルに）
- RLSはusers.idベースに書き換えて多層防御を維持
- 全APIリクエストでサーバー側がJWT→users.id逆引き（クライアント自己申告はしない）
- 全プロバイダの認証情報をサーバー側で検証（LINE Native含む）

## 新テーブル構造

```sql
-- ユーザー本体（プロバイダ非依存）
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name    TEXT NOT NULL,
  avatar_url      TEXT,
  google_email    TEXT,
  agreed_terms_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- プロバイダ紐づけ（ジャンクションテーブル）
CREATE TABLE user_providers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,          -- 'google', 'line', 'apple', etc.
  auth_user_id    UUID,                   -- Supabase auth.users.id
  provider_sub    TEXT NOT NULL,           -- プロバイダ側ユーザーID (google sub, LINE userId, etc.)
  provider_email  TEXT,                    -- プロバイダのメールアドレス
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_sub),         -- 同じプロバイダIDは1つだけ
  UNIQUE(provider, auth_user_id)          -- 同じauth userは1つだけ
);

-- RLSサブクエリ高速化用インデックス
CREATE INDEX idx_user_providers_auth_user_id ON user_providers(auth_user_id);
CREATE INDEX idx_user_providers_provider_sub ON user_providers(provider, provider_sub);
```

### 今との違い

- `users.id`がauth.users.idではなく独自UUID
- プロバイダ情報がジャンクションテーブルに分離
- プロバイダ追加時にスキーマ変更不要（行追加のみ）
- `google_id`, `line_user_id`等の個別カラムは廃止
- 将来の楽天/X/FB/Insta追加もテーブル変更なし

## ログインフロー

全プロバイダ共通：

```
1. プロバイダ認証（Google/LINE/Apple）
   → Supabase auth.users にセッション作成（auth_user_id取得）
   ↓
2. POST /api/auth/resolve-session
   （クライアントはbodyを送らない。サーバーがJWTからauth_user_idを取得）
   ↓
   サーバー側:
   ├─ user_providers.auth_user_id で検索
   ├─ 見つかった → users.id + プロフィール返却
   ├─ 見つからない → JWTメタデータからprovider_subを抽出
   │   ├─ provider_sub で user_providers 検索 → 別ユーザーが見つかる → 衝突検出
   │   └─ 誰も見つからない → 新規ユーザー + user_providers 作成 → 返却
   ↓
3. クライアント: React state に users.id + プロフィール保持
   ↓
4. 以降のAPIリクエスト:
   JWT のみ送信。サーバー側の getApiAuth() が
   JWT → auth_user_id → user_providers → users.id を逆引き
   （リクエスト内キャッシュで1回のみDB問い合わせ）
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

### getApiAuth()の変更

```typescript
// 新しい getApiAuth()（概念）
async function getApiAuth(): Promise<{ supabase: any; userId: string } | null> {
  // JWTからauth_user_idを取得（既存ロジック）
  const authUserId = ... ;

  // auth_user_id → users.id 逆引き（リクエスト内キャッシュ）
  const { data } = await supabaseAdmin
    .from("user_providers")
    .select("user_id")
    .eq("auth_user_id", authUserId)
    .single();

  if (!data) return null;
  return { supabase: supabaseAdmin, userId: data.user_id };
}
```

全データAPIはこの`userId`（= users.id）を使って`.eq("user_id", userId)`でフィルタ。クライアントからusers.idを自己申告することはない。

注意: リクエスト内キャッシュは同一リクエスト内で`getApiAuth()`が複数回呼ばれた場合の重複防止。リクエストごとに1回はuser_providersへのDB問い合わせが走る（インデックスありで1ms以下）。現在のスケールでは問題ない。将来の最適化としてSupabaseのauth hookでログイン時にJWTのcustom claimに`users.id`を注入する方式も検討可能。

## アカウント連携フロー

### Google連携

```
Web:
1. Google OAuth URL に直接リダイレクト（signInWithOAuth は使わない）
   → state パラメータにCSRFトークン + 暗号化されたuser_id を含める
2. callback でサーバーがコード交換 → google_sub 取得
3. state を検証（CSRF + user_id の認可チェック）
4. user_providers テーブルに行追加
5. 元のセッション（LINE等）は一切触らない
6. /settings にリダイレクト

Native:
1. GoogleAuth.signIn() → idToken 取得
2. POST /api/auth/link-provider { provider: "google", idToken }
3. サーバーが Google API で idToken を検証 → google_sub 取得
4. user_providers テーブルに行追加
5. 完了（セッション変更なし）
```

### LINE連携

```
Web:
1. LINE OAuth URL にリダイレクト（stateにCSRFトークン含む）
2. callback でサーバーがコード交換 → line_user_id 取得
3. state 検証 + user_providers テーブル更新
4. 元のセッション触らない

Native:
1. LineLogin.login() → accessToken 取得
2. POST /api/auth/link-provider { provider: "line", accessToken }
3. サーバーが LINE API (GET /v2/profile) でaccessToken検証 → line_user_id 取得
4. user_providers テーブルに行追加
```

### Apple連携（Web + Native）

Google連携と同じパターン。idToken検証でapple_subを取得。

### 連携時の衝突検出

link-provider API内で、連携先のprovider_subがuser_providersに既に存在する場合：
1. 衝突を検出
2. 両ユーザーのデータサマリー（件数 + 最終更新）を返す
3. クライアントが選択UIを表示（設定ページ内インライン）
4. ユーザーが選択 → 敗者のユーザー + データ + user_providers + auth.users を完全削除 → 勝者にプロバイダ行追加

### 今との最大の違い

- 連携時に`signInWithOAuth`を使わない → 現在のセッションが上書きされない
- 新しいauth.usersは連携時には作らない。ログイン時に初めて作られる
- 連携は純粋に「user_providersに行を追加」するだけ
- LINE NativeはaccessTokenをサーバーで検証（userIdの自己申告を信頼しない）
- OAuth callbackはstateパラメータでCSRF + 認可を検証

## 連携解除フロー

```
1. DELETE /api/auth/link-provider { provider: "google" }
   ↓
2. サーバー側:
   a. user_providers: 該当行を削除
   b. auth.users: 該当プロバイダの auth user を admin API で削除
      → 古いJWTはstatelessなため有効期限まで技術的に有効だが、
        RLS（user_providersに行がない）+ APIレイヤー（getApiAuthがnull返却）の
        二重防御で実質ブロックされる
   c. 最低1つのプロバイダが user_providers に残ってるか検証（全解除禁止）
   ↓
3. 現在のセッションが解除対象の場合:
   → 現在のJWTが無効になる
   → クライアントにサインアウト指示を返す → 別プロバイダで再ログインを促す
   ↓
4. 現在のセッションが別プロバイダの場合:
   → セッションに影響なし。完了
```

### クライアント側UXフロー（needsRelogin時）

```
設定ページで「Google連携を解除」ボタン押下
  ↓
確認ダイアログ:
  「Google連携を解除しますか？
   現在Googleでログイン中のため、解除後に再ログインが必要です」
  ↓
DELETE /api/auth/link-provider → { needsRelogin: true }
  ↓
設定ページ: supabase.auth.signOut()
  ↓
ネイティブ → ローカルモードに戻る（サインインボタン表示）
Web → LIFF初期化 or ランディングページ
```

別プロバイダでログイン中（例：LINEセッションでGoogleを解除）なら`needsRelogin: false`で何も起きない。

### 今との違い

- auth.usersを削除するので孤児が残らない
- リフレッシュトークンはauth.users削除で即時無効化
- アクセストークン（JWT）は有効期限まで技術的に有効だが、RLS + APIレイヤーの二重防御で実質ブロック
- セッション問題が構造的に発生しない

## データ衝突解決（ローカル→クラウド同期）

今日実装した選択UIはそのまま使う。バックエンド処理のみ変更。

### resolve-sessionの衝突判定ロジック

auth_user_idで見つからない + provider_subで既存ユーザーが見つかる場合、2パターンある：

**パターンA: 既存ユーザーへの紐づけ（衝突ではない）**
- 例: 端末AでLINEログイン済み → 端末Bで同じLINEでサインイン
- auth_user_idは新しいが、provider_subは同じ
- ネイティブにローカルデータがない → auth_user_idを既存user_providersに更新するだけ
- 選択UI不要

**パターンB: ローカルデータとの衝突**
- 例: ネイティブで未ログインのままクラブ登録 → Googleでサインイン → そのgoogle_subが別ユーザーに紐づいてる
- ネイティブにローカルデータがある → データ衝突 → 選択UI表示

判定: `ネイティブ && ローカルデータあり` の場合のみ衝突。それ以外は単純紐づけ。

### 初回サインイン（衝突あり — パターンB）

```
1. resolve-session: auth_user_id で user_providers 検索 → 見つからない
2. admin APIでraw_user_meta_dataからprovider_sub取得
3. user_providers(provider, provider_sub) で検索 → 別ユーザーが見つかる
4. ネイティブ + ローカルデータあり → 衝突レスポンス → 選択UI表示
5. ユーザーが選択:
   ├─ ローカル → 既存ユーザーのデータ削除、ローカルデータアップロード
   └─ サーバー → ローカル捨てて fullSync
6. user_providers に auth_user_id を勝者ユーザーに紐づけ
```

### アカウント連携（衝突あり）

```
1. link-provider: provider_sub が user_providers に既存 → 衝突
2. 選択UI表示
3. 敗者ユーザー + データ + user_providers + auth.users を完全削除
4. 勝者にプロバイダ行追加
```

## API設計

### 新規API

#### POST /api/auth/resolve-session

ログイン後のユーザー解決。認証はJWTから自動取得（bodyでauth_user_idを送らない）。

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
1. JWTからauth_user_idを取得
2. `user_providers.auth_user_id` で検索 → 見つかればユーザー返却
3. auth_user_idからprovider_subを取得:
   - admin APIで `auth.users.raw_user_meta_data` を取得
   - Google: `sub`フィールド、LINE: `provider_id`、Apple: `sub`
   - JWTのapp_metadataにprovider_subが含まれない場合があるため、admin API経由が確実
4. `user_providers(provider, provider_sub)` で検索 → 別ユーザーが見つかれば衝突
5. 誰も見つからない → 新規ユーザー + user_providers作成

#### POST /api/auth/link-provider

プロバイダ連携。

リクエスト:
```typescript
{
  provider: "google" | "line" | "apple";
  // Google/Apple: idToken（サーバー側で検証）
  idToken?: string;
  // LINE Native: accessToken（サーバーがLINE APIで検証）
  accessToken?: string;
  // LINE/Google/Apple Web: OAuth code（サーバーがコード交換）
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
  providerId: string;
  currentAccount: { id: string; lastUpdated: string; counts: {...}; };
  existingAccount: { id: string; lastUpdated: string; counts: {...}; };
}
```

認証情報マトリクス:

| Provider | Web | Native |
|----------|-----|--------|
| Google | code（OAuth code exchange） | idToken（GoogleAuth SDK） |
| LINE | code（OAuth code exchange） | accessToken（LINE SDK → GET /v2/profile で検証） |
| Apple | code（OAuth code exchange） | idToken（Apple Sign In SDK） |

処理:
1. idToken/accessToken/codeをサーバー側で検証してprovider_subを取得
2. user_providersでprovider_subが既に別ユーザーに紐づいてるか検索
3. 衝突あり → データサマリー付きで返却
4. 衝突なし → user_providersに行追加

#### DELETE /api/auth/link-provider

プロバイダ解除。

リクエスト:
```typescript
{ provider: "google" | "line" | "apple"; }
```

レスポンス:
```typescript
{ unlinked: true; needsRelogin: boolean; }
```

処理:
1. user_providersに最低2行あるか検証（残り1つなら拒否）
2. 該当行を削除
3. auth.users: 該当プロバイダの auth user を admin API で削除
4. 現在のセッションが解除対象 → `needsRelogin: true` を返す

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
| `supabase/api.ts` | getApiAuth()でJWT→user_providers→users.id逆引き（リクエスト内キャッシュ） |
| 全データAPI | getApiAuth()のusers.idでフィルタ（変更少ない） |

### 変更するクライアント

| ファイル | 変更内容 |
|---|---|
| `auth-provider.tsx` | resolve-sessionを叩くだけにシンプル化 |
| `native-auth.ts` | signIn後にresolve-session。孤児解決ロジック削除 |
| `settings/page.tsx` | AccountLinkingがlink-provider APIを使う |
| `liff.ts` | 変更なし（signOutで十分。auth.users削除は解除時に済み） |
| `supabase/client.ts` | 変更なし |

## RLS方針

完全撤廃ではなく、多層防御としてusers.idベースに書き換える。

```sql
-- 例: clubs テーブルのRLS
CREATE POLICY "Users can CRUD own clubs" ON clubs
  FOR ALL USING (
    user_id IN (
      SELECT user_id FROM user_providers
      WHERE auth_user_id = auth.uid()
    )
  );
```

APIレイヤー（getApiAuth）がメインの防御、RLSがバックアップ。

## マイグレーション戦略

未公開のため、DB全クリア＋新規作成でクリーンに実施する。

### 手順

1. 既存テーブルを全削除（users, clubs, accessories, practice_sessions等）
2. 既存auth.usersを全削除（Supabase admin API）
3. 新スキーマで再作成:
   - `users`テーブル（独自UUID、プロバイダカラムなし）
   - `user_providers`テーブル（ジャンクション）
   - 既存データテーブル（clubs等）はuser_idカラムのみ変更（UUID参照先が変わるだけ）
4. RLSポリシーを新形式で作成
5. 既存のRLSポリシーは削除

### ローカルSQLiteも同時にリセット

- スキーマバージョンをリセット
- usersテーブルの構造を新設計に合わせる
- user_providersに相当するローカルテーブルは不要（ローカルモードではプロバイダ管理しない）

## セキュリティ改善

1. **プロバイダ認証の検証**: 全プロバイダのトークン/コードをサーバー側で検証（LINE Native含む）
2. **callback認証**: OAuth callbackでstateパラメータによるCSRF防止 + user_idの暗号化検証
3. **auth.users削除**: 連携解除時に確実に削除してJWTを無効化
4. **users.id自己申告禁止**: 全APIでサーバー側がJWT→users.id逆引き。クライアントはJWTのみ送信
5. **RLS多層防御**: APIレイヤー + RLSの二重チェック

## 将来検討

- **データマージ**: 現在の衝突解決は「どちらかを完全削除」だが、将来的に「両方のデータをマージ」する選択肢を追加する可能性がある。現時点ではスコープ外（YAGNI）。
