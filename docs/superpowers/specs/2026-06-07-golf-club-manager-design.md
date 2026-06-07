# ゴルフクラブ管理アプリ 設計書

## 概要

### アプリ名
Waggly（ワグリー）

### コンセプト
「自分のクラブセットを管理し、練習日記とAIで上達をサポートする、ゴルファーの道具手帳」

### ターゲットユーザー
自分のクラブを把握して練習に活かしたい一般ゴルファー

### 差別化ポイント
- クラブ管理に特化（スコア管理は既存アプリに任せる）
- 練習日記 × クラブデータ × AIで、既存アプリにない練習提案ができる
- スイング撮影不要。練習日記（球数＋気づきメモ）という低ハードルな入力
- セッティングの名刺的シェア機能（将来）

### 規模感
- まず個人利用（MVP）→ ゴルフ仲間に展開（〜数百人）
- 月額コスト目安：MVP $0 → 300人規模で5,000〜7,000円程度

---

## 機能一覧

### MVP（初期リリース）

#### 1. 認証
- LIFFアプリとして構築（LINE Front-end Framework）
- `liff.init()` + `liff.getProfile()` で認証
- LINEアプリ内でもブラウザでも動作

#### 2. クラブ管理（マイバッグ）
- クラブ登録：番手、メーカー、モデル、シャフト（名前・フレックス）、ロフト角、ライ角、長さ、飛距離
- 写真管理：クラブごとに複数枚の写真を登録
- 購入情報：購入日、購入店、購入価格
- メンテナンス履歴：グリップ交換、リシャフト、ロフト調整等の記録（日付・店舗・費用）
- ステータス管理：使用中 / 保管中 / 売却済

#### 3. 練習記録
- 日付（デフォルト今日）、場所（お気に入りから1タップ選択）、総球数（プリセットボタン）
- 番手別球数：マイバッグからクラブ一覧を表示 → タップ → プリセット（10/20/30/50）で球数選択
- 気づきメモ：テキスト入力（音声入力ボタン付き）
- 目標：30秒以内で記録完了できるUI

#### 4. AI機能
- **ギャップ分析（ルールベース）：** 番手間の飛距離差が20yd以上なら通知、クラブ追加を提案
- **AIチャット（LLM）：** クラブデータ＋練習履歴を踏まえたアドバイス。悩み相談、セッティング相談
- **練習提案：** 練習記録保存後に「提案を見る」で生成 / チャットから「練習メニューを作って」で生成。構造化データとして保存し、履歴を一覧表示。実行状況（done/skipped）を次の提案に反映

### 将来拡張（Bフェーズ）

| 機能 | 概要 |
|------|------|
| セッティング共有（名刺機能） | 自分のセッティングをカード画像としてLINEでシェア |
| ゴルフ仲間との共有 | 友達のセッティングを閲覧 |
| Arccos連携 | Arccos On-Course Data APIでショットデータ取り込み |
| 楽天GORA連携 | ゴルフ場・練習場検索の紐づけ |
| コミュニティ機能 | 同じクラブユーザー同士のレビュー・感想共有 |
| AWS移行 | Bedrock + RDS + S3（スケール時） |

---

## データモデル

### users（ユーザー）
| フィールド | 型 | 内容 |
|---|---|---|
| id | uuid | Supabase Auth ID |
| line_user_id | text | LINE ユーザーID |
| display_name | text | 表示名 |
| avatar_url | text | プロフィール画像 |
| created_at | timestamptz | 登録日 |

### clubs（クラブ）
| フィールド | 型 | 内容 |
|---|---|---|
| id | uuid | クラブID |
| user_id | uuid | 所有者（FK: users） |
| category | text | 種別（driver/fairway_wood/utility/iron/wedge/putter） |
| club_number | text | 番手（1W, 5W, 7I, PW等） |
| maker | text | メーカー |
| model | text | モデル名 |
| shaft_name | text | シャフト名 |
| shaft_flex | text | フレックス（S, SR, R等） |
| loft | numeric | ロフト角 |
| lie | numeric | ライ角 |
| length | numeric | 長さ（インチ） |
| distance | integer | 飛距離（yd、自己申告） |
| purchase_date | date | 購入日 |
| purchase_shop | text | 購入店 |
| purchase_price | integer | 購入価格（円） |
| status | text | 状態（active/stored/sold） |
| sort_order | integer | バッグ内の並び順 |
| created_at | timestamptz | 登録日 |

### club_images（クラブ写真）
| フィールド | 型 | 内容 |
|---|---|---|
| id | uuid | 画像ID |
| club_id | uuid | クラブID（FK: clubs） |
| image_url | text | Supabase Storage URL |
| is_primary | boolean | メイン画像フラグ |
| created_at | timestamptz | 登録日 |

### maintenances（メンテナンス履歴）
| フィールド | 型 | 内容 |
|---|---|---|
| id | uuid | メンテID |
| club_id | uuid | クラブID（FK: clubs） |
| type | text | 種別（grip_change/reshaft/loft_adjust/other） |
| description | text | 詳細メモ |
| shop | text | 実施店舗 |
| cost | integer | 費用（円） |
| done_at | date | 実施日 |
| created_at | timestamptz | 登録日 |

### practice_sessions（練習記録）
| フィールド | 型 | 内容 |
|---|---|---|
| id | uuid | 記録ID |
| user_id | uuid | ユーザー（FK: users） |
| practiced_at | date | 練習日 |
| location | text | 練習場名 |
| total_balls | integer | 総球数 |
| memo | text | 気づきメモ |
| created_at | timestamptz | 登録日 |

### practice_clubs（練習クラブ別記録）
| フィールド | 型 | 内容 |
|---|---|---|
| id | uuid | ID |
| session_id | uuid | 練習記録ID（FK: practice_sessions） |
| club_id | uuid | クラブID（FK: clubs） |
| balls | integer | 球数 |

### practice_plans（練習提案）
| フィールド | 型 | 内容 |
|---|---|---|
| id | uuid | 提案ID |
| user_id | uuid | ユーザー（FK: users） |
| title | text | タイトル（例：「アイアン精度向上メニュー」） |
| summary | text | 提案の概要・理由 |
| source | text | 生成元（auto/chat） |
| status | text | 状態（new/done/skipped） |
| created_at | timestamptz | 生成日 |

### practice_plan_items（提案メニュー明細）
| フィールド | 型 | 内容 |
|---|---|---|
| id | uuid | ID |
| plan_id | uuid | 提案ID（FK: practice_plans） |
| club_id | uuid | クラブID（FK: clubs） |
| balls | integer | 推奨球数 |
| focus | text | 練習のポイント（例：「距離感重視」） |
| sort_order | integer | 順番 |

### ai_chats（AIチャット履歴）
| フィールド | 型 | 内容 |
|---|---|---|
| id | uuid | チャットID |
| user_id | uuid | ユーザー（FK: users） |
| conversation_id | uuid | 会話セッションID（同一会話のメッセージをグルーピング） |
| role | text | user / assistant |
| message | text | メッセージ本文 |
| created_at | timestamptz | 日時 |

---

## 画面構成

### ナビゲーション（BottomNav 4タブ）

```
ホーム | マイバッグ | 練習記録 | AIコーチ
```

### 1. ホーム画面
- マイバッグのサマリー（登録本数、総投資額）
- 最近の練習記録（直近3件）
- AIからの最新提案（あれば表示）
- ギャップ分析の通知（番手間の飛距離に隙間があれば）

### 2. マイバッグ画面
- クラブ一覧：カテゴリ別（ドライバー→FW→UT→アイアン→ウェッジ→パター）で表示
- 各クラブにメイン写真・番手・モデル名・飛距離を表示
- タップでクラブ詳細画面へ（スペック、写真ギャラリー、購入情報、メンテ履歴、練習量集計）
- 「＋クラブ追加」ボタン
- ステータスフィルタ（使用中/保管中/売却済）

### 3. 練習記録画面
- 記録一覧：カレンダーまたは月別リスト表示
- 「＋練習を記録」→ 記録入力画面
  - 日付（デフォルト今日）
  - 場所（お気に入りから1タップ選択 or フリー入力）
  - 総球数（プリセットボタン：50/100/150/200/300）
  - 番手別球数（マイバッグ連動、タップ → プリセット選択）
  - 気づきメモ（テキスト + 音声入力ボタン）
- 記録保存後 →「AIの練習提案を見る」ボタン表示
- 練習統計：月間球数、番手別の練習比率グラフ

### 4. AIコーチ画面
- チャットUI（LINEライクな会話形式）
- ユーザーのクラブデータ＋練習履歴をコンテキストに含めて回答
- 「練習メニューを作って」→ 構造化された提案を生成＆保存
- 提案履歴タブ：過去の練習提案一覧（new/done/skipped）

### 共通
- ヘッダーにプロフィールアイコン → 設定画面（プロフィール編集、ログアウト）

---

## AI機能設計

### ギャップ分析（ルールベース）
- 登録クラブの飛距離を番手順にソート
- 隣り合う番手の飛距離差が20yd以上 → 「隙間あり」として通知
- 飛距離未入力のクラブがあれば入力を促す
- ホーム画面にカード形式で表示

### AIチャット（LLM）

**システムプロンプトに含める情報：**
- ユーザーのクラブ一覧（番手・モデル・シャフト・飛距離）
- 直近10件の練習記録（日付・球数・番手別練習量・メモ）
- 直近の練習提案とその実行状況
- ギャップ分析の結果

**AIの役割：**
アマチュアゴルファーの練習をサポートするコーチ。クラブセットと練習履歴を踏まえて、練習場ですぐ試せる具体的で実践的なアドバイスを提供する。

**コスト制御：**
- モデル：Claude Sonnet
- コンテキスト：最大2000トークン程度
- 1ユーザーあたり1日5回まで（MVP）

### 練習提案の生成

**トリガー：**
- 練習記録保存後に「提案を見る」ボタン
- AIチャットで「練習メニューを作って」と依頼

**出力制御：**
- JSON形式で出力（タイトル、概要、明細の構造）
- 明細は番手名で出力 → アプリ側でclub_idにマッチング
- 推奨球数の合計は100〜200球程度

**提案の質を上げる仕組み：**
- 前回の提案の実行状況（done/skipped）を次の提案に反映
- 練習メモの内容を読み取り、悩みに合った練習を提案
- 直近3件の提案履歴をコンテキストに含めて同じ提案の繰り返しを防ぐ

---

## 技術スタック

### MVP

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js（App Router）+ TypeScript + Tailwind CSS + shadcn/ui |
| バックエンド | Next.js API Routes |
| DB・認証・ストレージ | Supabase（PostgreSQL + Auth + Storage） |
| AIチャット | Claude API（Sonnet）+ Vercel AI SDK |
| ギャップ分析 | ルールベース（フロントエンド計算） |
| ホスティング | Vercel |
| LINE連携 | LIFF SDK（LINE Front-end Framework） |

### 将来拡張時

| 機能 | 技術 |
|---|---|
| セッティング共有 | OGP画像生成 + LINE共有 |
| Arccos連携 | Arccos On-Course Data API |
| 楽天GORA連携 | 楽天ウェブサービスAPI |
| コミュニティ | Supabase Realtime |
| AWS移行 | Amazon Bedrock + RDS + S3 |

---

## コスト試算

| フェーズ | ユーザー数 | 月額目安 |
|---|---|---|
| MVP（個人利用） | 1人 | ほぼ$0（全て無料枠内） |
| 仲間内 | 〜50人 | $0〜5（AI利用分のみ） |
| 小規模サービス | 〜300人 | $5〜50（AI利用頻度次第） |
| 成長期 | 〜1000人 | $50〜150（有料プラン＋AI） |
