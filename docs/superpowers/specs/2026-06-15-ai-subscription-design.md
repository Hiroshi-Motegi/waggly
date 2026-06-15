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
- 単価最終確認: 2026-06-15時点（Claude Haiku 4.5: input $1/1M, output $5/1M）

### plans テーブルの price について

`price` は**単価（円）**を表す。`billing_interval` と組み合わせて月額/年額を判別する。

### プランID定数

アプリコード側でプランIDをリテラルで散在させない。定数ファイルで一元管理する:

```typescript
// src/lib/plans.ts
export const PLAN_ID = {
  FREE: 'free',
  PRO: 'pro',
} as const;
export type PlanId = typeof PLAN_ID[keyof typeof PLAN_ID];
```

## データベース設計

### `plans` テーブル

```sql
CREATE TABLE public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price integer NOT NULL DEFAULT 0,                    -- 単価（円）
  billing_interval text NOT NULL DEFAULT 'month',      -- 'month' or 'year'
  ai_chat_monthly_limit integer NOT NULL DEFAULT 5,
  ai_plan_monthly_limit integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.plans (id, name, price, billing_interval, ai_chat_monthly_limit, ai_plan_monthly_limit)
VALUES
  ('free', '無料', 0, 'month', 5, 3),
  ('pro', 'Waggly Pro', 480, 'month', 100, 30);
```

### `subscriptions` テーブル

UNIQUE(user_id) は設けない。解約→再契約で履歴を残すため、status = 'active' の行が1つだけになるよう partial unique index で制御する。

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
  grace_period_end timestamptz,               -- 支払い失敗時のグレースピリオド終了日
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- active なサブスクはユーザーあたり1つだけ
CREATE UNIQUE INDEX idx_subscriptions_active_user
  ON public.subscriptions (user_id) WHERE status = 'active';

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: 自分のレコードのみ読み取り可能、書き込みはサーバーサイドのみ
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (user_id IN (
    SELECT up.user_id FROM public.user_providers up
    WHERE up.auth_user_id = auth.uid()
  ));
-- INSERT/UPDATE/DELETE はポリシーなし = RLS有効下でクライアントからは拒否
```

注: `coupon_id` は subscriptions に持たない。クーポン適用履歴は `coupon_redemptions` テーブルに一元管理する。

### 前提条件: user_providers インデックス

RLSポリシーの `user_providers` サブクエリが高頻度で実行される。以下のインデックスが必要（既存で存在しなければ作成）:

```sql
CREATE INDEX IF NOT EXISTS idx_user_providers_auth_user_id
  ON public.user_providers (auth_user_id);
```

### `webhook_events` テーブル（Webhook冪等性）

```sql
CREATE TABLE public.webhook_events (
  id text PRIMARY KEY,                        -- Pay.jp event ID
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: クライアントアクセス不可（サーバーサイドのみ）
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
-- ポリシーなし = 全拒否
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

-- RLS: クライアント直アクセス不可。検証は /api/coupon/validate が service_role で実行
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
-- ポリシーなし = 全拒否
```

### `coupon_redemptions` テーブル（クーポン利用の一元管理）

クーポン適用履歴の唯一の記録先。subscriptions にはクーポン情報を持たない。

```sql
CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id),  -- どのサブスクに適用したか
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, coupon_id)
);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own redemptions"
  ON public.coupon_redemptions FOR SELECT
  USING (user_id IN (
    SELECT up.user_id FROM public.user_providers up
    WHERE up.auth_user_id = auth.uid()
  ));
-- INSERT/UPDATE/DELETE はポリシーなし = クライアントからは拒否
```

#### クーポン適用のトランザクション

クーポン適用は1トランザクション内で実行する。used_count の更新が0行（上限到達）なら全体を ROLLBACK:

```
BEGIN;
  -- 1. 重複チェック兼記録（UNIQUE制約で二重適用を防止）
  INSERT INTO coupon_redemptions (user_id, coupon_id, subscription_id) VALUES ($1, $2, $3);
  -- 2. 利用数インクリメント（max_uses 未満の場合のみ更新）
  UPDATE coupons SET used_count = used_count + 1
    WHERE id = $2 AND (max_uses IS NULL OR used_count < max_uses);
  -- 更新行数が 0 なら上限到達 → ROLLBACK
COMMIT;
```

### `ai_usage_counters` テーブル（回数制限用カウンター）

race condition を防ぐため、ai_usage の COUNT ではなく専用カウンターテーブルを使う。

```sql
CREATE TABLE public.ai_usage_counters (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('chat', 'plan')),
  month text NOT NULL,                        -- 'YYYY-MM' (JST)
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, source, month)
);

ALTER TABLE public.ai_usage_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own counters"
  ON public.ai_usage_counters FOR SELECT
  USING (user_id IN (
    SELECT up.user_id FROM public.user_providers up
    WHERE up.auth_user_id = auth.uid()
  ));
-- INSERT/UPDATE はポリシーなし = クライアントからは拒否
```

### `ai_usage` テーブル（トークン追跡用、既存拡張）

トークンコスト追跡用。回数制限には使わない（`ai_usage_counters` が担当）。`source` に `'autofill'` を含むのはコスト追跡のため — `ai_usage_counters` は `'chat'` / `'plan'` のみで、autofill はカウント対象外。

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
-- INSERT/UPDATE はポリシーなし = クライアントからは拒否
```

### 月次カウントのタイムゾーン

回数カウントは **JST（Asia/Tokyo）** 基準。`ai_usage_counters.month` は JST の `YYYY-MM` 文字列で管理する。アプリ側で `to_char(now() AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM')` を使用。

### 無料ユーザーの初期状態

ユーザー登録時に subscriptions 行は **作成しない**。行なし = 無料プランとみなす。`GET /api/subscription` は行なし時に plans.free のデフォルト値を返す。有料プラン契約時に初めて subscriptions 行を INSERT する。

### 既存コードからの移行

現在の `usage-limit.ts` はトークン数ベース（`ai_monthly_tokens`）で制限している。本設計で回数ベース（`ai_chat_monthly_limit` / `ai_plan_monthly_limit`）に変更する。移行手順:

1. `ai_usage_counters` テーブルを作成
2. `plans` テーブルを作成（`ai_monthly_tokens` は廃止、`ai_chat_monthly_limit` / `ai_plan_monthly_limit` に置換）
3. `usage-limit.ts` を回数ベースに書き換え（`ai_usage_counters` の `UPDATE ... RETURNING` パターン）
4. `GET /api/usage` のレスポンスをトークン→回数に変更
5. 既存の `billing.ts` の型定義を新スキーマに合わせて更新
6. フロント側の使用量表示を回数ベースに変更

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

used は `ai_usage_counters` から取得。limit はユーザーのアクティブプランから取得。

### AI各エンドポイント（既存を修正）

- `POST /api/coach/chat` — 送信前に回数チェック追加
- `POST /api/coach/plan` — 同上
- 上限超え時: `429` + `{ "error": "limit_reached", "source": "chat" }`

#### 回数チェック（race condition 安全）

`ai_usage_counters` の `UPDATE ... WHERE count < limit` パターンで原子的にチェック+インクリメントする:

```sql
-- 1. カウンター行がなければ作成（月初の初回アクセス時）
INSERT INTO ai_usage_counters (user_id, source, month, count)
VALUES ($user_id, $source, $month_jst, 0)
ON CONFLICT (user_id, source, month) DO NOTHING;

-- 2. 原子的にインクリメント（上限未満の場合のみ）
UPDATE ai_usage_counters
SET count = count + 1
WHERE user_id = $user_id
  AND source = $source
  AND month = $month_jst
  AND count < $limit
RETURNING count;

-- RETURNING が空 = 上限到達 → 429 を返す
-- RETURNING に値あり = OK → AI呼び出しへ + ai_usage にもトークン記録
```

### サブスク管理

- `GET /api/subscription` — 現在のアクティブなプラン取得（行なし = free プランを返す）
- `POST /api/subscription` — サブスク作成（後述の決済フロー内で呼ばれる）
  - 既に active な行がある場合: partial unique index により INSERT 失敗 → `409 Conflict` を返す（二重契約防止）
- `POST /api/subscription/cancel` — 解約:
  1. **Pay.jp: 定期課金をキャンセル**（`payjp.subscriptions.cancel(payjp_subscription_id)`）
  2. Pay.jp 成功後に DB: status を `canceled` に更新
  3. Pay.jp 失敗時は DB 更新せずエラー返却（整合性保持）
  4. 万が一 Pay.jp 成功→DB 更新失敗の場合: `subscription.canceled` Webhook が保険として DB を更新
  5. current_period_end まで Pro 機能継続

### ステータス遷移

```
[なし] → active（Pro契約時に行INSERT）
active → canceled（ユーザーが解約。current_period_end まで Pro 機能継続）
canceled → active（期間内に再契約 → 新しいPay.jp定期課金を作成し、同じ行を更新）
canceled → expired（current_period_end を過ぎたら遷移）
active → expired（grace_period_end を過ぎても支払い未回復の場合）
expired → active（再契約時に新しい行をINSERT）
```

#### canceled → active の再契約

Pay.jp で一度キャンセルした定期課金は再開できない（Pay.jp の仕様）。そのため canceled からの再契約では:

1. **Pay.jp: 新しい定期課金を作成**（既存の payjp_customer_id を再利用）
2. **DB: 同じ行の status を active に戻す** + `payjp_subscription_id` を新しいIDに更新 + `current_period_start/end` を更新

expired からの再契約は**新しい行を INSERT** する（履歴保持のため）。

#### canceled → expired の遷移タイミング

以下の2箇所で判定する:
1. **APIアクセス時**: `GET /api/subscription` で status = 'canceled' かつ `current_period_end < now()` なら expired に更新して返す
2. **Supabase cron（pg_cron）**: 日次で `canceled` かつ期間終了済みの行を expired に一括更新（APIアクセスがない場合の保険）

グレースピリオド終了後の expired 遷移も同じ仕組みで処理する。

#### pg_cron セットアップ

Supabase ダッシュボード > SQL Editor で pg_cron を有効化し、日次ジョブを登録する:

```sql
-- 毎日 JST 3:00（UTC 18:00）に実行
SELECT cron.schedule(
  'expire-subscriptions',
  '0 18 * * *',
  $$
    UPDATE public.subscriptions
    SET status = 'expired'
    WHERE (
      (status = 'canceled' AND current_period_end < now())
      OR
      (status = 'active' AND grace_period_end IS NOT NULL AND grace_period_end < now())
    );
  $$
);
```

### ダウングレード時の利用回数

Pro が expired/canceled で期間終了した場合、**即座に free の上限（5回/3回）に戻る**。当月に Pro 上限まで使っていた場合は、その時点で上限到達扱いになる。

例: 無料で4/5回使用済み → Proにアップグレード → 残り96/100回。逆に Pro で50/100回使用済み → expired → free 上限5回に対して使用済み50回 → 上限到達。

### Pay.jp連携

- `POST /api/payment/create` — Pay.jpカスタマー作成 + 定期課金開始
- `POST /api/webhook/payjp` — Pay.jpからのWebhook受信

#### Webhook イベントハンドリング

| イベント | 処理 |
|---------|------|
| `subscription.renewed` | current_period_start/end を更新、**grace_period_end を NULL にクリア** |
| `subscription.canceled` | status を `canceled` に更新 |
| `charge.succeeded` | grace_period_end を NULL にクリア（グレースピリオド中の回復） |
| `charge.failed` | グレースピリオド処理（後述） |

注: `subscription.renewed` は課金成功を前提としているため、grace_period_end もクリアする。

#### Webhook の冪等性・署名検証

- **署名検証**: `Payjp-Signature` ヘッダで HMAC 検証を行い、不正リクエストを拒否
- **冪等性**: webhook_events テーブルに Pay.jp event ID を記録。処理済みIDは即座に 200 を返しスキップ

```
BEGIN;
  INSERT INTO webhook_events (id, event_type) VALUES ($event_id, $type)
    ON CONFLICT (id) DO NOTHING;
  -- 挿入できなかった = 処理済み → ROLLBACK して 200 返却
  -- 挿入できた → イベント処理を実行して COMMIT
COMMIT;
```

#### Webhook のリトライ・タイムアウト

Pay.jp は Webhook 配信失敗時に**最大3回リトライ**する（間隔は Pay.jp 側で制御）。Webhook エンドポイントは **5秒以内に 200 を返す** 必要がある。重い処理が必要な場合は、イベントを受信してキューに入れ、非同期で処理する。ただし Waggly の Webhook 処理はDB更新のみなので5秒以内に完了する想定。

#### 支払い失敗時のグレースピリオド

`charge.failed` 発生時、即座に Pro を剥奪せず **7日間のグレースピリオド** を設ける:

1. `charge.failed` → **grace_period_end が NULL の場合のみ** `now() + 7 days` をセット（リトライによる際限ない延長を防止）:
   ```sql
   UPDATE subscriptions SET grace_period_end = now() + interval '7 days'
   WHERE id = $id AND grace_period_end IS NULL;
   ```
2. グレースピリオド中は Pro 機能を継続
3. 期間内に再課金成功（`charge.succeeded` or `subscription.renewed`） → `grace_period_end` を NULL にクリア
4. 期間終了後も未払い → status を `expired` に変更（APIアクセス時 or pg_cron で判定）
5. ユーザーにはアプリ内で「お支払いに問題があります」バナーを表示

### クーポン

- `POST /api/coupon/validate` — コード検証、割引内容返却。service_role で coupons テーブルにアクセス
- **レートリミット**: IPベースで1分間5回まで。超過時は `429 Too Many Requests` を返す（ブルートフォース対策）

#### クーポンの適用フロー

1. ユーザーがクーポンコードを入力
2. `/api/coupon/validate` でコード検証（有効性・有効期限・max_uses チェック）
3. 決済確定時に `/api/payment/create` 内で以下を1トランザクションで実行:
   - subscriptions に行 INSERT
   - coupon_redemptions に記録（UNIQUE制約で重複防止）
   - coupons.used_count インクリメント
   - Pay.jp に定期課金作成（クーポン内容を反映）

#### クーポンの適用ルール

- `discount_percent` と `free_months` は**排他**（DB制約で担保）
- `discount_percent`: **初月のみ適用**。Pay.jp には割引後の金額で初回課金を作成し、`subscription.renewed` 時（2ヶ月目以降）は通常額（¥480）で課金。Pay.jp の定期課金金額は初回作成時に通常額で設定し、初回のみ手動で割引額をチャージする方式
- `free_months`: Pay.jp の `trial_days` に変換（free_months × 30日）して適用。期間終了後に自動で通常額課金開始（Pay.jp の定期課金が自動処理）
- ユーザー向け表記: 「○日間無料」と日数で表示する（暦上の月数とのずれによる誤解を防ぐ。90日 vs 3暦月のずれについてはFAQ等で補足するとCS対応が楽）

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
4. `/api/payment/create` でサブスク開始（クーポン適用含む）
5. 完了画面 → プラン画面に戻る（Pro表示に変わる）

### ネイティブアプリからの決済リターン

1. アプリから外部ブラウザで `https://waggly.jp/settings/plan/checkout` を開く
2. 決済完了後、Universal Links（iOS）/ App Links（Android）で `https://waggly.jp/app/subscription/complete` に遷移 → アプリが起動
3. アプリ側で Capacitor の `appUrlOpen` イベントをリスン、プラン画面をリロード
4. フォールバック: アプリが未インストールの場合はWebで「アプリに戻ってください」表示

注意: カスタムURLスキーム（`waggly://`）は他アプリに乗っ取られるリスクがあるため、Universal Links / App Links を使用する。

### 月途中のアップグレード

- AI利用回数の上限は**即座に Pro の値に変更**される（当月の利用済み回数はリセットしない）
- 例: 無料で4/5回使用済み → Proにアップグレード → 残り96/100回
- 日割り計算は**しない**。Pay.jp にそのまま月額で課金開始し、current_period_start を課金開始日にする

### 設定画面

既存の設定ページに「プラン」行を追加:
- 無料ユーザー:「無料プラン」+「Proへ」バッジ
- Proユーザー:「Waggly Pro」+ 次回更新日

## 決済: Pay.jp

- 定期課金APIで月額サブスク管理
- トライアル: `trial_days` パラメータで無料期間設定
- クーポン/キャンペーン: 自前DB管理（Pay.jpにクーポン機能なし）
  - `discount_percent`: 初月のみ割引適用。2ヶ月目以降は通常額
  - `free_months`: `trial_days` に変換して Pay.jp に渡す。期間終了後は Pay.jp が自動で通常額課金
- 解約時: **Pay.jp 側の定期課金キャンセルを先に実行**し、成功後に DB 更新（整合性保持）
- アプリからの決済: 外部ブラウザでWeb決済ページを開く（ストア課金規約回避）
- Webhook 署名検証 + 冪等性処理を必須とする

## セキュリティ

- 全新テーブル（subscriptions, webhook_events, coupons, coupon_redemptions, ai_usage, ai_usage_counters）に RLS を有効化
- subscriptions / coupon_redemptions / ai_usage / ai_usage_counters: 自分のレコードのみ SELECT 可。INSERT/UPDATE/DELETE ポリシーなし（= RLS有効下でクライアントから拒否、サーバーサイド service_role のみ操作可）
- coupons / webhook_events: ポリシーなし（= 全操作クライアントから拒否、service_role のみ）
- Webhook エンドポイントは Pay.jp の署名検証で保護
- ネイティブアプリの決済リターンは Universal Links / App Links を使用（カスタムURLスキームの乗っ取りリスク回避）
- クーポン検証エンドポイントに IP ベースレートリミット（1分5回）

## 将来の拡張

- アプリ内課金（RevenueCat）でiOS/Android対応
- 年額プラン（¥3,800/年 = 2ヶ月分お得、plans に `billing_interval: 'year'` の行を追加）
- プラン追加（Proの上位など）
