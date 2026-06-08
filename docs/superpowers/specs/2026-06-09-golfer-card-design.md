# ゴルファー名刺（プロフィール共有）機能 設計書

## 概要

Wagglyに登録した自分のゴルフ情報を「名刺」として公開ページにまとめ、URLやQRコードで気軽に知人にシェアできる機能。将来的にはアプリ内検索・コメント等のソーシャル機能（フェーズ2）への土台となる。

## フェーズ

- **フェーズ1（本設計の対象）:** プロフィール設定 → 公開ページ → シェア機能（URLコピー + QRコード）
- **フェーズ2（将来）:** アプリ内ユーザー検索、公開プロフィール一覧、クラブセットへのコメント機能

---

## データ設計

### `profiles` テーブル（新規）

| カラム | 型 | 説明 |
|---|---|---|
| id | uuid (PK) | = auth.users.id |
| username | text (unique) | 英数字・ハイフン・アンダースコア、3〜20文字 |
| nickname | text | 表示名 |
| avatar_url | text | アバター画像URL（Supabase Storage） |
| golf_experience_years | integer | ゴルフ歴（年） |
| average_score | integer | 平均スコア |
| best_score | integer | ベストスコア |
| home_course | text | ホームコース名 |
| bio | text | ひとことコメント（140文字程度） |
| sns_links | jsonb | `{ instagram: "url", x: "url", line: "url" }` |
| is_public | boolean (default false) | 名刺共有ON/OFF |
| visible_fields | jsonb | `{ nickname: true, average_score: false, ... }` 各項目の公開/非公開 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

- `username` は初期未設定（null）。設定画面から登録する。
- `is_public` を ON にするには `username` の設定が必須。
- 予約語（`admin`, `settings`, `api`, `p`, `auth` 等）はユーザー名として使用不可。
- `visible_fields` のデフォルトは全項目 `true`（公開）。ユーザーが個別にOFFにする。
- ユーザー名の変更は可能。ただし旧URLは無効になる（リダイレクトなし、シンプルに404）。

### `favorite_courses` テーブル（新規）

| カラム | 型 | 説明 |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK → profiles.id) | |
| gora_course_id | integer (nullable) | 楽天GORAのコースID（手動入力はnull） |
| course_name | text | コース名（GORA or 手動入力） |
| course_image_url | text (nullable) | 画像URL（GORAのみ） |
| evaluation | decimal (nullable) | 総合評価（GORAのみ） |
| address | text (nullable) | 住所（GORAのみ） |
| is_manual | boolean (default false) | 手動入力フラグ |
| sort_order | integer | 表示順 |

- 楽天GORAに載っていないコース（練習場、会員制、海外等）はテキスト手動入力で対応。
- GORA連携コースはAPIから取得した情報をキャッシュとして保存し、公開ページ表示時にはAPIを叩かない。

### 既存テーブルとの関連

- **クラブセット（MY BAG）:** 既存の items / bags テーブルから取得。新規テーブル不要。
- **コース検索:** 既存の `/api/courses` プロキシ（楽天GORA API連携）をそのまま流用。

---

## 画面構成

| 画面 | パス | 説明 |
|---|---|---|
| プロフィール設定 | `/settings/profile` | ニックネーム、アバター、ゴルフ歴、スコア、ホームコース、ひとこと、SNSリンクの入力 |
| お気に入りコース設定 | `/settings/profile/courses` | 既存コース検索UIを流用して選択 + テキスト手動入力 |
| 共有設定 | `/settings/share` | ユーザー名設定、名刺公開ON/OFF、項目ごとの公開/非公開、QRコード表示 |
| 公開プロフィール | `/p/[username]` | 非ログインユーザーも閲覧可能な名刺ページ |

---

## 公開プロフィールページ (`/p/[username]`)

### アクセス制御

- ログイン不要、誰でも閲覧可能（URLを知っていれば）
- `is_public` が OFF、またはユーザー名未設定 → 404
- `visible_fields` で非公開に設定された項目は表示しない

### デザイン：ページ型レイアウト

既存のWaggly UIパターン（グリーンヘッダー + 白カードセクション）に合わせる。

**セクション構成:**

1. **ヘッダー（グリーン背景）** — アバター、ニックネーム、ひとことコメント
2. **ゴルフ情報カード** — ゴルフ歴、平均スコア、ベストスコア
3. **MY BAG** — 既存バッグデータからクラブ一覧（番手・ブランド・モデル）
4. **お気に入りコース** — GORA連携コースはリッチ表示（画像・評価付き）、手動入力コースはテキスト表示
5. **SNSリンク** — アイコン付きリンクボタン（Instagram, X, LINE等）
6. **フッター** — 「Wagglyで作成」ブランディング + Wagglyへの誘導リンク

---

## シェアフロー

共有設定画面 (`/settings/share`) から以下を提供:

1. **プレビューリンク** — 自分の公開ページを確認
2. **リンクをコピー** — `waggly.jp/p/username` をクリップボードにコピー
3. **QRコード表示** — モーダルでQRコードを表示、画像としてダウンロード可能

### QRコード

- クライアントサイドで生成（`qrcode` ライブラリ等を使用）
- Wagglyブランドカラー（グリーン #006728）で統一

---

## お気に入りコース登録フロー

### 楽天GORA検索から選択

1. 設定画面でコース名を入力
2. 既存の `/api/courses` プロキシ経由で楽天GORA APIを検索
3. 候補一覧から選択
4. コース情報（名前、画像、評価、住所）を `favorite_courses` にキャッシュ保存

### テキスト手動入力

1. 「手動で入力」を選択
2. コース名をフリーテキストで入力
3. `is_manual: true` で保存（画像・評価なし）

---

## セキュリティ・エッジケース

- **ユーザー名重複チェック:** DB unique制約 + 入力時リアルタイムバリデーション
- **予約語ブロック:** `admin`, `settings`, `api`, `p`, `auth` 等をユーザー名として拒否
- **楽天GORA APIキー:** サーバーサイドのみで使用（既存プロキシ設計を踏襲）
- **プロフィール画像:** Supabase Storageにアップロード、適切なサイズにリサイズ
- **公開ページのOGP:** シェア時にLINE等でプレビューが表示されるよう、動的OGPメタタグを設定
- **Supabase RLS:** `profiles` は本人のみ書き込み可、`is_public: true` のレコードは誰でも読み取り可。`favorite_courses` も同様。

---

## 実装アプローチ

**プロフィール設定ファースト**で以下の順序で実装:

1. DB設計（Supabaseマイグレーション）
2. プロフィール設定UI
3. お気に入りコース設定UI（楽天GORA検索流用 + 手動入力）
4. 共有設定UI（ユーザー名、公開ON/OFF、項目別公開設定）
5. 公開プロフィールページ
6. シェア機能（URLコピー + QRコード）

---

## 将来の拡張（フェーズ2・対象外）

- アプリ内ユーザー検索（公開プロフィール一覧）
- クラブセットへのコメント・リアクション機能
- フォロー/フォロワー機能
- カスタムURL（ランダムID併用）
