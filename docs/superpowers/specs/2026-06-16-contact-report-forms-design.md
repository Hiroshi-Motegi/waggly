# お問い合わせ・通報フォーム

## 概要

自前のお問い合わせフォームと通報フォームを作成。メールアドレス表示のみだった `/help/contact` をフォーム化し、名刺ページからの通報用に `/report` を新設する。送信内容はDBに保存し、Resendで管理者にHTMLメール通知を送る。スパム対策にCloudflare Turnstileを使用。

## DB変更

### マイグレーション: `208_contact_report.sql`

```sql
CREATE TABLE inquiries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  name text,
  email text NOT NULL,
  category text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_inquiries_status ON inquiries(status);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON inquiries
  FOR ALL USING (false);

CREATE TABLE reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reported_username text NOT NULL,
  reason text NOT NULL,
  detail text,
  reporter_email text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_reports_status ON reports(status);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON reports
  FOR ALL USING (false);
```

- `inquiries.user_id`: ログインユーザーの場合のみセット
- `inquiries.name`: 未ログイン時に入力
- `inquiries.email`: ログイン有無に関わらず常に取得
- `inquiries.category`: `bug` / `feature` / `question` / `other`
- `reports.reason`: `inappropriate` / `spam` / `harassment` / `other`
- `reports.reporter_email`: 対応結果の返信希望時のみ（任意）
- RLSは全拒否（APIからはサービスロールでアクセス）
- `status`: `open` / `in_progress` / `closed`（将来の管理画面用）

## 型定義

`src/types/database.ts` に追加:

```typescript
export interface Inquiry {
  id: string;
  user_id: string | null;
  name: string | null;
  email: string;
  category: 'bug' | 'feature' | 'question' | 'other';
  message: string;
  status: 'open' | 'in_progress' | 'closed';
  created_at: string;
}

export interface Report {
  id: string;
  reported_username: string;
  reason: 'inappropriate' | 'spam' | 'harassment' | 'other';
  detail: string | null;
  reporter_email: string | null;
  status: 'open' | 'in_progress' | 'closed';
  created_at: string;
}
```

## メール送信

### `src/lib/send-admin-email.ts`

```typescript
async function sendAdminEmail(subject: string, html: string): Promise<void>;
```

- Resend SDKで `apps@cocoroe.me` 宛にHTMLメールを送信
- 将来Push通知等が必要になった時点で通知レイヤーを抽象化する（今は作らない）

### メールテンプレート

テンプレートリテラルでHTML文字列を組む（react-emailは使わない）。

`src/lib/email-templates.ts` にヘルパー関数を配置:

- `buildInquiryEmail(inquiry)` — お問い合わせ通知HTML生成
- `buildReportEmail(report)` — 通報通知HTML生成

件名:
- `[Waggly] 新しいお問い合わせ: {category}`
- `[Waggly] 新しい通報: {reported_username}`

本文: 送信者情報 + カテゴリ/理由 + メッセージ内容をHTML整形。シンプルなレイアウト。

## API

### POST `/api/contact`

お問い合わせ送信。

1. レート制限チェック（同一IPから1分に3回まで、超過時 429）
2. Turnstileトークン検証（失敗時 403）
3. バリデーション（email必須、category必須、message必須）
4. ログイン状態確認 → ログイン済みなら `user_id` をセット
5. `inquiries` テーブルにINSERT
6. `sendAdminEmail(...)` で管理者に通知
7. 201レスポンス

### POST `/api/report`

通報送信。

1. レート制限チェック（同一IPから1分に3回まで、超過時 429）
2. Turnstileトークン検証（失敗時 403）
3. バリデーション（reported_username必須、reason必須）
4. `reported_username` の存在確認（profilesテーブルと突合、存在しない場合 400）
5. `reports` テーブルにINSERT
6. `sendAdminEmail(...)` で管理者に通知
7. 201レスポンス

認証不要。ログイン状態によらず誰でも送信可能。

### レート制限

インメモリの `Map<string, { count: number; resetAt: number }>` で実装。`src/lib/rate-limit.ts` に配置。Vercel等でサーバーレスの場合はインスタンス間で共有されないが、簡易対策としては十分。将来的にRedis等に移行可能。

## ページ

### お問い合わせフォーム `/help/contact`（既存ページ改修）

既存の静的ページをフォームに置き換え。

**ログイン済み:**
- ニックネーム自動表示（編集不可）
- メールアドレス入力

**未ログイン:**
- 名前入力
- メールアドレス入力

**共通:**
- カテゴリ選択: 不具合 / 機能要望 / 質問 / その他
- お問い合わせ内容（テキストエリア）
- Turnstileウィジェット
- 送信ボタン

バリデーションは既存の `form-validation.ts` パターンを使用。

### お問い合わせ送信完了 `/help/contact/complete`（新規）

- 「お問い合わせを受け付けました」メッセージ
- 「2〜3営業日以内にご連絡いたします」
- トップへ戻るボタン
- フォーム送信なしで直接アクセスされた場合は `/help/contact` にリダイレクト

### 通報フォーム `/report`（新規）

- 通報対象ユーザー名: URLパラメータ `?username=xxx` から自動入力（編集不可）
- 理由選択: 不適切なコンテンツ / スパム / 嫌がらせ / その他
- 詳細（任意テキストエリア）
- メールアドレス（任意 — 対応結果の返信希望時）
- Turnstileウィジェット
- 送信ボタン

### 通報送信完了 `/report/complete`（新規）

- 「通報を受け付けました」メッセージ
- 「内容を確認の上、対応いたします」
- トップへ戻るボタン
- フォーム送信なしで直接アクセスされた場合は `/report` にリダイレクト

## 名刺ページ変更

`/p/[username]/page-client.tsx` のフッター:

```
変更前: 不適切なコンテンツの通報: [メアド画像]
変更後: 不適切なコンテンツを通報  ← /report?username=xxx へのリンク
```

## 外部サービス

### Resend

- パッケージ: `resend`
- 環境変数: `RESEND_API_KEY`
- 送信元: Resendデフォルトの `onboarding@resend.dev`（独自ドメイン設定は後日）

### Cloudflare Turnstile

- パッケージ: `@marsidev/react-turnstile`（React向け軽量ラッパー）
- 環境変数: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`、`TURNSTILE_SECRET_KEY`
- 検証: API側で `https://challenges.cloudflare.com/turnstile/v0/siteverify` にPOST

## 影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `supabase/migrations/208_contact_report.sql` | テーブル作成 |
| `src/types/database.ts` | Inquiry, Report型追加 |
| `src/lib/send-admin-email.ts` | 管理者メール送信（新規） |
| `src/lib/email-templates.ts` | メールHTML生成ヘルパー（新規） |
| `src/lib/rate-limit.ts` | レート制限（新規） |
| `src/app/api/contact/route.ts` | POST（新規） |
| `src/app/api/report/route.ts` | POST（新規） |
| `src/app/help/contact/page.tsx` | フォーム化（改修） |
| `src/app/help/contact/complete/page.tsx` | 送信完了（新規） |
| `src/app/report/page.tsx` | 通報フォーム（新規） |
| `src/app/report/complete/page.tsx` | 通報完了（新規） |
| `src/app/p/[username]/page-client.tsx` | フッター通報リンク変更 |
| `package.json` | resend, @marsidev/react-turnstile 追加 |
