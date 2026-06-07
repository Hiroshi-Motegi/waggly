# Waggly 今後の開発タスク

## 現状のステータス（2026-06-08時点）

### 完了済み
- クラブ管理（CRUD、スペック、写真、メンテナンス履歴）
- マイバッグ（14本制限、並び替え、ギャップ表示、ステータス管理）
- 練習記録（番手別球数、メモ、編集・削除）
- AIコーチ（チャット、会話履歴、Markdown表示）
- クラブ自動検索（AI）
- 利用規約・オンボーディング（規約バージョン管理付き）
- 課金基盤（plans/coupons/subscriptions テーブル、Stripe未接続）
- トークン使用量管理（プラン別上限）
- LIFF認証、Vercelデプロイ済み

### 技術スタック
- Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + Auth + Storage)
- Claude API (Sonnet 4.6) via Vercel AI SDK
- LIFF SDK (LINE Front-end Framework)
- Vercel (ホスティング)
- プロジェクトディレクトリ: `/Users/hiroshi-motegi/Git/Waggly`
- 本番URL: https://waggly-alpha.vercel.app
- LIFF URL: https://liff.line.me/2010318410-BwV5TuuI

---

## 未実装タスク

### 優先度: 高

#### 1. 練習提案機能の完成
- 練習記録保存後に「AIの練習提案を見る」ボタン表示
- `/api/coach/plan` POSTで提案生成（実装済みだがUIから呼ぶ導線がない）
- 提案履歴ページ `/coach/plans` のリンク追加
- 提案のdone/skipped状態管理

**関連ファイル:**
- `src/app/api/coach/plan/route.ts` — 生成API（実装済み）
- `src/app/coach/plans/page.tsx` — 履歴ページ（実装済み）
- `src/app/practice/new/page.tsx` — 記録保存後に提案ボタン追加
- `src/components/coach/plan-card.tsx` — 提案カード（実装済み）

#### 2. Stripe連携
- Stripe Checkout Sessionの作成API
- Webhook受信エンドポイント（支払い成功 → subscriptions更新）
- カスタマーポータルURL生成
- 設定画面にプラン変更ボタン追加

**前提:**
- DBテーブル: plans, coupons, subscriptions（作成済み）
- subscriptionsに stripe_subscription_id, stripe_customer_id フィールドあり
- `src/lib/billing.ts` にヘルパー関数あり

**実装手順:**
1. `npm install stripe`
2. Stripe Dashboard でWebhookエンドポイント登録 (`/api/stripe/webhook`)
3. `src/app/api/stripe/checkout/route.ts` — Checkout Session作成
4. `src/app/api/stripe/webhook/route.ts` — Webhook受信
5. `src/app/api/stripe/portal/route.ts` — カスタマーポータル
6. 設定画面にプラン変更UIを追加

**必要な環境変数:**
```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
```

#### 3. UIデザインの改善
- カラーテーマをゴルフアプリらしいグリーン系に変更
- ロゴの設置（ヘッダー、オンボーディング）
- 全体的なスペーシング・タイポグラフィの調整
- ダークモード対応の確認

---

### 優先度: 中

#### 4. 飛距離入力のUX改善
- ヘッドスピード帯選択 → 標準飛距離プリセット
- 練習データからの飛距離自動更新（将来）

**案:**
- クラブ登録時にHS帯を選択（〜35, 35-40, 40-45, 45+）
- 番手ごとの標準飛距離をプリセット
- ユーザーが手動で調整可能

#### 5. 練習統計
- 月間球数、番手別の練習比率グラフ
- 練習頻度カレンダー表示

**関連ファイル:**
- `src/components/practice/practice-stats.tsx` — 未実装
- `src/app/practice/page.tsx` — 統計セクション追加

#### 6. セッティング共有（名刺機能）
- マイバッグのセッティングをカード画像として生成
- LINEでシェア

**実装方針:**
- OGP画像生成（`/api/og` でSVG → PNG）
- LINE共有ボタン（LIFF ShareTargetPicker）

#### 7. バウンス角の追加
- ウェッジのみ表示されるバウンス角フィールド
- DBに `bounce` カラム追加（numeric, nullable）
- club-form.tsx でcategory === "wedge" 時のみ表示

---

### 優先度: 低

#### 8. 外部連携
- Arccos API連携（ショットデータ取り込み）
- 楽天GORA API（練習場・ゴルフ場検索）

#### 9. コミュニティ機能
- 同じクラブユーザー同士のレビュー共有
- Supabase Realtime活用

#### 10. AWS移行
- Amazon Bedrock + RDS + S3（スケール時）
- ユーザー1000人超の場合に検討

---

## 既知の課題

### バグ・改善
- history APIリクエストが大量に飛ぶ場合がある（coach page のuseEffect依存配列確認）
- devモードのユーザー作成がAPIリクエストごとにDB確認している（キャッシュ済みだが初回が遅い）
- LIFFでの `env(safe-area-inset-bottom)` の挙動がデバイスにより異なる

### 技術的負債
- API routeの型安全性（`any` が多い、Supabase型生成の導入を検討）
- テストカバレッジ（gap-analysis, system-prompt, plan-parser のみ）
- エラーハンドリング（ユーザー向けエラーメッセージの統一）

---

## DB構造（現在）

```
users (id, line_user_id, display_name, avatar_url, agreed_terms_at, created_at)
clubs (id, user_id, category, club_number, maker, model, shaft_name, shaft_flex, loft, lie, length, distance, purchase_date, purchase_shop, purchase_price, status, sort_order, created_at)
club_images (id, club_id, image_url, is_primary, created_at)
maintenances (id, club_id, type, description, shop, cost, done_at, created_at)
practice_sessions (id, user_id, practiced_at, location, total_balls, memo, created_at)
practice_clubs (id, session_id, club_id, balls)
practice_plans (id, user_id, title, summary, source, status, created_at)
practice_plan_items (id, plan_id, club_id, balls, focus, sort_order)
ai_chats (id, user_id, conversation_id, role, message, created_at)
ai_usage (id, user_id, input_tokens, output_tokens, model, source, created_at)
plans (id, name, price, ai_monthly_tokens, is_default)
coupons (id, code, discount_percent, free_months, max_uses, used_count, expires_at, is_active)
subscriptions (id, user_id, plan_id, coupon_id, status, free_until, stripe_subscription_id, stripe_customer_id, current_period_start, current_period_end, created_at)
```

## 設定定数

```typescript
// src/lib/constants.ts
TERMS_UPDATED_AT = "2026-06-08"  // 変更すると全ユーザーに再同意要求

// プランのトークン上限はDBのplansテーブルで管理
// free: 150,000 tokens/月
// premium: 500,000 tokens/月
```
