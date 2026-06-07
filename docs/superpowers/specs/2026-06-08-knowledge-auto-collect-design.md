# 教師データ自動収集パイプライン 設計書

## 概要

複数ユーザーの匿名練習データを週次で集約・分析し、AIコーチの教師データ（knowledge_base）を自動で補強するパイプライン。

### 目的
- ユーザーの実際の悩みや傾向に基づいて、AIコーチの知識を継続的に改善する
- 手動でのデータ収集コストを削減する
- ユーザー数が増えるほどAIの品質が上がる好循環を作る

### 前提
- 利用規約 Article 4 で匿名データ利用に同意済み
- 現段階は MVP〜数十人規模

---

## 全体フロー

```
Vercel Cron (毎週日曜 UTC 21:00 = JST 月曜 06:00)
  │
  ▼
POST /api/admin/knowledge/auto-collect
  │
  ├─ 1. 匿名データ集約
  │    practice_sessions + practice_plans から直近7日分を取得
  │    user_idを除去し、メモ・評価・傾向のみに加工
  │
  ├─ 2. Claude分析（1回目）
  │    入力: 匿名練習データ + 既存knowledge_baseのタイトル一覧
  │    出力: 収集すべきトピックリスト（最大5件）
  │    各トピック: { topic, reason, category, search_query }
  │
  ├─ 3. トピックごとにWeb検索 + Claude生成
  │    各トピックについて:
  │    a. Tavily APIで検索（search_queryを使用）
  │    b. 検索結果をClaudeに渡して教師データを生成
  │    出力: { title, content, tags, source, search_sources }
  │
  ├─ 4. knowledge_baseにdraft保存
  │    status: "draft"
  │    source: "auto-collected"
  │    analysis_summary: 分析理由
  │    search_sources: 参照URL一覧
  │
  └─ 5. 実行ログ保存（knowledge_auto_runs）
       分析サマリー・生成件数・ステータスを記録
```

---

## データモデル

### knowledge_base テーブル変更

既存の `is_active` カラムを `status` カラムに移行する。

#### 追加カラム

| カラム | 型 | デフォルト | 内容 |
|---|---|---|---|
| status | text | 'active' | `draft` / `active` / `inactive` / `rejected` |
| analysis_summary | text | null | 自動生成時の分析理由 |
| search_sources | text[] | null | Web検索で参照したURL |
| generated_at | timestamptz | null | 自動生成日時 |

#### マイグレーション手順

1. `status` カラムを追加（デフォルト `'active'`）
2. 既存データを移行: `is_active = false` → `status = 'inactive'`
3. `is_active` カラムを削除
4. AIシステムプロンプトのクエリを `status = 'active'` に変更

### knowledge_auto_runs テーブル（新規）

| カラム | 型 | デフォルト | 内容 |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| ran_at | timestamptz | now() | 実行日時 |
| period_start | date | | 分析対象期間の開始 |
| period_end | date | | 分析対象期間の終了 |
| total_sessions | integer | | 対象の練習記録数 |
| total_plans | integer | | 対象のプラン評価数 |
| summary | text | | 今週の傾向サマリー |
| topics_generated | integer | 0 | 生成したトピック数 |
| status | text | | `success` / `no_data` / `error` |
| error_message | text | null | エラー時のメッセージ |

RLSポリシー: authenticated ユーザーが読み取り可能。

---

## API設計

### POST /api/admin/knowledge/auto-collect

パイプラインのメインエントリポイント。Vercel Cronまたは管理画面から手動実行。

**認証:** Cron実行時は `CRON_SECRET` ヘッダーで認証。手動実行時は通常のセッション認証。

**処理フロー:**

```typescript
// 1. 匿名データ集約
const sessions = await getAnonymousSessions(7); // 直近7日
const plans = await getAnonymousPlanFeedback(7);

// データが少なすぎる場合はスキップ
if (sessions.length === 0 && plans.length === 0) {
  await saveRun({ status: "no_data", summary: "対象データなし" });
  return;
}

// 2. Claude分析
const existingKnowledge = await getKnowledgeTitles();
const analysis = await analyzeWithClaude(sessions, plans, existingKnowledge);
// → { summary, topics: [{ topic, reason, category, search_query }] }

// 3. トピックごとに検索 + 生成
for (const topic of analysis.topics) {
  const searchResults = await searchWithTavily(topic.search_query);
  const knowledgeItem = await generateWithClaude(topic, searchResults);
  await saveAsDraft(knowledgeItem);
}

// 4. 実行ログ保存
await saveRun({ status: "success", summary: analysis.summary, ... });
```

**匿名化処理:**
- user_idを除去
- 練習メモは内容のみ抽出（「場所: ○○練習場」などの個人情報は除去）
- 評価（★1-5）、球数、番手は集約統計として利用

### GET /api/admin/knowledge/runs

実行ログ一覧を返す。直近10件、新しい順。

### PATCH /api/admin/knowledge/[id]（既存を拡張）

statusフィールドの更新に対応。`draft` → `active`（承認）、`draft` → `rejected`（却下）。

---

## Claude プロンプト設計

### 分析プロンプト（ステップ2）

```
あなたはゴルフ教育の専門家です。
以下の匿名練習データを分析し、AIゴルフコーチの知識ベースに追加すべきトピックを提案してください。

## 今週の練習データ（匿名）
- 練習記録数: {count}件
- 平均評価: {avg_rating}
- よく練習された番手: {top_clubs}
- 低評価が多い練習の傾向: {low_rated_patterns}
- ユーザーのメモ（匿名、抜粋）:
{memos}

## プラン評価データ（匿名）
- 評価済みプラン数: {count}件
- 高評価プラン（★4-5）の特徴: {high_rated}
- 低評価プラン（★1-2）の特徴: {low_rated}
- ユーザーのコメント（匿名、抜粋）:
{comments}

## 既存の教師データ（タイトル一覧）
{existing_titles}

## 指示
- 既存データと重複しないトピックを最大5件提案してください
- 各トピックについて、なぜ必要かの理由と、Web検索用のクエリを含めてください
- カテゴリは以下から選択: swing_basics, pga_data, drill, equipment, mental, course_strategy, fitness, rules

JSON形式で出力:
{
  "summary": "今週の傾向を1-2文で",
  "topics": [
    {
      "topic": "トピック名",
      "reason": "なぜこの知識が必要か",
      "category": "カテゴリ",
      "search_query": "ゴルフ ○○ ドリル 練習方法"
    }
  ]
}
```

### 生成プロンプト（ステップ3）

```
以下のWeb検索結果を元に、ゴルフAIコーチ向けの教師データを作成してください。

## トピック: {topic}
## 必要な理由: {reason}
## カテゴリ: {category}

## Web検索結果
{search_results}

## 指示
- 正確で実践的な内容にしてください
- アマチュアゴルファーが理解できる言葉で書いてください
- 統計データがあれば出典付きで含めてください
- 適切に改行・段落分けして読みやすくしてください
- 400-800文字程度で

JSON形式で出力:
{
  "title": "タイトル",
  "content": "本文（改行あり）",
  "tags": ["タグ1", "タグ2"]
}
```

---

## Web検索（Tavily API）

- **API:** Tavily Search API（https://tavily.com）
- **無料枠:** 月1000回（週5トピック × 4週 = 月20回で十分）
- **パラメータ:**
  - `search_depth: "advanced"` — より詳細な結果
  - `include_answer: true` — AI要約付き
  - `max_results: 5` — トピックあたり5件
- **環境変数:** `TAVILY_API_KEY`

---

## 管理画面の変更

### 一覧ページ（/admin/knowledge）

- ページ上部に最新の実行ログサマリーを表示
  - 「先週の分析: アプローチの距離感に関する悩みが多い（3件生成）」
  - 手動実行ボタン「今すぐ分析を実行」
- ステータスフィルタ追加: `すべて` / `レビュー待ち` / `有効` / `無効` / `却下`
- draftアイテムのカードに:
  - 分析理由（analysis_summary）を表示
  - 参照URL（search_sources）をリンク表示
  - 「承認」「却下」ボタン

### 編集ページ（/admin/knowledge/[id]）

- draftの場合、分析理由と参照URLを読み取り専用セクションで表示
- 内容を編集してから承認することも可能

---

## Vercel Cron設定

`vercel.json` に追加:

```json
{
  "crons": [
    {
      "path": "/api/admin/knowledge/auto-collect",
      "schedule": "0 21 * * 0"
    }
  ]
}
```

UTC 21:00 日曜日 = JST 月曜 06:00

**認証:** Vercel Cronは自動的に `Authorization: Bearer <CRON_SECRET>` ヘッダーを付与。API側で `CRON_SECRET` 環境変数と照合。

---

## コスト見積もり

| 項目 | 週あたり | 月あたり |
|---|---|---|
| Claude API（分析1回 + 生成5回） | 〜$0.05 | 〜$0.20 |
| Tavily API（5回検索） | 無料枠内 | 無料枠内 |
| Vercel Cron | 無料枠内 | 無料枠内 |
| **合計** | **〜$0.05** | **〜$0.20** |

---

## 将来の拡張

- **auto-approve:** 信頼度スコアを導入し、高スコアのものは自動で `active` に
- **ユーザーフィードバック連携:** AIコーチの回答品質を教師データの評価に反映
- **データソース拡張:** YouTube動画の要約、ゴルフ雑誌のRSS取り込み
- **閾値ベース実行:** 週次に加え、短期間に低評価が集中した場合の緊急実行
