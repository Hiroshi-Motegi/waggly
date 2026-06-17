# Club Spec DB Restructure — ヘッド/シャフト/グリップ分離設計

## 背景

現在の `club_specs` テーブルは1モデル1番手=1レコードで、シャフト違いのスペック差を表現できない。メーカーカタログでは同モデルに複数シャフト/グリップが用意され、組み合わせごとに長さ・総重量・バランスが異なる。

将来的に「ヘッド+シャフト+グリップの組み合わせシミュレーション」機能を想定し、3パーツを独立した製品データとして設計する。

## データモデル

### 概要

```
shafts（シャフト製品マスタ — メーカー横断）
grips（グリップ製品マスタ — メーカー横断）

club_spec_series（モデル: PING G440 Iron）
├── club_spec_heads（番手: 7i — ヘッド固有スペック）
├── club_spec_series_shafts（このモデルで選べるシャフト）
├── club_spec_series_grips（このモデルで選べるグリップ）
└── club_spec_configurations（番手×シャフト別の公称スペック）
```

### テーブル定義

#### `shafts` — シャフト製品マスタ

メーカー横断。N.S. Pro 950GHはTitleistでもBridgestoneでも同じ製品。

| カラム | 型 | 説明 |
|--|--|--|
| id | uuid PK | |
| maker | text | シャフトメーカー（日本シャフト, Fujikura等） |
| name | text | 製品名（N.S. Pro 950GH neo） |
| type | text | `steel` / `carbon` |
| flex | text | S, SR, R, X等 |
| weight | numeric | シャフト単体重量 (g)。null許容 |
| length | numeric | シャフト長 (inch)。null許容 |
| torque | numeric | トルク (°)。null許容 |
| kick_point | text | 調子（先, 中, 元）。null許容 |
| image_url | text | |
| affiliate_url | text | |
| own_image_url | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

ユニーク: `(maker, name, flex)` ※同名シャフトでもフレックス違いは別レコード

#### `grips` — グリップ製品マスタ

| カラム | 型 | 説明 |
|--|--|--|
| id | uuid PK | |
| maker | text | グリップメーカー（Golf Pride, IOMIC等） |
| name | text | 製品名（Tour Velvet） |
| weight | numeric | 重量 (g)。null許容 |
| size | text | サイズ（M58, M60等）。null許容 |
| material | text | 素材（ラバー, コード, エラストマー等）。null許容 |
| image_url | text | |
| affiliate_url | text | |
| own_image_url | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

ユニーク: `(maker, name)`

#### `club_spec_series` — モデル（既存テーブル拡張）

変更なし。maker, model, image_url, affiliate_url, own_image_url, verified, source。

#### `club_spec_heads` — 番手別ヘッドスペック（既存 `club_specs` をリネーム+カラム整理）

| カラム | 型 | 説明 |
|--|--|--|
| id | uuid PK | |
| series_id | uuid FK → series | null許容（単体管理も可） |
| maker | text | |
| model | text | |
| category | text | driver/iron/wedge等 |
| club_number | text | 7i, 3W, 52°等 |
| maker_normalized | text | |
| model_normalized | text | |
| loft | numeric | ロフト角 |
| lie | numeric | ライ角 |
| head_volume | numeric | ヘッド体積 (cc) |
| head_weight | numeric | ヘッド重量 (g) |
| image_url | text | |
| own_image_url | text | |
| affiliate_url | text | |
| source | text | ai / manual |
| verified | boolean | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

※ length, weight, swing_weight, distance は configurations に移動

#### `club_spec_series_shafts` — モデルで選べるシャフト

| カラム | 型 | 説明 |
|--|--|--|
| id | uuid PK | |
| series_id | uuid FK → series | |
| shaft_id | uuid FK → shafts | |
| is_default | boolean | メーカー標準シャフトか |

ユニーク: `(series_id, shaft_id)`

#### `club_spec_series_grips` — モデルで選べるグリップ

| カラム | 型 | 説明 |
|--|--|--|
| id | uuid PK | |
| series_id | uuid FK → series | |
| grip_id | uuid FK → grips | |
| is_default | boolean | メーカー標準グリップか |

ユニーク: `(series_id, grip_id)`

#### `club_spec_configurations` — 番手×シャフト別の公称スペック

メーカーがカタログで公表する組み合わせスペック（標準グリップ込み）。

| カラム | 型 | 説明 |
|--|--|--|
| id | uuid PK | |
| head_id | uuid FK → heads | |
| shaft_id | uuid FK → shafts | |
| length | numeric | クラブ長さ (inch) |
| total_weight | numeric | 総重量 (g) — ヘッド+シャフト+標準グリップ |
| swing_weight | text | バランス (D0, D1等) |
| distance | numeric | 飛距離目安 (yd) |
| source | text | ai / manual |
| verified | boolean | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

ユニーク: `(head_id, shaft_id)`

## データの流れ

### 例: PING G440 Iron

```
series: PING G440 Iron
  ├── heads:
  │   ├── 4i: loft 21°, lie 61°
  │   ├── 5i: loft 24°, lie 61.7°
  │   ├── 6i: loft 27°, lie 62.3°
  │   ├── 7i: loft 30°, lie 63°
  │   └── ...
  ├── shaft_options:
  │   ├── ALTA J CB BLACK (carbon) S   [default]
  │   ├── ALTA J CB BLACK (carbon) SR
  │   ├── ALTA J CB BLACK (carbon) R
  │   ├── AWT 2.0 LITE (steel) S
  │   ├── N.S. Pro 850GH neo (steel) S
  │   └── N.S. Pro 950GH neo (steel) S
  ├── grip_options:
  │   └── Golf Pride 360 Tour Velvet Aqua 52g [default]
  └── configurations:
      ├── 7i × ALTA J CB BLACK S:   37.25", 369g, D1
      ├── 7i × AWT 2.0 LITE S:     36.75", 395g, D1
      ├── 7i × N.S. Pro 950GH S:   36.75", 398g, D1.5
      └── ...
```

### 組み合わせシミュレーション（将来機能）

```
推定総重量 = configurations.total_weight
           - default_grip.weight
           + selected_grip.weight

例: G440 7i × 950GH S のグリップをIOMIC(50g)に変更
  = 398g - 52g(Tour Velvet) + 50g(IOMIC) = 396g
```

## 画像のフォールバック

表示時の画像解決順:

- **ヘッド**: head.own_image_url → series.own_image_url → series.image_url → head.image_url → カテゴリ別デフォルト
- **シャフト**: shaft.own_image_url → shaft.image_url → デフォルト
- **グリップ**: grip.own_image_url → grip.image_url → デフォルト

## 未入力データの扱い

- 全フィールドnull許容。データがあれば表示、なければ省略
- シャフト/グリップ製品マスタも最初は name + maker だけで十分。weight等は後から埋める
- configurationsがなければ、headsのスペックだけ表示（現在と同じ見え方）
- series_shafts / series_grips が未登録なら「シャフト/グリップ情報なし」

## 既存データの移行

```
現行 club_specs → club_spec_heads にリネーム
  length, weight, swing_weight, distance は
  → club_spec_configurations にシャフト不明(shaft_id=null)で移行
```

shaft_id=null の configuration = 「シャフト未特定の公称スペック」として互換性を維持。

## 管理画面の変更

### 新規ページ
- `/admin/shafts` — シャフト製品マスタ一覧・編集
- `/admin/grips` — グリップ製品マスタ一覧・編集

### 既存ページ変更
- スペック（heads）編集 — length/weight/swing_weight/distanceを除去、configurations表示追加
- シリーズ編集 — 使用可能シャフト/グリップの選択UI追加、configurations一覧追加

### サイドバー追加
```
クラブスペック（heads）
シリーズ
シャフト      ← 新規
グリップ      ← 新規
ナレッジ
```

## 実装順序

1. `shafts`, `grips` テーブル作成（マイグレーション）
2. `club_specs` → `club_spec_heads` リネーム + カラム整理
3. `club_spec_series_shafts`, `club_spec_series_grips` 作成
4. `club_spec_configurations` 作成
5. 既存データ移行（length等をconfigurationsに移動）
6. API route更新
7. 管理画面: シャフト/グリップ一覧・編集
8. 管理画面: シリーズ編集にシャフト/グリップ選択追加
9. 管理画面: ヘッド編集からconfigurations管理
10. autofill API更新
11. AI取得プロンプト更新（シャフト別スペック対応）
