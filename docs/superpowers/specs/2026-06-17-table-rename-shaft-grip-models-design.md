# テーブルリネーム + シャフト/グリップ親子化 設計

## 背景

club spec restructure（212マイグレーション）でヘッド/シャフト/グリップの分離を行ったが、以下の課題が残っている:

1. **シャフト/グリップにモデル概念がない** — ALTA J CB BLUE の R/SR/S が別レコードで、共通情報（メーカー名, 素材, 画像）が重複
2. **テーブル名が不統一** — `club_spec_series`, `club_spec_heads`, `club_spec_configurations` と冗長。ドメイン用語と乖離
3. **configurations が「完成品クラブ」を表現しきれていない** — grip の紐づけがない

## コンセプト

ゴルフクラブの完成品は **ヘッド + シャフト + グリップ** の組み合わせ。

- **クラブモデル**（G440 Iron）= 完成品のシリーズ
- **ヘッド**（7I）= モデル内の番手ヘッド
- **クラブ**（7I × ALTA S × Tour Velvet）= 組み立てられた完成品
- **シャフト/グリップ** = 別管理の製品マスタ。モデル（製品ライン）→ バリアント（フレックス/サイズ別）の親子構造

## テーブル構成

### リネーム一覧

| 旧テーブル | 新テーブル | 役割 |
|-----------|----------|------|
| `club_spec_series` | `club_models` | クラブモデル |
| `club_spec_heads` | `heads` | ヘッド（番手） |
| `club_spec_configurations` | `clubs` | 完成品クラブ |
| `shafts` | `shaft_variants` | シャフトバリアント（フレックス別） |
| `grips` | `grip_variants` | グリップバリアント（サイズ別） |
| `club_spec_series_shafts` | `club_model_shafts` | モデル×シャフト紐づけ |
| `club_spec_series_grips` | `club_model_grips` | モデル×グリップ紐づけ |

### 新規テーブル

| テーブル | 役割 |
|---------|------|
| `shaft_models` | シャフトモデル（製品ライン） |
| `grip_models` | グリップモデル（製品ライン） |

## データモデル

### 全体構造

```
club_models（G440 Iron）
├── heads（7I, 8I, PW...）
├── club_model_shafts → shaft_models（選べるシャフトモデル）
├── club_model_grips → grip_models（選べるグリップモデル）
└── clubs（7I × ALTA S × Tour Velvet = 37.25"/369g/D1）

shaft_models（ALTA J CB BLUE）
└── shaft_variants（R: 54g, SR: 64g, S: 74g）

grip_models（Tour Velvet）
└── grip_variants（M58: 50g, M60: 52g）
```

### テーブル定義

#### `club_models`（旧 `club_spec_series`）

リネームのみ。カラム変更なし。

| カラム | 型 | 説明 |
|-------|---|------|
| id | uuid PK | |
| maker | text NOT NULL | メーカー |
| model | text NOT NULL | モデル名 |
| category | text | カテゴリ（driver/iron/wedge等） |
| image_url | text | |
| affiliate_url | text | |
| own_image_url | text | |
| source | text | ai / manual |
| verified | boolean | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

ユニーク: `(maker, model, COALESCE(category, ''))`

#### `heads`（旧 `club_spec_heads`）

リネーム + カラム名 `series_id` → `model_id` に変更。

**maker, model カラムの非正規化について:** heads に maker/model をコピーしているのは、autofill API でのキャッシュルックアップ（maker_normalized + model_normalized で検索）に使うため。JOINなしで高速検索が可能。club_models.maker/model 更新時は heads にも連動更新する（実装済み）。

| カラム | 型 | 説明 |
|-------|---|------|
| id | uuid PK | |
| model_id | uuid FK → club_models ON DELETE SET NULL | 旧 series_id |
| maker | text NOT NULL | model登録時にコピー（autofill検索用） |
| model | text NOT NULL | model登録時にコピー（autofill検索用） |
| category | text NOT NULL | |
| club_number | text | 7i, PW, 52° 等 |
| sort_order | integer | 並び順 |
| maker_normalized | text NOT NULL | |
| model_normalized | text NOT NULL | |
| loft | numeric | |
| lie | numeric | |
| head_volume | numeric | cc |
| head_weight | numeric | g |
| head_weight_source | text | published / calculated |
| distance | numeric | yd |
| image_url | text | |
| own_image_url | text | |
| affiliate_url | text | |
| source | text | |
| verified | boolean | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `shaft_models`（新規）

シャフト製品ラインの親テーブル。旧 `shafts` から共通カラムを分離。

| カラム | 型 | 説明 |
|-------|---|------|
| id | uuid PK | |
| maker | text NOT NULL | シャフトメーカー（日本シャフト, Fujikura等） |
| maker_normalized | text NOT NULL | |
| name | text NOT NULL | 製品ライン名（ALTA J CB BLUE, N.S. Pro 950GH 等）重量帯含む |
| name_normalized | text NOT NULL | |
| type | text | steel / carbon |
| image_url | text | |
| affiliate_url | text | |
| own_image_url | text | |
| source | text DEFAULT 'ai' | |
| verified | boolean DEFAULT false | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

ユニーク: `(maker_normalized, name_normalized)`

注: `type` はユニーク制約に含めない。同一 (maker, name) で type が異なるケースは現実的に存在しない。データ移行時のグルーピングも `(maker_normalized, name_normalized)` で行い、`type` は先頭レコードから取得する。

#### `shaft_variants`（旧 `shafts`、カラム整理）

フレックス別のバリアント。共通カラム（maker, name, type, image系）は親に移動。

| カラム | 型 | 説明 |
|-------|---|------|
| id | uuid PK | |
| model_id | uuid FK → shaft_models ON DELETE CASCADE NOT NULL | |
| flex | text | S, SR, R, X 等 |
| weight | numeric | シャフト単体重量 (g) |
| torque | numeric | トルク (°) |
| kick_point | text | 調子（先, 中, 元） |
| source | text DEFAULT 'ai' | |
| verified | boolean DEFAULT false | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

ユニーク: `(model_id, COALESCE(flex, ''))`

#### `grip_models`（新規）

グリップ製品ラインの親テーブル。

| カラム | 型 | 説明 |
|-------|---|------|
| id | uuid PK | |
| maker | text NOT NULL | |
| maker_normalized | text NOT NULL | |
| name | text NOT NULL | |
| name_normalized | text NOT NULL | |
| material | text | ラバー, コード, エラストマー等 |
| image_url | text | |
| affiliate_url | text | |
| own_image_url | text | |
| source | text DEFAULT 'ai' | |
| verified | boolean DEFAULT false | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

ユニーク: `(maker_normalized, name_normalized)`

#### `grip_variants`（旧 `grips`、カラム整理）

サイズ別のバリアント。共通カラム（maker, name, material, image系）は親に移動。

| カラム | 型 | 説明 |
|-------|---|------|
| id | uuid PK | |
| model_id | uuid FK → grip_models ON DELETE CASCADE NOT NULL | |
| size | text | M58, M60 等 |
| weight | numeric | 重量 (g) |
| source | text DEFAULT 'ai' | |
| verified | boolean DEFAULT false | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

ユニーク: `(model_id, COALESCE(size, ''))`

#### `clubs`（旧 `club_spec_configurations` + grip追加）

完成品クラブ。ヘッド × シャフトバリアント × グリップバリアント + 組立スペック。

| カラム | 型 | 説明 |
|-------|---|------|
| id | uuid PK | |
| head_id | uuid FK → heads ON DELETE CASCADE NOT NULL | |
| shaft_variant_id | uuid FK → shaft_variants ON DELETE SET NULL | null = シャフト未特定 |
| grip_variant_id | uuid FK → grip_variants ON DELETE SET NULL | null = グリップ未特定 |
| length | numeric | クラブ長さ (inch) |
| total_weight | numeric | 総重量 (g) |
| swing_weight | text | バランス (D0, D1 等) |
| assumed_grip_weight | numeric | 総重量計算時に仮定したグリップ重量。grip_variant_id が設定されていても、カタログ値はこの仮定重量込みで算出されている場合がある。将来のグリップ変更シミュレーション（total_weight - assumed + new_grip.weight）に使用 |
| source | text DEFAULT 'ai' | |
| verified | boolean DEFAULT false | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

ユニーク制約（部分インデックス3パターン）:
```sql
-- shaft+grip両方あり
CREATE UNIQUE INDEX idx_clubs_head_shaft_grip
  ON clubs(head_id, shaft_variant_id, grip_variant_id)
  WHERE shaft_variant_id IS NOT NULL AND grip_variant_id IS NOT NULL;

-- shaftあり、gripなし
CREATE UNIQUE INDEX idx_clubs_head_shaft_no_grip
  ON clubs(head_id, shaft_variant_id)
  WHERE shaft_variant_id IS NOT NULL AND grip_variant_id IS NULL;

-- shaft=null（旧データ互換: シャフト未特定の公称スペック）
CREATE UNIQUE INDEX idx_clubs_head_null_shaft
  ON clubs(head_id)
  WHERE shaft_variant_id IS NULL;
```

#### `club_model_shafts`（旧 `club_spec_series_shafts`）

リネーム + **モデルレベルリンクに変更**。

旧設計では `shaft_id` でバリアント単位にリンクしていたが、親子化により `shaft_model_id` でモデル単位にリンクする。「このクラブモデルではALTA J CB BLUEが選べる」を1レコードで表現。バリアント（フレックス）の選択は clubs テーブルで行う。

| カラム | 型 | 説明 |
|-------|---|------|
| id | uuid PK | |
| model_id | uuid FK → club_models ON DELETE CASCADE | クラブモデル |
| shaft_model_id | uuid FK → shaft_models ON DELETE CASCADE | シャフトモデル |
| is_default | boolean | メーカー標準シャフトか |

ユニーク: `(model_id, shaft_model_id)`

#### `club_model_grips`（旧 `club_spec_series_grips`）

リネーム + **モデルレベルリンクに変更**。同上。

| カラム | 型 | 説明 |
|-------|---|------|
| id | uuid PK | |
| model_id | uuid FK → club_models ON DELETE CASCADE | クラブモデル |
| grip_model_id | uuid FK → grip_models ON DELETE CASCADE | グリップモデル |
| is_default | boolean | メーカー標準グリップか |

ユニーク: `(model_id, grip_model_id)`

## FK ON DELETE ポリシー

| FK | ON DELETE | 理由 |
|----|----------|------|
| heads.model_id → club_models | SET NULL | モデル削除時もヘッド単体データは残す |
| clubs.head_id → heads | CASCADE | ヘッド削除で完成品も不要 |
| clubs.shaft_variant_id → shaft_variants | SET NULL | シャフト削除時はシャフト未特定に戻す |
| clubs.grip_variant_id → grip_variants | SET NULL | 同上 |
| shaft_variants.model_id → shaft_models | CASCADE | モデル削除でバリアントも削除 |
| grip_variants.model_id → grip_models | CASCADE | 同上 |
| club_model_shafts.model_id → club_models | CASCADE | モデル削除で紐づけも削除 |
| club_model_shafts.shaft_model_id → shaft_models | CASCADE | シャフトモデル削除で紐づけも削除 |
| club_model_grips.model_id → club_models | CASCADE | 同上 |
| club_model_grips.grip_model_id → grip_models | CASCADE | 同上 |

## トリガーとRLS

### updated_at トリガー

- **リネーム後の既存テーブル**: PostgreSQL の `ALTER TABLE RENAME` ではトリガーは自動追従するため、機能的な再作成は不要。トリガー名の cosmetic リネームのみ（例: `club_spec_series_updated_at` → `club_models_updated_at`）
- **新規テーブル**: `shaft_models`, `grip_models` に `update_club_specs_updated_at()` トリガーを新規追加

### RLS ポリシー

- **リネーム後の既存テーブル**: ポリシーは自動追従するが、ポリシー名が旧テーブル名のまま残る。混乱防止のため DROP + 新名称で再作成（`"Deny all for non-service roles" ON club_models`）
- **新規テーブル**: `shaft_models`, `grip_models` に同じ USING(false) ポリシーを新規追加

## マイグレーション方針

1トランザクション内で実行。失敗時は全体ロールバック。

手順:

1. **shaft_models / grip_models テーブル作成**（RLS + トリガー含む）
2. **既存 shafts → shaft_models にデータ移行**（`(maker_normalized, name_normalized)` でグルーピング。type は先頭レコードから取得）
3. **既存 grips → grip_models にデータ移行**（`(maker_normalized, name_normalized)` でグルーピング。material は先頭レコードから取得）
4. **shafts に model_id 追加 + データ設定 + 共通カラム削除** → shaft_variants にリネーム
5. **grips に model_id 追加 + データ設定 + 共通カラム削除** → grip_variants にリネーム
6. **テーブルリネーム**: club_spec_series → club_models, club_spec_heads → heads, club_spec_configurations → clubs
7. **clubs に grip_variant_id 追加**（FK + ON DELETE SET NULL）
8. **heads: series_id → model_id リネーム**
9. **紐づけテーブルリネーム**: club_spec_series_shafts → club_model_shafts, club_spec_series_grips → club_model_grips
10. **紐づけテーブルFK列名変更 + モデルレベルリンクへの変換**: shaft_id → shaft_model_id（shaft_variants.model_id を使ってマッピング）、grip_id → grip_model_id（同上）
11. **インデックスリネーム**（cosmetic）
12. **トリガー名リネーム**（cosmetic、新規テーブルには新規追加）
13. **RLSポリシー**: 旧名DROP + 新名で再作成（全テーブル）
14. **upsert_club_spec_head 関数再作成**（テーブル名 heads に変更）
15. **clubs ユニーク制約**: 旧インデックスDROP + 3パターン部分インデックス作成

## API変更

全テーブル名の変更に伴い、全admin APIルートのクエリを更新:
- `club_spec_heads` → `heads`
- `club_spec_series` → `club_models`
- `club_spec_configurations` → `clubs`
- `shafts` → `shaft_variants`（JOINで shaft_models も取得）
- `grips` → `grip_variants`（JOINで grip_models も取得）
- `club_spec_series_shafts` → `club_model_shafts`（shaft_model_id に変更）
- `club_spec_series_grips` → `club_model_grips`（grip_model_id に変更）
- `upsert_club_spec_head` → `upsert_head`（テーブル名変更）

### autofill API (`src/app/api/clubs/autofill/route.ts`)

変更箇所:
- キャッシュ検索: `club_spec_heads` → `heads`
- configurations JOIN: `club_spec_configurations` → `clubs`
- シリーズ画像取得: `club_spec_series` → `club_models`
- RPC呼び出し: `upsert_club_spec_head` → `upsert_head`
- configurations upsert: `club_spec_configurations` → `clubs`

### collect-specs.mjs (`scripts/collect-specs.mjs`)

変更箇所:
- キャッシュ存在チェック: `.from("club_spec_heads")` → `.from("heads")`
- RPC呼び出し: `upsert_club_spec_head` → `upsert_head`
- configurations upsert: `.from("club_spec_configurations")` → `.from("clubs")`

## 管理画面変更

### シャフト管理ページ
- 一覧: shaft_models 単位で表示（バリアント数表示）
- クリックで展開 → バリアント一覧（フレックス別の重量・トルク・調子）
- 新規作成: モデル作成 → バリアント追加の2ステップ

### グリップ管理ページ
- 同上（サイズ別）

### シリーズ編集ページ
- テーブル名参照の更新
- シャフト紐づけ: shaft_models 単位で紐づけ（バリアント単位ではなく）
- グリップ紐づけ: grip_models 単位で紐づけ
- configurations表: shaft_variants を選択して clubs レコードを編集

## 既存データの扱い

- shafts テーブルのデータは `(maker_normalized, name_normalized)` でグルーピングして shaft_models を生成。type は先頭レコードから取得
- 各 shaft レコードに model_id を設定後、共通カラム（maker, name, type, image_url, affiliate_url, own_image_url, maker_normalized, name_normalized）を削除
- grips も同様（material を含む）
- clubs テーブルの grip_variant_id は既存データでは NULL（未設定）
- club_model_shafts の shaft_id → shaft_model_id 変換: 既存の shaft_id から shaft_variants.model_id を取得してマッピング。重複する（同一 shaft_model への複数リンク）場合は DISTINCT で1レコードにまとめる
- club_model_grips も同様
