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

### マイグレーション前提

- `ai_usage` テーブルは**既存**（INSERT が稼働中）。model カラム追加は `ALTER TABLE` で行う
- 他のテーブル（plans, subscriptions, etc.）は新規作成
- `update_updated_at()` 関数は最初に定義し、全トリガーで再利用する

### 共通: updated_at 自動更新関数

全テーブルのトリガーで使用する。マイグレーションの最初に定義する:

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### `plans` テーブル

plans は公開データのため **RLS は設定しない**（全ユーザーが SELECT 可能）。Supabase のデフォルト（RLS 無効 = 全公開）をそのまま利用する。

```sql
CREATE TABLE public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price integer NOT NULL DEFAULT 0,                    -- 単価（円）
  billing_interval text NOT NULL DEFAULT 'month',      -- 'month' or 'year'
  ai_chat_monthly_limit integer NOT NULL DEFAULT 5,
  ai_plan_monthly_limit integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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
  plan_id text NOT NULL REFERENCES public.plans(id),   -- DEFAULT なし（Pro契約時のみINSERT）
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired')),
  payjp_subscription_id text,
  payjp_customer_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,                       -- free_months クーポン適用時にPay.jp側のtrial_endをミラー保存。API側でトライアル中かの判定に使用
  grace_period_end timestamptz,               -- 支払い失敗時のグレースピリオド終了日
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- active なサブスクはユーザーあたり1つだけ
CREATE UNIQUE INDEX idx_subscriptions_active_user
  ON public.subscriptions (user_id) WHERE status = 'active';

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

**クリーンアップ:** 90日経過したイベントを定期削除する（pg_cron or APIアクセス時）:
```sql
DELETE FROM webhook_events WHERE processed_at < now() - interval '90 days';
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
  -- discount_percent と free_months は排他: どちらか片方を必ず設定
  CONSTRAINT coupon_type_exclusive CHECK (
    (discount_percent > 0 AND free_months = 0) OR
    (discount_percent = 0 AND free_months > 0)
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
  UNIQUE(user_id, coupon_id)  -- 同一ユーザーは同一クーポンを1回のみ使用可（解約→再契約でも再利用不可）
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

### `ai_usage` テーブル（トークン追跡用、既存テーブルを拡張）

トークンコスト追跡用。回数制限には使わない（`ai_usage_counters` が担当）。`source` に `'autofill'` を含むのはコスト追跡のため — `ai_usage_counters` は `'chat'` / `'plan'` のみで、autofill はカウント対象外。

**既存テーブルのため `ALTER TABLE` で差分マイグレーションする:**

```sql
-- model カラム追加（原価事後分析用）
ALTER TABLE public.ai_usage ADD COLUMN IF NOT EXISTS model text;
```

参考: 完全なスキーマ定義（新規作成する場合）:

```sql
CREATE TABLE public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('chat', 'plan', 'autofill')),
  model text,                                 -- 使用モデル名（原価事後分析用）
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

回数カウントは **JST（Asia/Tokyo）** 基準。`ai_usage_counters.month` は JST の `YYYY-MM` 文字列で管理する。

- DB側: `to_char(now() AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM')`
- TypeScript側（ICUバージョン非依存の手動計算）:
  ```typescript
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const monthJST = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // "2026-06"
  ```

### 無料ユーザーの初期状態

ユーザー登録時に subscriptions 行は **作成しない**。行なし = 無料プランとみなす。`GET /api/subscription` は行なし時に plans.free のデフォルト値を返す。有料プラン契約時に初めて subscriptions 行を INSERT する。

### 既存コードからの移行

現在の `usage-limit.ts` はトークン数ベース（`ai_monthly_tokens`）で制限している。本設計で回数ベース（`ai_chat_monthly_limit` / `ai_plan_monthly_limit`）に変更する。

#### 具体的な差分

| 現在 (billing.ts) | 新spec |
|---|---|
| `stripe_subscription_id` | `payjp_subscription_id` + `payjp_customer_id` |
| `ai_monthly_tokens: number` | `ai_chat_monthly_limit` + `ai_plan_monthly_limit` |
| `coupon_id` (subscriptions内) | `coupon_redemptions` テーブルに分離 |
| `free_until` | `trial_end` |
| デフォルト上限 100,000トークン | 無料: chat 5回/plan 3回 |

#### 移行手順

1. `ai_usage_counters` テーブルを作成
2. `plans` テーブルを作成（`ai_monthly_tokens` は廃止、`ai_chat_monthly_limit` / `ai_plan_monthly_limit` に置換）
3. `usage-limit.ts` を回数ベースに書き換え（`ai_usage_counters` の `UPDATE ... RETURNING` パターン）
4. `GET /api/usage` のレスポンスをトークン→回数に変更
5. 既存の `billing.ts` の型定義を新スキーマに合わせて更新（上記差分表参照）
6. フロント側の使用量表示を回数ベースに変更

既存ユーザーへの影響: 移行時点で ai_usage_counters は空なので、全ユーザーが当月0回から開始。トークンベースの使用量は ai_usage テーブルに残り、コスト追跡には引き続き利用可能。

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

### 認証要件

決済系エンドポイントはすべて**認証済みユーザーのみ**アクセス可能:
- `POST /api/payment/create` — 認証必須。自分自身のサブスクのみ作成可能
- `PATCH /api/payment/card` — 認証必須。自分の payjp_customer_id のカードのみ更新可能
- `POST /api/subscription/cancel` — 認証必須。自分の active サブスクのみ解約可能
- `POST /api/webhook/payjp` — 認証不要（Pay.jp からの呼び出し）。署名検証で保護

### 未ログイン・ローカル（オフライン）モードの扱い

未ログインユーザー（ネイティブアプリのローカルモード含む）は **AI 機能を利用できない**（認証必須）。既存の `api-client.ts` のスタブ（`limitReached: false, remaining: 100000`）は削除し、未ログイン時は AI 関連 UI を非表示にするか「ログインしてください」を表示する。ギア管理・練習記録のローカル機能は引き続き利用可能。

### フロントエンドのサブスク情報取得戦略

`GET /api/subscription` と `GET /api/usage` は useSWR でクライアントキャッシュし、`revalidateOnFocus: true` で画面復帰時に自動再検証する。AI呼び出しのたびにDB問い合わせが走らないようにする。

```typescript
const { data: usage } = useSWR('/api/usage', fetcher, { revalidateOnFocus: true });
const { data: subscription } = useSWR('/api/subscription', fetcher, { revalidateOnFocus: true });
```

AI呼び出し成功後は `mutate('/api/usage')` で即座にキャッシュを更新。

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

#### AI API呼び出し失敗時のカウンター補正

カウンターインクリメント後にAI API（Claude）呼び出しが失敗した場合:

```sql
UPDATE ai_usage_counters
SET count = count - 1
WHERE user_id = $user_id AND source = $source AND month = $month_jst AND count > 0;
```

AI APIのストリーミング開始前のエラー（ネットワーク障害、500エラー等）の場合のみデクリメントする。ストリーミング途中で切断された場合は「回答を受け取った」とみなしデクリメントしない。

### サブスク管理

- `GET /api/subscription` — 現在のアクティブなプラン取得（行なし = free プランを返す）
- `POST /api/payment/create` — **決済の唯一のエントリポイント**。Pay.jpカスタマー作成 + 定期課金開始 + subscriptions INSERT + クーポン適用を一括処理（後述の3フェーズ）
  - 既に active な行がある場合: partial unique index により INSERT 失敗 → `409 Conflict` を返す（二重契約防止）
- `PATCH /api/payment/card` — カード情報更新（後述）
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
2. **DB: 最新の canceled 行を特定して更新**:
   ```sql
   UPDATE subscriptions
   SET status = 'active',
       payjp_subscription_id = $new_payjp_sub_id,
       current_period_start = $period_start,    -- Pay.jp レスポンスから取得
       current_period_end = $period_end          -- Pay.jp レスポンスから取得
   WHERE id = (
     SELECT id FROM subscriptions
     WHERE user_id = $user_id AND status = 'canceled'
     ORDER BY updated_at DESC LIMIT 1
   );
   ```

expired からの再契約は**新しい行を INSERT** する（履歴保持のため）。

#### canceled → expired の遷移タイミング

以下の2箇所で判定する:
1. **APIアクセス時**: `GET /api/subscription` で status = 'canceled' かつ `current_period_end < now()` なら expired に更新して返す
2. **Supabase cron（pg_cron）**: 日次で `canceled` かつ期間終了済みの行を expired に一括更新（APIアクセスがない場合の保険）

グレースピリオド終了後の expired 遷移も同じ仕組みで処理する。

#### pg_cron セットアップ

**前提: Supabase Pro プラン以上が必要。** Free プランでは pg_cron が使えない。利用不可の場合の代替案:
- **Vercel Cron Jobs**: `vercel.json` で日次スケジュールを設定し、`/api/cron/expire-subscriptions` を呼び出す
- **外部 cron サービス**: cron-job.org 等で日次HTTPリクエストを送信
- **APIアクセス時チェックのみ**: 最小構成。長期間アプリを開かないユーザーの expired 遷移が遅延するリスクあり

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
| `subscription.renewed` | **Pay.jp イベントペイロードから** current_period_start/end を取得して更新、grace_period_end を NULL にクリア |
| `subscription.canceled` | status を `canceled` に更新 |
| `charge.succeeded` | grace_period_end を NULL にクリア（グレースピリオド中の回復） |
| `charge.failed` | グレースピリオド処理（後述） |

注: `subscription.renewed` は課金成功を前提としているため、grace_period_end もクリアする。current_period_start/end は自前計算（`now() + 1 month`）ではなく、**Pay.jp のイベントペイロードの値**を使用する（Pay.jp 側の課金タイミングとの整合性を保証）。

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
- validate はあくまで**表示用の事前チェック**。最終的な有効性判定は `/api/payment/create` のトランザクション内で再検証する

#### クーポンの適用フロー

`/api/payment/create` 内の処理を外部API呼び出しとDB操作で2段階に分離する:

**Phase 1 — DBクーポン予約（トランザクション）:**
```
BEGIN;
  -- クーポンの有効性を再検証（validate は表示用、ここが最終判定）
  SELECT id FROM coupons
    WHERE id = $2 AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR used_count < max_uses);
  -- 行なし → ROLLBACK（無効 or 期限切れ or 上限到達）

  INSERT INTO coupon_redemptions (user_id, coupon_id) VALUES ($1, $2);
  UPDATE coupons SET used_count = used_count + 1
    WHERE id = $2 AND (max_uses IS NULL OR used_count < max_uses);
  -- 更新行数が 0 → ROLLBACK
COMMIT;
```

**Phase 2 — Pay.jp API呼び出し:**
Pay.jp カスタマー作成（or 既存再利用）→ 定期課金作成（クーポン内容反映）

**Phase 3 — DB確定 or ロールバック:**
- Pay.jp 成功 → subscriptions に INSERT + coupon_redemptions に subscription_id を更新
- Pay.jp 失敗 → **1トランザクションで** coupon_redemptions 削除 + used_count デクリメント:
  ```
  BEGIN;
    DELETE FROM coupon_redemptions WHERE user_id = $1 AND coupon_id = $2;
    UPDATE coupons SET used_count = used_count - 1 WHERE id = $2 AND used_count > 0;
  COMMIT;
  ```

このように外部API呼び出しをDBトランザクション外に出すことで、DB接続プール枯渇リスクと Pay.jp 成功→DB commit 失敗の不整合を防ぐ。

**UIのエラーハンドリング:** validate で「有効」と表示した後、payment/create 時にクーポンが使い切られていた場合、「このクーポンは既に使い切られました。クーポンなしで続けますか？」ダイアログを表示する。

#### Pay.jp カスタマー作成失敗時のクリーンアップ

`/api/payment/create` で Pay.jp カスタマー作成成功 → 定期課金作成失敗の場合: **カスタマーは削除しない**（次回の決済試行時に再利用可能）。クーポン予約は Phase 3 でロールバック。ユーザーにはエラーを返し、再試行を促す。

#### クーポンの適用ルール

- `discount_percent` と `free_months` は**排他**（DB制約で担保）

**`discount_percent`（初月割引）:**

Pay.jp公式の「初回のみ異なる金額で課金」パターンを使用:

1. 手動で割引額をチャージ: `payjp.charges.create({ amount: 割引後金額, customer: customer_id })`
2. 定期課金を翌月開始で作成: `payjp.subscriptions.create({ customer: customer_id, plan: 'pro', trial_end: 翌月タイムスタンプ })`
3. 2ヶ月目以降は Pay.jp が通常額（¥480）で自動課金

```typescript
// 例: 50%割引クーポン
const discountedAmount = Math.round(480 * (1 - coupon.discount_percent / 100));

// 1. 初回割引チャージ
await payjp.charges.create({
  amount: discountedAmount,  // 240
  currency: 'jpy',
  customer: customer_id
});

// 2. 定期課金を翌月開始で作成
const trialEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
await payjp.subscriptions.create({
  customer: customer_id,
  plan: 'pro',
  trial_end: trialEnd
});
```

**`free_months`（日数無料）:**

Pay.jp の `trial_end` をタイムスタンプで指定する。**30日/月 固定**で統一し、暦上の月日数の差異（28〜31日）は考慮しない。`free_months = 1` → 30日、`free_months = 3` → 90日。期間終了後に自動で通常額課金開始（Pay.jp の定期課金が自動処理）。

ユーザー向け表記: 「○日間無料」と日数で表示する（例: 「90日間無料」、「約3ヶ月」とは表記しない）。FAQ等でも「無料期間は日数ベースです」と補足。

### カード変更

**`PATCH /api/payment/card`** — カード情報更新

Proユーザーが登録済みカードを変更したい場合:

1. プラン画面に「お支払い方法を変更」リンク
2. Pay.jpのカード入力UIでトークンを取得
3. `PATCH /api/payment/card` に token を送信
4. サーバー側: `payjp.customers.update(customer_id, { card: token })` で既存カスタマーのカードを更新
5. 次回課金から新カードが使われる

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
- Proユーザー:「解約する」ボタン、「お支払い方法を変更」リンク
- クーポンコード入力欄

### 決済フロー

1. 「アップグレード」タップ
2. クーポンあれば入力
3. Pay.jpのカード入力（トークン化）
4. **ボタンを disabled + ローディング表示**（二重クリック防止）
5. `/api/payment/create` でサブスク開始（クーポン適用含む）
6. 成功 → 完了画面 → プラン画面に戻る（Pro表示に変わる）
7. 失敗 → エラー表示 + ボタンを再有効化

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
  - `discount_percent`: 初月のみ割引。手動チャージ + trial_end で翌月から通常額
  - `free_months`: `trial_days` に変換して Pay.jp に渡す。期間終了後は Pay.jp が自動で通常額課金
- 解約時: **Pay.jp 側の定期課金キャンセルを先に実行**し、成功後に DB 更新（整合性保持）
- アプリからの決済: 外部ブラウザでWeb決済ページを開く（ストア課金規約回避）
- Webhook 署名検証 + 冪等性処理を必須とする

## セキュリティ

- plans: 公開データのため **RLS 未設定**（全ユーザー SELECT 可能、書き込みは Supabase ダッシュボード or マイグレーションのみ）
- 全新テーブル（subscriptions, webhook_events, coupons, coupon_redemptions, ai_usage, ai_usage_counters）に RLS を有効化
- subscriptions / coupon_redemptions / ai_usage / ai_usage_counters: 自分のレコードのみ SELECT 可。INSERT/UPDATE/DELETE ポリシーなし（= RLS有効下でクライアントから拒否、サーバーサイド service_role のみ操作可）
- coupons / webhook_events: ポリシーなし（= 全操作クライアントから拒否、service_role のみ）
- Webhook エンドポイントは Pay.jp の署名検証で保護
- ネイティブアプリの決済リターンは Universal Links / App Links を使用（カスタムURLスキームの乗っ取りリスク回避）
- クーポン検証エンドポイントに IP ベースレートリミット（1分5回）

## テスト戦略

- Pay.jp の**テストモード**（テスト用APIキー）で決済フロー全体を検証
- ローカル開発時の Webhook テスト: **ngrok** でローカルサーバーを公開し、Pay.jp の Webhook 送信先に設定
- テスト用カード番号: Pay.jp 提供のテストカード（4242424242424242 等）を使用
- E2Eテスト: Webhook の冪等性（同じイベント2回送信で二重処理されないこと）を確認

## 管理機能

初期フェーズでは**Supabase ダッシュボード + SQL 直打ち**で運用:
- クーポン作成: `INSERT INTO coupons ...`
- サブスク状況確認: `SELECT * FROM subscriptions WHERE status = 'active'`
- 売上確認: Pay.jp ダッシュボード

将来的にはアプリ内 admin 画面を構築（`/admin/subscriptions`, `/admin/coupons`）。

## 将来の拡張

- アプリ内課金（RevenueCat）でiOS/Android対応
- 年額プラン（¥3,800/年 = 2ヶ月分お得、plans に `billing_interval: 'year'` の行を追加）
- プラン追加（Proの上位など）
- メール通知（契約開始・支払い失敗・解約完了）— 現フェーズではアプリ内バナーのみ
