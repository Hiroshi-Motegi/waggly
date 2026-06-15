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

## データベース設計

### `plans` テーブル

```sql
CREATE TABLE public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price integer NOT NULL DEFAULT 0,
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

```sql
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.plans(id) DEFAULT 'free',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired')),
  payjp_subscription_id text,
  payjp_customer_id text,
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL DEFAULT (now() + interval '1 month'),
  trial_end timestamptz,
  coupon_id uuid REFERENCES public.coupons(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
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
  created_at timestamptz NOT NULL DEFAULT now()
);
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
```

回数カウントは `ai_usage` の `source` 別 COUNT で取得（今月分を WHERE で絞る）。

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

### サブスク管理

- `GET /api/subscription` — 現在のプラン取得
- `POST /api/subscription` — サブスク作成/変更
- `POST /api/subscription/cancel` — 解約

### Pay.jp連携

- `POST /api/payment/create` — Pay.jpカスタマー作成 + 定期課金開始
- `POST /api/webhook/payjp` — Pay.jpからのWebhook受信
  - `subscription.renewed` → 期間更新
  - `subscription.canceled` → ステータス更新
  - `charge.failed` → 支払い失敗処理

### クーポン

- `POST /api/coupon/validate` — コード検証、割引内容返却

## フロントエンドUI

### 上限到達時の表示

チャット画面・メニュー生成画面で上限に達したとき:
- 入力欄を無効化
- カード表示:「今月の利用上限に達しました」
- 「Waggly Proにアップグレード」ボタン → プラン画面へ

### 残り回数の表示

- チャット画面の入力欄付近に小さく「残り3/5回」
- メニュー生成ボタン付近に「残り2/3回」
- Proユーザーには表示しない（or「Pro: 残り97/100回」）

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

### 設定画面

既存の設定ページに「プラン」行を追加:
- 無料ユーザー:「無料プラン」+「Proへ」バッジ
- Proユーザー:「Waggly Pro」+ 次回更新日

## 決済: Pay.jp

- 定期課金APIで月額サブスク管理
- トライアル: `trial_days` パラメータで無料期間設定
- クーポン/キャンペーン: 自前DB管理（Pay.jpにクーポン機能なし）
  - 割引率 or 無料月数をクーポンに持たせる
  - 請求時にクーポン適用して金額計算
  - Pay.jpには割引後の金額で課金
- アプリからの決済: 外部ブラウザでWeb決済ページを開く（ストア課金規約回避）

## 将来の拡張

- アプリ内課金（RevenueCat）でiOS/Android対応
- 年額プラン（¥3,800/年 = 2ヶ月分お得）
- プラン追加（Proの上位など）
