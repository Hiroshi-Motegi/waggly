# 名刺シェア拡張: アイテム共有 + 表示制御フラグ

## 概要

名刺シェア機能を拡張し、アイテム（アクセサリー）も共有可能にする。またクラブ・アイテム個別に「名刺に表示しない」フラグを追加する。クラブは現在マイバッグ(bag_number=1)のみ表示だが、予備バッグ・保管庫も対象にする。

**sold（売却済み）クラブは意図的に名刺から除外する。** 名刺は現在使っているギアを見せる場なので、売却済みは対象外。

## DB変更

### マイグレーション

```sql
ALTER TABLE clubs ADD COLUMN hidden_from_profile boolean NOT NULL DEFAULT false;
ALTER TABLE accessories ADD COLUMN hidden_from_profile boolean NOT NULL DEFAULT false;
```

### bag_number に関する注意

現行スキーマ（100_auth_redesign.sql）では `bag_number` のデフォルトが `0`。
現行APIは `bag_number=1` でフィルタしているので、`bag_number=0` のデータが存在する可能性がある。
名刺APIでは `bag_number IN (1, 2)` でフィルタし、0のデータは表示対象外とする。

## 型定義

`src/types/database.ts`:
- `Club` に `hidden_from_profile: boolean` 追加
- `Accessory` に `hidden_from_profile: boolean` 追加

## API変更

### GET `/api/p/[username]` (公開プロフィール)

現状:
- クラブ: `status='bag' AND bag_number=1` のみ取得

変更後のクエリ条件（統一表記）:
```
(status = 'bag' AND bag_number IN (1, 2) AND hidden_from_profile = false)
OR (status = 'reserve' AND hidden_from_profile = false)
```
※ reserve クラブには bag_number の制約をかけない。

アイテム:
```
status = 'active' AND hidden_from_profile = false
ORDER BY created_at DESC
```

- `visible_fields.items` で「アイテム」セクション丸ごとON/OFF
- `visible_fields.bag` は既存のキー名を据え置き（DBの visible_fields JSON内のキーは `bag` のまま変更しない）。UIラベルのみ「マイバッグ」→「クラブ」に変更。クラブ全体（マイバッグ+予備+保管庫）のON/OFFを制御

レスポンス追加フィールド:
```typescript
// clubs配列に bag_number, status を追加
clubs: Array<{
  id: string;
  category: string;
  club_number: string;
  maker: string | null;
  model: string | null;
  bag_number: number;
  status: string;
  club_images: Array<{ image_url: string; is_primary: boolean }>;
}>;

// items配列を新規追加（accessory_images から primary 画像を取得、image_url レガシーカラムは返さない）
items: Array<{
  id: string;
  category: AccessoryCategory;
  brand: string | null;
  model: string | null;
  accessory_images: Array<{ image_url: string; is_primary: boolean }>;
}>;
```

### GET `/api/profile/preview`

同様の変更を適用（公開APIと同じデータ構造）。

### PATCH `/api/accessories/[id]` (`src/app/api/accessories/[id]/route.ts`)

現状 `body` をそのまま `.update(body)` に渡しており任意カラム上書きのリスクがある。この機会にホワイトリスト化する:

```typescript
const ALLOWED = ["category", "brand", "model", "memo", "rating", "status", "purchase_url", "hidden_from_profile"];
const updates = Object.fromEntries(
  Object.entries(body).filter(([k]) => ALLOWED.includes(k))
);
```

### PATCH `/api/clubs/[clubId]` (`src/app/api/clubs/[clubId]/route.ts`)

同様にホワイトリスト化し、`hidden_from_profile` を許可フィールドに追加。

## 名刺ページ (`/src/app/p/[username]/page-client.tsx`)

### クラブ表示

3つのアコーディオンセクションに分割:
- 「マイバッグ」: `status='bag' AND bag_number=1`
- 「予備バッグ」: `status='bag' AND bag_number=2`
- 「保管庫」: `status='reserve'`

**0件のセクションは非表示。** 全セクション0件ならクラブ関連のアコーディオン自体を表示しない。

**アコーディオンのデフォルト状態:**
- マイバッグ: 閉じた状態（既存の挙動を踏襲）
- 予備バッグ: 閉じた状態
- 保管庫: 閉じた状態

各セクション内は `sort_order ASC` で並べる。`sort_order` はクラブ行ごとの integer カラム。現在はマイバッグ（bag_number=1）内でのみユーザーが並べ替えを行っているため、予備バッグ・保管庫の sort_order は初期値（0）の可能性がある。sort_order が同値の場合は `created_at DESC` でフォールバックする。

レイアウトは現在のマイバッグと同じ（サムネ + クラブ番号バッジ + モデル名 + メーカー名）。

### アイテム表示

クラブセクション群の後、お気に入りコースの前に配置:
- 「アイテム」アコーディオン
- **0件の場合は非表示**（クラブと同じルール）
- `/items` ページのリストビューと同じ行レイアウト（サムネ + カテゴリ + ブランド・モデル名）
- `created_at DESC` で並べる
- アコーディオンのデフォルト: 閉じた状態
- カテゴリ絞り込みタブは全ユーザーに表示（プレビュー限定にしない）
- 絞り込みの選択肢は該当ユーザーが持つカテゴリのみ（データに存在するカテゴリを動的に抽出）。全カテゴリ表示の「すべて」タブも先頭に置く

### PublicProfile型の拡張

```typescript
interface PublicProfile {
  // 既存フィールド...
  clubs?: Array<{
    id: string;
    category: string;
    club_number: string;
    maker: string | null;
    model: string | null;
    bag_number: number;
    status: string;
    club_images: Array<{ image_url: string; is_primary: boolean }>;
  }>;
  items?: Array<{
    id: string;
    category: string;
    brand: string | null;
    model: string | null;
    accessory_images: Array<{ image_url: string; is_primary: boolean }>;
  }>;
}
```

## 編集画面のトグル

### クラブ編集 (`/src/app/bag/[clubId]/edit/page-client.tsx`)

`ClubForm` の下（保存ボタンの前）に「名刺に表示しない」トグルを追加。`page-client.tsx` 側でトグル状態を管理し、`handleSubmit` で `hidden_from_profile` を含めて送信する。`club-form.tsx` はスペック入力専用コンポーネントなので変更しない。

### アイテム編集 (`/src/app/items/[id]/page-client.tsx` の編集モード)

編集フォームのステータス選択の下に「名刺に表示しない」トグルを追加。

## 共有設定ページ (`/src/app/settings/share/page.tsx`)

`VISIBLE_FIELD_LABELS` に追加:
```typescript
items: "アイテム",
```

`bag` のUIラベルを「マイバッグ」→「クラブ」に変更。キー名 `bag` はDB互換性のため変更しない。

## 影響範囲まとめ

| ファイル | 変更内容 |
|---------|---------|
| `supabase/migrations/XXX_profile_share_expansion.sql` | カラム追加 |
| `src/types/database.ts` | Club, Accessory型にフラグ追加 |
| `src/app/api/p/[username]/route.ts` | クラブ拡張+アイテム取得+フィルタ |
| `src/app/api/profile/preview/route.ts` | 同上 |
| `src/app/api/accessories/[id]/route.ts` | ホワイトリスト化+hidden_from_profile対応 |
| `src/app/api/clubs/[clubId]/route.ts` | ホワイトリスト化+hidden_from_profile対応 |
| `src/app/p/[username]/page-client.tsx` | 3アコーディオン+アイテムセクション+カテゴリ絞り込み |
| `src/app/bag/[clubId]/edit/page-client.tsx` | ClubFormの外にトグル追加 |
| `src/app/items/[id]/page-client.tsx` | 編集モードにトグル追加 |
| `src/app/settings/share/page.tsx` | items追加、bagラベル変更 |
