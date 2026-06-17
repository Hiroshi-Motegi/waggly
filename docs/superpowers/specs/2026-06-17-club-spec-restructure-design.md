# Club Spec DB Restructure — ヘッド/シャフト/グリップ分離設計

## 背景

現在の `club_specs` テーブルは1モデル1番手=1レコードで、シャフト違いのスペック差を表現できない。メーカーカタログでは同モデルに複数シャフト/グリップが用意され、組み合わせごとに長さ・総重量・バランスが異なる。

将来的に「ヘッド+シャフト+グリップの組み合わせシミュレーション」機能を想定し、3パーツを独立した製品データとして設計する。

## コンセプト

### 2つの販売形態

| 形態 | 商品 | 例 |
|--|--|--|
| **完成品** | シリーズ（ヘッド+シャフト+グリップを選んで買う） | PING, Titleist, Callaway |
| **パーツ販売** | ヘッド/シャフト/グリップそれぞれ単体 | 三浦技研, 工房系 |

### 設計方針

- **シリーズ = 完成品の製品構成定義**（ヘッド+選べるシャフト+選べるグリップ）
- **ヘッドはシリーズの中で登録**するが、DBとしては独立テーブル（series_id nullable）
  - シリーズで登録したヘッドは、将来のカスタム組み合わせでも参照可能
  - ヘッド単体販売（工房系）は series_id = null で登録（将来対応）
- **シャフト/グリップはメーカー横断の製品マスタ**。シリーズからは紐づけで参照
- **全フィールドnull許容**。データがあれば表示・計算に反映、なければ省略

## データモデル

### 概要

```
shafts（シャフト製品マスタ — メーカー横断）
grips（グリップ製品マスタ — メーカー横断）

club_spec_series（完成品モデル: PING G440 Iron）
├── club_spec_heads（番手ヘッド: 7i — シリーズ内で登録、DB上は独立）
├── club_spec_series_shafts（このモデルで選べるシャフト — マスタから紐づけ）
├── club_spec_series_grips（このモデルで選べるグリップ — マスタから紐づけ）
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

#### `club_spec_heads` — ヘッドスペック（既存 `club_specs` をリネーム+カラム整理）

シリーズの中で登録するが、DB上は独立テーブル。series_id=nullでヘッド単体登録も可（将来のカスタム対応）。

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
| head_weight | numeric | ヘッド重量 (g)。メーカー公表 or 逆算推定 |
| head_weight_source | text | `published` / `calculated` / null |
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
| shaft_id | uuid FK → shafts | null許容（シャフト未特定の既存データ互換） |
| length | numeric | クラブ長さ (inch) |
| total_weight | numeric | 総重量 (g) — ヘッド+シャフト+標準グリップ |
| swing_weight | text | バランス (D0, D1等) |
| distance | numeric | 飛距離目安 (yd) |
| source | text | ai / manual |
| verified | boolean | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

ユニーク: `(head_id, shaft_id)` ※shaft_id=nullの場合は1レコードのみ許容

## データの流れ

### 例: PING G440 Iron

```
series: PING G440 Iron
  ├── heads（シリーズ内で登録、headsテーブルに保存）:
  │   ├── 4i: loft 21°, lie 61°
  │   ├── 5i: loft 24°, lie 61.7°
  │   ├── 7i: loft 30°, lie 63°
  │   └── ...
  ├── shaft_options（shaftsマスタから紐づけ）:
  │   ├── ALTA J CB BLACK (carbon) S   [default]
  │   ├── ALTA J CB BLACK (carbon) SR
  │   ├── AWT 2.0 LITE (steel) S
  │   ├── N.S. Pro 950GH neo (steel) S
  │   └── ...
  ├── grip_options（gripsマスタから紐づけ）:
  │   └── Golf Pride 360 Tour Velvet Aqua 52g [default]
  └── configurations:
      ├── 7i × ALTA J CB BLACK S:   37.25", 369g, D1
      ├── 7i × AWT 2.0 LITE S:     36.75", 395g, D1
      ├── 7i × N.S. Pro 950GH S:   36.75", 398g, D1.5
      └── ...
```

### ヘッド重量の逆算

メーカーがヘッド重量を公表していない場合、configurationsから推定:

```
head_weight（推定） = total_weight - shaft.weight - default_grip.weight

例: G440 7i × 950GH S
  398g(総重量) - 98g(950GH) - 52g(Tour Velvet) = 248g(ヘッド)
```

推定した場合 `head_weight_source = 'calculated'` で保存。シャフト/グリップの重量データが揃ってないと計算不可（nullのまま）。

### 組み合わせシミュレーション（将来機能）

```
カスタム総重量 = head_weight + shaft.weight + grip.weight

例: G440 7i(248g) + Diamana ZF 60 S(62g) + IOMIC(50g) = 360g

グリップ変更のみの場合:
  = configurations.total_weight - default_grip.weight + selected_grip.weight
  = 398g - 52g + 50g = 396g
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
- head_weightが未入力 + シャフト/グリップ重量データが揃っていれば逆算を試みる

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

**シリーズ編集ページ（メイン管理画面）:**
```
シリーズ編集: PING G440 Iron
├── 基本情報: メーカー、モデル、画像
├── ヘッド一覧（シリーズ内で追加・編集）
│   ├── 4i: loft 21°, lie 61°
│   ├── 7i: loft 30°, lie 63°
│   └── [＋ 番手追加]
├── シャフト選択（マスタから検索して紐づけ）
│   ├── ☑ ALTA J CB BLACK S [標準]
│   ├── ☑ N.S. Pro 950GH neo S
│   └── [＋ シャフト追加]
├── グリップ選択（マスタから検索して紐づけ）
│   └── ☑ Tour Velvet [標準]
└── スペック表（番手×シャフトの組み合わせ）
    │  ALTA J CB BLACK S    950GH neo S
    ├── 7i: 37.25"/369g/D1    36.75"/398g/D1.5
    └── 8i: 36.63"/377g/D1    36.25"/406g/D1.5
```

**ヘッド一覧ページ:**
- シリーズ編集内で管理するのがメイン
- 将来: カスタム対応時にヘッド単体の一覧・登録UI追加

### サイドバー
```
シリーズ      ← 完成品管理（ヘッドはこの中で管理）
シャフト      ← 製品マスタ
グリップ      ← 製品マスタ
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
8. 管理画面: シリーズ編集にヘッド管理・シャフト/グリップ選択・configurations表追加
9. autofill API更新
10. AI取得プロンプト更新（シャフト別スペック対応）

## 将来拡張（今回スコープ外）

- ヘッド単体登録UI（工房系カスタムヘッド、series_id=null）
- 組み合わせシミュレーション画面
- ヘッド重量の逆算自動化
- ユーザーのクラブ登録時にパーツマスタから選択
