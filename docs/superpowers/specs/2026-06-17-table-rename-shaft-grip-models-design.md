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
├── club_model_shafts → shaft_variants（選べるシャフト）
├── club_model_grips → grip_variants（選べるグリップ）
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

リネームのみ。カラム名 `series_id` → `model_id` に変更。

| カラム | 型 | 説明 |
|-------|---|------|
| id | uuid PK | |
| model_id | uuid FK → club_models | 旧 series_id |
| maker | text NOT NULL | model登録時にコピー |
| model | text NOT NULL | model登録時にコピー |
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

#### `shaft_variants`（旧 `shafts`、カラム整理）

フレックス別のバリアント。共通カラムは親に移動。

| カラム | 型 | 説明 |
|-------|---|------|
| id | uuid PK | |
| model_id | uuid FK → shaft_models NOT NULL | |
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

サイズ別のバリアント。

| カラム | 型 | 説明 |
|-------|---|------|
| id | uuid PK | |
| model_id | uuid FK → grip_models NOT NULL | |
| size | text | M58, M60 等 |
| weight | numeric | 重量 (g) |
| source | text DEFAULT 'ai' | |
| verified | boolean DEFAULT false | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

ユニーク: `(model_id, COALESCE(size, ''))`

#### `clubs`（旧 `club_spec_configurations` + grip追加）

完成品クラブ。ヘッド × シャフト × グリップ + 組立スペック。

| カラム | 型 | 説明 |
|-------|---|------|
| id | uuid PK | |
| head_id | uuid FK → heads NOT NULL | |
| shaft_variant_id | uuid FK → shaft_variants | null = シャフト未特定 |
| grip_variant_id | uuid FK → grip_variants | null = グリップ未特定 |
| length | numeric | クラブ長さ (inch) |
| total_weight | numeric | 総重量 (g) |
| swing_weight | text | バランス (D0, D1 等) |
| assumed_grip_weight | numeric | 総重量に含まれたグリップ重量 |
| source | text DEFAULT 'ai' | |
| verified | boolean DEFAULT false | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

ユニーク制約（部分インデックス）:
```sql
-- shaft+grip両方ありのユニーク
CREATE UNIQUE INDEX idx_clubs_head_shaft_grip
  ON clubs(head_id, shaft_variant_id, COALESCE(grip_variant_id::text, ''))
  WHERE shaft_variant_id IS NOT NULL;

-- shaft=nullのユニーク（旧データ互換）
CREATE UNIQUE INDEX idx_clubs_head_null_shaft
  ON clubs(head_id)
  WHERE shaft_variant_id IS NULL;
```

#### `club_model_shafts`（旧 `club_spec_series_shafts`）

リネーム + FK先変更。

| カラム | 型 | 説明 |
|-------|---|------|
| id | uuid PK | |
| model_id | uuid FK → club_models | 旧 series_id |
| shaft_variant_id | uuid FK → shaft_variants | 旧 shaft_id |
| is_default | boolean | |

#### `club_model_grips`（旧 `club_spec_series_grips`）

リネーム + FK先変更。

| カラム | 型 | 説明 |
|-------|---|------|
| id | uuid PK | |
| model_id | uuid FK → club_models | 旧 series_id |
| grip_variant_id | uuid FK → grip_variants | 旧 grip_id |
| is_default | boolean | |

## マイグレーション方針

1トランザクション内で実行。手順:

1. **shaft_models / grip_models テーブル作成**
2. **既存 shafts → shaft_models にデータ移行**（maker, name, type 等をDISTINCTで抽出してINSERT）
3. **既存 grips → grip_models にデータ移行**（同上）
4. **shafts に model_id 追加 + 共通カラム削除** → shaft_variants にリネーム
5. **grips に model_id 追加 + 共通カラム削除** → grip_variants にリネーム
6. **テーブルリネーム**: club_spec_series → club_models, club_spec_heads → heads, club_spec_configurations → clubs
7. **clubs に grip_variant_id 追加**
8. **heads: series_id → model_id リネーム**
9. **紐づけテーブルリネーム + FK列名変更**
10. **インデックス・トリガー・RLSポリシー・関数の再作成**

## API変更

全テーブル名の変更に伴い、全admin APIルートのクエリを更新:
- `club_spec_heads` → `heads`
- `club_spec_series` → `club_models`
- `club_spec_configurations` → `clubs`
- `shafts` → `shaft_variants`（JOINで shaft_models も取得）
- `grips` → `grip_variants`（JOINで grip_models も取得）
- `club_spec_series_shafts` → `club_model_shafts`
- `club_spec_series_grips` → `club_model_grips`
- `upsert_club_spec_head` → テーブル名変更に合わせて再作成

autofill API / collect-specs.mjs も同様に更新。

## 管理画面変更

### シャフト管理ページ
- 一覧: shaft_models 単位で表示（バリアント数表示）
- クリックで展開 → バリアント一覧（フレックス別の重量・トルク・調子）
- 新規作成: モデル作成 → バリアント追加の2ステップ

### グリップ管理ページ
- 同上（サイズ別）

### シリーズ編集ページ
- テーブル名参照の更新
- clubs テーブルに grip_variant_id が追加されるが、UIでの対応は後回し可

## 既存データの扱い

- shafts テーブルに1件でもデータがあれば、(maker, name, type) でグルーピングして shaft_models を生成
- 各 shaft レコードに model_id を設定後、共通カラムを削除
- grips も同様
- clubs テーブルの grip_variant_id は既存データでは NULL（未設定）
