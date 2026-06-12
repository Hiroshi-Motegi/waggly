# オンボーディングと利用規約同意の分離

## 概要

オンボーディング（アプリ紹介）と利用規約同意を完全に分離する。現状はオンボーディングの中に利用規約同意が含まれており、ログイン状態による分岐が複雑になっている。

## 設計方針

2つの機能を独立させる:

- **オンボーディング** = アプリ紹介スライド。利用規約とは無関係
- **利用規約同意** = サインイン済みユーザーのみ対象。オンボーディングとは無関係

## オンボーディング

- 現在のスライド1-3（アプリ紹介）のみ。スライド4（利用規約）は削除
- `localStorage.onboarding_version` で制御（変更なし）
- ログイン状態に関係なく、初回起動時に表示
- 完了後はHOMEへ

## 利用規約同意

### 判定条件

**1つだけ:** `!user.agreed_terms_at || user.agreed_terms_at < TERMS_UPDATED_AT`

この条件が true なら同意画面を表示。

| ケース | agreed_terms_at | 同意画面 |
|---|---|---|
| 新規ユーザー（初回サインイン） | null | 出す |
| 既存ユーザー（同意済み） | >= TERMS_UPDATED_AT | 出さない |
| 既存ユーザー（規約改変後） | < TERMS_UPDATED_AT | 出す |
| 既存ユーザー（DB不整合） | null | 出す |
| 未ログイン | — | 出さない（対象外） |

### 表示タイミング

- サインイン完了直後（resolve-session の後）
- アプリ起動時にログイン済みだが未同意の場合（規約改変後のケース）

### 同意画面の内容

- 利用規約の要約 + 全文リンク
- 「同意する」チェックボックス + 「はじめる」ボタン
- 現在のオンボーディング スライド4 と同等の内容を独立した画面として切り出す

### 同意の記録

- `POST /api/auth/agree` → `users.agreed_terms_at = NOW()`（既存APIをそのまま使用）

## フロー

```
初回起動（未ログイン）:
  オンボーディング(3スライド) → HOME → ローカルで自由に利用

サインイン時:
  サインイン → resolve-session → agreed_terms_at チェック
    → 同意済み → HOME
    → 未同意  → 利用規約同意画面 → 同意 → HOME

規約改変後（ログイン済みユーザー）:
  アプリ起動 → agreed_terms_at < TERMS_UPDATED_AT
    → 利用規約同意画面 → 再同意 → HOME
```

## 対象ファイル

### 修正
- `src/components/onboarding.tsx` — スライド4（利用規約）を削除、TOTAL_SLIDES を 3 に
- `src/components/app-shell.tsx` — オンボーディングと利用規約の判定を分離

### 新規作成
- `src/components/terms-agreement.tsx` — 利用規約同意画面（独立コンポーネント）

### 変更なし
- `src/lib/constants.ts` — `TERMS_UPDATED_AT`, `ONBOARDING_VERSION` はそのまま使用
- `src/app/api/auth/agree/route.ts` — 既存APIをそのまま使用

## app-shell.tsx の判定ロジック（修正後）

```typescript
// オンボーディング: localStorage のみ、ログイン状態無関係
const needsOnboarding = !onboardingDone;

// 利用規約: ログイン済みユーザーのみ、DB の agreed_terms_at で判定
const needsTermsAgreement = user && (
  !user.agreed_terms_at || new Date(user.agreed_terms_at) < new Date(TERMS_UPDATED_AT)
);

// 表示優先順位: オンボーディング → 利用規約 → 通常画面
// オンボーディング/利用規約を表示する場合は children をレンダリングしない
// （通常画面のヘッダー・ナビ・ページ本体を一切見せない）
if (needsOnboarding) return <Onboarding onComplete={...} />;
if (needsTermsAgreement) return <TermsAgreement onAgree={...} />;
// ここに到達 = オンボーディング済み & 利用規約同意済み（or 未ログイン）
return <>{children}</>;
```
