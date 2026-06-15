# AIコーチ サブスクリプション設計

## 概要

AI機能（チャット・練習メニュー提案）に回数制限を導入し、有料プラン「Waggly Pro」で制限を緩和する。決済はPay.jpの定期課金を使用。アプリ（iOS/Android）からはWebブラウザ経由で決済する。

## プラン構成

| | 無料 | Waggly Pro ¥480/月 |
|---|------|-------------------|
| ギア管理 | ○ 無制限 | ○ 無制限 |
| 練習記録 | ○ 無制限 | ○ 無制限 |
| AIチャット | 月5回 | 月100回 |
| 練習メニュー提案 | 月3回 | 月30回 |
| クラブ自動入力 | ○ 無制限 | ○ 無制限 |

- カウント単位: ユーザーのメッセージ送信1回 = 1カウント
- クラブ自動入力はコストが小さく登録体験を阻害するため制限なし

### 原価試算

- AIチャット1回: 約¥1.0（Haiku input ~2000 + output ~1000トークン）
- 練習メニュー1回: 約¥2.0（input ~3000 + output ~2000トークン）
- Proユーザー上限MAX利用時: ¥100 + ¥60 = ¥160/月（原価率33%）
- 注意: モデル変更時に原価が変動するリスクあり。モデル切り替え時はプラン上限の見直しを行う

### plans テーブルの price について

`price` は**月額単価（円）**を表す。将来の年額プラン等では別の `billing_interval` カラムと組み合わせて判別する。

## データベース設計

### `plans` テーブル

```sql
CREATE TABLE public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price integer NOT NULL DEFAULT 0,          -- 月額単価（円）
  ai_chat_monthly_limit integer NOT NULL DEFAULT 5,
  ai_plan_monthly_limit integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.plans (id, name, price, ai_chat_monthly_limit, ai_plan_monthly_limit)
VALUES
  ('free', '無料', 0, 5, 3),
  ('pro', 'Waggly Pro', 480, 100, 30);
```

### `subscriptions` テーブル

UNIQUE(user_id) は設けない。解約→再契約で履歴を残すため、status = 'active' の行が1つだけになるようアプリケーション側で制御する。

```sql
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.plans(id) DEFAULT 'free',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired')),
  payjp_subscription_id text,
  payjp_customer_id text,
  current_period_start timestamptz,           -- 無料プランは NULL
  current_period_end timestamptz,             -- 無料プランは NULL
  trial_end timestamptz,
  coupon_id uuid REFERENCES public.coupons(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- active なサブスクはユーザーあたり1つだけ
CREATE UNIQUE INDEX idx_subscriptions_active_user
  ON public.subscriptions (user_id) WHERE status = 'active';

-- RLS: 自分のレコードのみ読み取り可能
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (user_id IN (
    SELECT up.user_id FROM public.user_providers up
    WHERE up.auth_user_id = auth.uid()
  ));
```

### `coupons` テーブル

```sql
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_percent integer NOT NULL DEFAULT 0,
  free_months integer NOT NULL DEFAULT 0,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- discount_percent と free_months は排他: 片方のみ設定可
  CONSTRAINT coupon_type_exclusive CHECK (
    (discount_percent > 0 AND free_months = 0) OR
    (discount_percent = 0 AND free_months > 0) OR
    (discount_percent = 0 AND free_months = 0)
  )
);

-- RLS: クーポンは全ユーザー読み取り可（コード検証のため）、書き込みは不可
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active coupons"
  ON public.coupons FOR SELECT
  USING (is_active = true);
```

### `coupon_redemptions` テーブル（同一ユーザーの重複利用防止）

```sql
CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, coupon_id)
);

-- クーポン適用時:
-- 1. coupon_redemptions に INSERT（UNIQUE 制約で重複防止）
-- 2. coupons.used_count を UPDATE ... SET used_count = used_count + 1 WHERE used_count < max_uses（race condition 防止）

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own redemptions"
  ON public.coupon_redemptions FOR SELECT
  USING (user_id IN (
    SELECT up.user_id FROM public.user_providers up
    WHERE up.auth_user_id = auth.uid()
  ));
```

### `ai_usage` テーブル（既存拡張）

```sql
CREATE TABLE public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('chat', 'plan', 'autofill')),
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_user_month ON public.ai_usage (user_id, created_at);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own usage"
  ON public.ai_usage FOR SELECT
  USING (user_id IN (
    SELECT up.user_id FROM public.user_providers up
    WHERE up.auth_user_id = auth.uid()
  ));
```

### 月次カウントのタイムゾーン

回数カウントは **JST（Asia/Tokyo）** 基準で月初〜月末を集計する。DBは UTC で保存しているため、クエリ時に変換する:

```sql
SELECT COUNT(*) FROM ai_usage
WHERE user_id = $1
  AND source = $2
  AND created_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo'
  AND created_at < date_trunc('month', now() AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo' + interval '1 month';
```

## API設計

### 利用回数チェック

**`GET /api/usage`**（既存を拡張）

レスポンス:
```json
{
  "chat": { "used": 3, "limit": 5, "remaining": 2 },
  "plan": { "used": 1, "limit": 3, "remaining": 2 },
  "limitReached": false
}
```

### AI各エンドポイント（既存を修正）

- `POST /api/coach/chat` — 送信前に回数チェック追加
- `POST /api/coach/plan` — 同上
- 上限超え時: `429` + `{ "error": "limit_reached", "source": "chat" }`

#### 回数チェックの race condition 対策

ai_usage への INSERT を先に行い、その後 COUNT で上限超過を確認する。超過していれば ROLLBACK する。

```
BEGIN;
INSERT INTO ai_usage (user_id, source, ...) VALUES (...);
SELECT COUNT(*) FROM ai_usage WHERE user_id = $1 AND source = $2 AND created_at >= [月初];
-- COUNT > limit なら ROLLBACK、以下なら COMMIT してAI呼び出しへ
COMMIT;
```

### サブスク管理

- `GET /api/subscription` — 現在のアクティブなプラン取得
- `POST /api/subscription` — サブスク作成（新規行INSERT、旧行があれば expired に更新）
- `POST /api/subscription/cancel` — 解約（status を canceled に、current_period_end まで Pro 継続）

### Pay.jp連携

- `POST /api/payment/create` — Pay.jpカスタマー作成 + 定期課金開始
- `POST /api/webhook/payjp` — Pay.jpからのWebhook受信

#### Webhook イベントハンドリング

| イベント | 処理 |
|---------|------|
| `subscription.renewed` | current_period_start/end を更新、updated_at 更新 |
| `subscription.canceled` | status を `canceled` に、updated_at 更新 |
| `charge.failed` | 後述のグレースピリオド処理 |

#### Webhook の冪等性・署名検証

- **署名検証**: `Payjp-Signature` ヘッダで HMAC 検証を行い、不正リクエストを拒否
- **冪等性**: `payjp_subscription_id` + イベント種別 + イベントID をキーに、処理済みイベントをスキップ。Webhook は再送されうるため必須

#### 支払い失敗時のグレースピリオド

`charge.failed` 発生時、即座に Pro を剥奪せず **7日間のグレースピリオド** を設ける:

1. `charge.failed` → subscriptions に `grace_period_end = now() + 7 days` をセット
2. グレースピリオド中は Pro 機能を継続
3. 期間内に再課金成功 → `grace_period_end` をクリア
4. 期間終了後も未払い → status を `expired` に変更（cron or 次回APIアクセス時に判定）
5. ユーザーにはアプリ内で「お支払いに問題があります」バナーを表示

### クーポン

- `POST /api/coupon/validate` — コード検証、割引内容返却

#### クーポンの適用ルール

- `discount_percent` と `free_months` は**排他**（DB制約で担保）
- `discount_percent`: 初回課金から適用。Pay.jp には割引後の金額で課金
- `free_months`: Pay.jp の `trial_days` に変換（free_months × 30日）して適用。期間終了後に自動で通常額課金開始（Pay.jp の定期課金が自動処理）

## フロントエンドUI

### 上限到達時の表示

チャット画面・メニュー生成画面で上限に達したとき:
- 入力欄を無効化
- カード表示:「今月の利用上限に達しました」
- 「Waggly Proにアップグレード」ボタン → プラン画面へ

### 残り回数の表示

- チャット画面の入力欄付近に小さく「残り3/5回」
- メニュー生成ボタン付近に「残り2/3回」
- **Proユーザーにも表示する**（月100回は到達しうるため）:「残り97/100回」

### プラン画面（新規 `/settings/plan`）

- 現在のプラン表示
- 無料 vs Pro の比較表
- 「Proにアップグレード」ボタン
  - Web → Pay.jp決済フロー（カード入力画面）
  - ネイティブアプリ → 外部ブラウザでWeb決済ページを開く
- Proユーザー:「解約する」ボタン
- クーポンコード入力欄

### 決済フロー

1. 「アップグレード」タップ
2. クーポンあれば入力
3. Pay.jpのカード入力（トークン化）
4. `/api/payment/create` でサブスク開始
5. 完了画面 → プラン画面に戻る（Pro表示に変わる）

### ネイティブアプリからの決済リターン

1. アプリから外部ブラウザで `/settings/plan/checkout` を開く
2. 決済完了後、カスタムURLスキーム `waggly://subscription/complete` でアプリに戻す
3. アプリ側で Capacitor の `appUrlOpen` イベントをリスン、プラン画面をリロード
4. フォールバック: ブラウザ上に「アプリに戻ってください」表示

### 月途中のアップグレード

- AI利用回数の上限は**即座に Pro の値に変更**される（当月の利用済み回数はリセットしない）
- 日割り計算は**しない**。Pay.jp にそのまま月額で課金開始し、current_period_start を課金開始日にする

### 設定画面

既存の設定ページに「プラン」行を追加:
- 無料ユーザー:「無料プラン」+「Proへ」バッジ
- Proユーザー:「Waggly Pro」+ 次回更新日

## 決済: Pay.jp

- 定期課金APIで月額サブスク管理
- トライアル: `trial_days` パラメータで無料期間設定
- クーポン/キャンペーン: 自前DB管理（Pay.jpにクーポン機能なし）
  - `discount_percent`: 割引後の金額で Pay.jp に課金
  - `free_months`: `trial_days` に変換して Pay.jp に渡す。期間終了後は Pay.jp が自動で通常額課金
- アプリからの決済: 外部ブラウザでWeb決済ページを開く（ストア課金規約回避）
- Webhook 署名検証 + 冪等性処理を必須とする

## セキュリティ

- 全新テーブル（subscriptions, coupons, coupon_redemptions, ai_usage）に RLS ポリシーを設定
- subscriptions / coupon_redemptions / ai_usage: 自分のレコードのみ SELECT 可。INSERT/UPDATE はサーバーサイド（service_role）のみ
- coupons: アクティブなクーポンのみ全ユーザー SELECT 可
- Webhook エンドポイントは Pay.jp の署名検証で保護

## 将来の拡張

- アプリ内課金（RevenueCat）でiOS/Android対応
- 年額プラン（¥3,800/年 = 2ヶ月分お得、plans テーブルに `billing_interval` カラム追加）
- プラン追加（Proの上位など）
