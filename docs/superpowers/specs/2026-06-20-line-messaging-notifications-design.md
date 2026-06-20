# LINE Messaging API 自動通知 設計書

**日付:** 2026-06-20  
**対象:** LINEログインユーザーへのオンボーディング系エンゲージメント通知

---

## 概要

ユーザーの利用状況に応じて LINE プッシュ通知を自動送信する。  
対象は `user_providers` に `provider = 'line'` が存在するユーザーのみ。

---

## 通知仕様

### 通知① `add_club`「マイクラブを追加してみませんか？」

| 項目 | 内容 |
|---|---|
| 送信条件 | ユーザー登録から3日後、クラブ件数が0件 |
| 送信回数 | 1回のみ |
| メッセージ | 「マイクラブを追加してみませんか？　ゴルフクラブを登録するとスコアやメモを管理できます。」（文言は実装時に調整可） |

### 通知② `share_card`「名刺を共有してみませんか？」

| 項目 | 内容 |
|---|---|
| 送信条件 | 初回クラブ登録から3日後、`profiles.username` が未設定 |
| 送信回数 | 1回のみ |
| メッセージ | 「名刺を共有してみませんか？　ユーザー名を設定するとゴルファー名刺を友達に共有できます。」（文言は実装時に調整可） |

---

## アーキテクチャ

```
Vercel Cron (毎日 JST 10:00)
  → POST /api/cron/line-notify
      Authorization: Bearer {CRON_SECRET}
    → Supabase: 条件クエリで対象ユーザー抽出
    → LINE Messaging API: push message 送信
        POST https://api.line.me/v2/bot/message/push
    → Supabase: line_notification_logs に記録
```

既存の `/api/cron/expire-subscriptions` と同じ認証パターンを踏襲する。

---

## データベース変更

### 新テーブル `line_notification_logs`

```sql
CREATE TABLE public.line_notification_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,  -- 'add_club' | 'share_card'
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_type)
);
```

`UNIQUE(user_id, notification_type)` により1回のみ送信を DB レベルで保証する。

---

## 通知条件クエリ

### 通知① `add_club`

```sql
SELECT up.provider_sub AS line_user_id, u.id AS user_id
FROM users u
JOIN user_providers up ON up.user_id = u.id AND up.provider = 'line'
LEFT JOIN clubs c ON c.user_id = u.id
LEFT JOIN line_notification_logs l
  ON l.user_id = u.id AND l.notification_type = 'add_club'
WHERE c.id IS NULL                                   -- クラブ0件
  AND u.created_at < now() - interval '3 days'       -- 登録3日超
  AND l.id IS NULL;                                  -- 未送信
```

### 通知② `share_card`

```sql
SELECT up.provider_sub AS line_user_id, u.id AS user_id
FROM users u
JOIN user_providers up ON up.user_id = u.id AND up.provider = 'line'
JOIN clubs c ON c.user_id = u.id                     -- クラブあり
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN line_notification_logs l
  ON l.user_id = u.id AND l.notification_type = 'share_card'
WHERE (p.username IS NULL)                            -- username未設定
  AND l.id IS NULL                                   -- 未送信
GROUP BY up.provider_sub, u.id
HAVING MIN(c.created_at) < now() - interval '3 days'; -- 初回クラブ登録3日超
```

---

## API実装

### `/api/cron/line-notify` (POST)

1. `CRON_SECRET` で認証（既存 cron と同じ timing-safe 比較）
2. 通知①の対象ユーザーを取得 → LINE push 送信 → ログ記録
3. 通知②の対象ユーザーを取得 → LINE push 送信 → ログ記録
4. 送信数を JSON で返す

```ts
// レスポンス例
{ "add_club": 3, "share_card": 1 }
```

### ログ記録

```sql
INSERT INTO line_notification_logs (user_id, notification_type)
VALUES ($1, $2)
ON CONFLICT (user_id, notification_type) DO NOTHING;
```

競合時は無視することでレース条件でも二重送信を防ぐ。

### LINE Messaging API 呼び出し

```ts
await fetch("https://api.line.me/v2/bot/message/push", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN}`,
  },
  body: JSON.stringify({
    to: lineUserId,        // user_providers.provider_sub
    messages: [{ type: "text", text: "..." }],
  }),
});
```

---

## 環境変数

| 変数名 | 説明 |
|---|---|
| `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` | LINE Messaging API チャンネルのロングタームアクセストークン |
| `CRON_SECRET` | 既存。cron 認証に使用 |

---

## Vercel Cron 設定

`vercel.json` に追記：

```json
{
  "crons": [
    {
      "path": "/api/cron/line-notify",
      "schedule": "0 1 * * *"
    }
  ]
}
```

（UTC 01:00 = JST 10:00）

---

## 前提条件・制約

- **LINE Official Account（Messaging API チャンネル）の作成が必要**（既存 LINE Login チャンネルとは別）
- LINE Login チャンネルと Messaging API チャンネルが同じ LINE Developer Provider 配下であれば、`provider_sub`（LINE user ID）は共通で使い回せる
- ユーザーが Bot をフレンド追加していないとプッシュ通知を受け取れない。将来的に LINE Login 時の Bot Link 機能（友達追加を促す）の設定が必要
- 通知対象は LINEログインユーザーのみ（Google/Email 登録ユーザーは対象外）

---

## スコープ外（今回は対象外）

- 通知文言の管理画面
- ユーザーによる通知 opt-out 機能
- リッチメッセージ（画像・ボタン付きフレックスメッセージ）
- LINE Login 時の Bot Link 機能
