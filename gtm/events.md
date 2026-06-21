# GTM イベント設定一覧

コンテナ: `GTM-MTSD5K9Q` / 測定ID: `G-JVTHKZSR8H`

## タグ・トリガー一覧

### 認証

| タグ名 | イベント名 | パラメータ | 用途 |
|--------|-----------|-----------|------|
| 会員登録 | `sign_up` | method | 新規登録（LINE/LIFF/Google等） |
| ログイン | `login` | method | ログイン（認証方法の分布把握） |

### ギア管理

| タグ名 | イベント名 | パラメータ | 用途 |
|--------|-----------|-----------|------|
| クラブ追加 | `club_added` | - | クラブ登録数の計測 |
| 初回クラブ追加 | `first_club_added` | - | 初回体験の完了率 |

### 練習記録

| タグ名 | イベント名 | パラメータ | 用途 |
|--------|-----------|-----------|------|
| 練習記録 | `practice_logged` | - | 練習記録の利用頻度 |

### サブスク・課金

| タグ名 | イベント名 | パラメータ | 用途 |
|--------|-----------|-----------|------|
| プランページ閲覧 | `plan_page_viewed` | current_plan | サブスク検討のファネル入口 |
| プランアップグレード | `plan_upgraded` | - | 有料転換の計測 |
| プラン一時停止 | `plan_paused` | - | ダウングレード率 |
| 広告非表示購入 | `ad_removed` | - | 広告非表示の購入数 |
| AI上限到達 | `ai_limit_reached` | - | 無料枠の天井到達率 |

### カタログ・SEO

| タグ名 | イベント名 | パラメータ | 用途 |
|--------|-----------|-----------|------|
| カタログ閲覧 | `catalog_viewed` | maker, model, category | モデル別の閲覧数 |
| カタログ検索 | `catalog_searched` | query, results_count | 検索キーワードの把握 |
| スペック比較 | `spec_compared` | category, model_a, model_b | 人気の比較ペア |
| お気に入り登録 | `catalog_favorited` | model_id | エンゲージメント深度 |
| アフィリエイトクリック | `affiliate_clicked` | pid, provider | アフィリ収益貢献 |

### ユーザー行動

| タグ名 | イベント名 | パラメータ | 用途 |
|--------|-----------|-----------|------|
| プロフィール共有 | `profile_shared` | method | 共有方法（コピー/ネイティブ） |
| お問い合わせ送信 | `contact_submitted` | category | 問い合わせ種別の把握 |
| オンボーディング完了 | `onboarding_completed` | - | 初回体験の完了率 |
| アカウント削除 | `account_deleted` | reason | 解約理由の把握 |

## ユーザー定義変数

全て「データレイヤーの変数」/ バージョン2。

| 変数名 | データレイヤーの変数名 | 使用タグ |
|--------|---------------------|---------|
| dlv - method | `method` | 会員登録, ログイン, プロフィール共有 |
| dlv - category | `category` | スペック比較, カタログ閲覧, お問い合わせ送信 |
| dlv - query | `query` | カタログ検索 |
| dlv - results_count | `results_count` | カタログ検索 |
| dlv - maker | `maker` | カタログ閲覧 |
| dlv - model | `model` | カタログ閲覧 |
| dlv - model_a | `model_a` | スペック比較 |
| dlv - model_b | `model_b` | スペック比較 |
| dlv - model_id | `model_id` | お気に入り登録 |
| dlv - pid | `pid` | アフィリエイトクリック |
| dlv - provider | `provider` | アフィリエイトクリック |
| dlv - current_plan | `current_plan` | プランページ閲覧 |
| dlv - reason | `reason` | アカウント削除 |

## GA4 カスタムディメンション（要設定）

GA4管理画面 > カスタム定義 で登録が必要。

### イベントスコープ ディメンション
`method`, `category`, `query`, `maker`, `model`, `model_a`, `model_b`, `model_id`, `pid`, `provider`, `current_plan`, `reason`

### イベントスコープ 指標（数値）
`results_count`

## コード側の実装箇所

| イベント | ファイル |
|---------|---------|
| sign_up / login | `src/components/auth-provider.tsx` |
| club_added / first_club_added | `src/app/bag/new/page.tsx` |
| practice_logged | `src/app/practice/new/page.tsx` |
| plan_upgraded | `src/app/settings/plan/checkout/page.tsx` |
| ad_removed | `src/app/settings/remove-ads/page.tsx` |
| ai_limit_reached | `src/components/limit-reached-card.tsx` |
| profile_shared | `src/app/settings/share/page.tsx` |
| spec_compared | `src/components/catalog/compare-visit-tracker.tsx` |
| catalog_viewed | `src/app/catalog/[maker]/[slug]/page.tsx` |
| catalog_searched | `src/app/catalog/search/page.tsx` |
| catalog_favorited | `src/components/catalog/favorite-club-button.tsx` |
| affiliate_clicked | `src/components/catalog/alpen-buy-link.tsx` |
| contact_submitted | `src/app/help/contact/page.tsx` |
| onboarding_completed | `src/app/onboarding/page.tsx` |
| plan_page_viewed | `src/app/settings/plan/page.tsx` |
| plan_paused | `src/app/settings/plan/page.tsx` |
| account_deleted | `src/app/settings/delete-account/page.tsx` |
