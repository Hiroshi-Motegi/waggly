# オンボーディングの DB 管理化

## 概要

オンボーディング表示判定を localStorage から DB (`users.onboarding_version`) に移行する。ユーザー単位で管理することで、クロスデバイス・マルチアカウントで正しく動作するようにする。

## 背景

現状は localStorage にオンボーディング完了状態を保存しているため:
- 同じブラウザで別アカウントがログイン → 見てないのにスキップされる
- 同じアカウントで別端末 → 見たのに再表示される
- 新規ユーザー作成（LINE再ログイン等） → 同じブラウザだとスキップされる

## 設計

### DB変更

`users` テーブルに `onboarding_version` カラムを追加。

- 型: `integer`, default `0`, NOT NULL
- 新規ユーザー作成時: `0`（未閲覧）
- オンボーディング完了時: `ONBOARDING_VERSION` の値を書き込む

### 判定ロジック (app-shell.tsx)

ログイン済みの場合は DB のみで判定、localStorage は補助。

```
ログイン済み:
  localStorage と DB の大きい方を「実効バージョン」とする
  実効バージョン < ONBOARDING_VERSION → オンボーディング表示
  実効バージョン >= ONBOARDING_VERSION → スキップ

未ログイン（ネイティブ）:
  localStorage フォールバック（従来通り）

未ログイン（Web）:
  オンボーディング不要（ログインページが表示される）
```

この「大きい方を取る」方式により、未ログインで localStorage 完了 → ログイン（DB=0）のケースでもチラつかずにスキップできる。マージ API は裏で非同期に呼ぶだけで、判定をブロックしない。

**ローディング中のガード:** `isLoading` が true かつ `!native` の間は判定を行わない（ローディング画面を表示）。ネイティブの場合は `onboardingChecked` が false の間ガード。

### ログイン直後の localStorage → DB マージ

未ログインで localStorage 完了済み → ログインした場合、DB を追いつかせる。

```typescript
// app-shell.tsx の useEffect 内
const mergedRef = useRef(false);

useEffect(() => {
  if (!user || mergedRef.current) return;
  mergedRef.current = true;

  const localVersion = parseInt(localStorage.getItem("onboarding_version") || "0", 10);
  if (localVersion > (user.onboarding_version ?? 0)) {
    apiFetch("/api/auth/onboarding-complete", { method: "POST" }).catch(() => {});
  }
}, [user]);
```

- `useRef` で1回だけ実行（user や依存値の変更による再実行を防止）
- 判定自体は `Math.max(localStorage, DB)` で行うので、API 完了を待たなくてよい
- API が失敗しても次回ログイン時に再試行される

### ログアウト時の localStorage クリア

別アカウントでログインした際に前のアカウントの localStorage 値がマージされないよう、ログアウト時に `onboarding_version` をクリアする。

`src/lib/liff.ts` の `liffLogout` に追加:
```typescript
localStorage.removeItem("onboarding_version");
```

### 完了時の処理順序

API を先に呼び、成功後に localStorage を更新する。失敗時は localStorage を更新しない（次回再試行）。

```
ログイン済み:
  1. POST /api/auth/onboarding-complete
  2. 成功 → localStorage.setItem("onboarding_version", ONBOARDING_VERSION)
  3. UI 状態更新（window.location.reload() で user を再取得）

未ログイン:
  1. localStorage のみ更新
  2. setOnboardingDone(true)
```

### API

`POST /api/auth/onboarding-complete`（新規作成）

- 成功時: `{ success: true, onboarding_version: N }` を返す
- クライアント側は `window.location.reload()` で auth コンテキストの user を再取得する（SWR のキャッシュに `onboarding_version` が反映される）

```typescript
import { NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { ONBOARDING_VERSION } from "@/lib/constants";

export async function POST() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();

  const { error } = await auth.supabase
    .from("users")
    .update({ onboarding_version: ONBOARDING_VERSION })
    .eq("id", auth.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, onboarding_version: ONBOARDING_VERSION });
}
```

### User 型の更新

`src/types/database.ts` の `User` インターフェースに `onboarding_version: number` を追加。

### SQLite スキーマ + マイグレーション

`src/lib/sqlite/schema.ts` の users テーブルに `onboarding_version INTEGER DEFAULT 0` を追加。

SQLite マイグレーションで既存ローカルユーザーも `ONBOARDING_VERSION` にセット:

```sql
ALTER TABLE users ADD COLUMN onboarding_version INTEGER DEFAULT 0;
UPDATE users SET onboarding_version = 2;
```

### Supabase マイグレーション

既存ユーザーのデフォルト `0` は「未閲覧」扱いになるため、既存ユーザーを現在の `ONBOARDING_VERSION` にセットする。

```sql
ALTER TABLE users ADD COLUMN onboarding_version INTEGER DEFAULT 0 NOT NULL;
UPDATE users SET onboarding_version = 2;  -- 現在の ONBOARDING_VERSION
```

### 前スペック (terms-separation) との関係

`docs/superpowers/specs/2026-06-12-onboarding-terms-separation.md` ではオンボーディングを localStorage 制御と記載しているが、本スペックで DB 管理に置き換える。本スペックが terms-separation の後に適用される前提。app-shell.tsx の判定ロジックは本スペックの内容が最終形。

### 将来の拡張

`ONBOARDING_VERSION` をインクリメントし、バージョンごとのスライドセットを定義すれば、既存ユーザーには新機能紹介だけ、新規ユーザーにはフルオンボーディングを表示できる。今回はその土台を作る。
