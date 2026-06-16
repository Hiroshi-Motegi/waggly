# カバー画像機能

## 概要

名刺シェアページにFacebook風のカバー画像エリアを追加。プロフィール設定から最大5枚の画像を登録でき、名刺ページでアバターの背景にカルーセル表示される。

## DB変更

### テーブル: `profile_cover_images`

```sql
CREATE TABLE profile_cover_images (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_profile_cover_images_user ON profile_cover_images(user_id);

ALTER TABLE profile_cover_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cover images"
  ON profile_cover_images FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Public can view cover images"
  ON profile_cover_images FOR SELECT
  USING (true);
```

最大5枚制限はAPI側で実施（DBレベルでは制約しない）。

### Supabase Storage

既存の `club-images` バケットを再利用。パス: `covers/{userId}/{timestamp}.{ext}`

命名上 `club-images` にカバー画像が入るのは不整合だが、新バケット作成・RLS設定のコストを避けるためこのまま使用する。

## 型定義

`src/types/database.ts` に追加:

```typescript
export interface ProfileCoverImage {
  id: string;
  user_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}
```

## 画像処理

### ImageCropper のアスペクト比対応

現在の `ImageCropper` コンポーネントは 1:1 固定。`aspect` prop を追加して任意のアスペクト比を指定可能にする。

```typescript
interface ImageCropperProps {
  // 既存props...
  aspect?: number; // デフォルト: 1 (1:1)
}
```

既存のクラブ画像・アイテム画像・アバターの呼び出しは変更なし（デフォルト1:1のまま）。カバー画像のみ `aspect={2}` で呼び出す。

### 出力解像度

カバー画像はフル幅表示のため、出力最大幅を **1600px**（高さ800px）とする。既存のクラブ画像等（最大1200px）より大きい。`ImageCropper` に `maxOutputWidth` prop を追加して対応する。

### ファイルサイズ上限

アップロード時の最大ファイルサイズ: **5MB**（クロップ後の出力サイズではなく、APIが受け付けるFormDataの上限）。API側で検証し、超過時は 413 を返す。

## API

### POST `/api/profile/cover-images`

画像アップロード。FormDataで受け取り、2:1にクロップ済みの画像をStorageに保存、DBレコード作成。

- 5枚上限チェック（超過時 400）
- ファイルサイズ 5MB 上限チェック（超過時 413）

レスポンス: 作成された `ProfileCoverImage`

### DELETE `/api/profile/cover-images/[id]`

指定IDの画像を削除。Storage上のファイルも削除。所有権チェック（`user_id` 一致確認）。

### PATCH `/api/profile/cover-images/reorder`

`{ ids: string[] }` を受け取り、配列順に `sort_order` を更新。送信された全IDがリクエストユーザーの所有であることを検証し、不一致時は 403 を返す。

### GET `/api/p/[username]` / GET `/api/profile/preview`

レスポンスに `cover_images` 配列を追加:

```typescript
cover_images: Array<{ id: string; image_url: string }>;
```

- `visible_fields.cover_images` が `false` の場合はフィールド自体を含めない
- `sort_order ASC` で返す

## プロフィール設定ページ (`/settings/profile`)

### 「カバー画像」セクション

アバターセクションの下、基本情報セクションの上に配置。

- 既存の `ClubImageGallery` / `ItemImageGallery` と同じUIパターン（ただし **2:1比率のサムネイル**）
- `ImagePicker` + `ImageCropper`（`aspect={2}`、`maxOutputWidth={1600}`）でトリミング
- サムネイル一覧（2:1比率の横長サムネイル）+ 追加ボタン（5枚未満の場合）
- 各画像に削除ボタン
- 並べ替え（矢印ボタン）
- アップロード失敗時はトースト or インラインエラーメッセージ表示

## 共有設定ページ (`/settings/share`)

`VISIBLE_FIELD_LABELS` に追加:

```typescript
cover_images: "カバー画像",
```

`bag`（クラブ）の前に配置。

## 名刺ページ (`/p/[username]/page-client.tsx`)

### カルーセル実装

CSS scroll-snap によるネイティブスワイプカルーセルを使用。外部ライブラリは追加しない。

```
overflow-x: scroll; scroll-snap-type: x mandatory;
各画像: scroll-snap-align: start; width: 100%;
```

ドットインジケータは `IntersectionObserver` or `scroll` イベントで現在のスライドを検出。

### カバー画像ありの場合

```
┌──────────────────────────┐
│                          │
│    カバー画像 (2:1)       │  ← カルーセル（複数枚時にドットインジケータ）
│                          │
│              ┌────┐      │
└──────────────┤    ├──────┘
               │ 🧑 │         ← アバター（半分カバーに被さる）
               └────┘
              ワグりん          ← 名前
           こんにちは...        ← bio
```

- カバー画像エリアの高さ: 画面幅の50%（2:1比率）
- アバターは下端から半分はみ出す配置（`-mt-10` 的な負マージン）
- カルーセル: スワイプ対応、ドットインジケータ（2枚以上の時）
- 自動再生なし（手動スワイプのみ）
- ローディング中: カバーエリアに `bg-[#006728]/50` のスケルトン表示（2:1比率維持）
- 画像読み込みエラー時: 該当画像をスキップ（残りがあれば表示、全滅なら「カバー画像なし」と同じ表示）

### カバー画像なしの場合

現在と同じレイアウト（緑背景にアバター + 名前）。変更なし。

### PublicProfile型の拡張

```typescript
interface PublicProfile {
  // 既存フィールド...
  cover_images?: Array<{ id: string; image_url: string }>;
}
```

## 影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `supabase/migrations/207_cover_images.sql` | テーブル作成 |
| `src/types/database.ts` | ProfileCoverImage型追加 |
| `src/components/ui/image-cropper.tsx` | `aspect` / `maxOutputWidth` prop追加 |
| `src/app/api/profile/cover-images/route.ts` | POST（アップロード）|
| `src/app/api/profile/cover-images/[id]/route.ts` | DELETE |
| `src/app/api/profile/cover-images/reorder/route.ts` | PATCH（並べ替え）|
| `src/app/api/p/[username]/route.ts` | cover_images取得追加 |
| `src/app/api/profile/preview/route.ts` | cover_images取得追加 |
| `src/app/settings/profile/page.tsx` | カバー画像セクション追加 |
| `src/app/settings/share/page.tsx` | visible_fieldsにcover_images追加 |
| `src/app/p/[username]/page-client.tsx` | カバー画像カルーセル+レイアウト変更 |
| `src/components/profile/cover-image-gallery.tsx` | 新規: ギャラリーコンポーネント |
