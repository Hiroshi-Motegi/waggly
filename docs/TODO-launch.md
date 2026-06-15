# Waggly 公開 TODO

## ブロッカー（公開前に必須）

- [ ] 開業届の控え受領（屋号: cocoroe）
- [ ] Pay.jp 本番申請完了（開業届アップロード → 承認待ち）
- [ ] Pay.jp 本番承認後:
  - [ ] 本番 API キー取得（`sk_live_`, `pk_live_`）
  - [ ] Vercel 環境変数を本番キーに差し替え（`PAYJP_SECRET_KEY`, `NEXT_PUBLIC_PAYJP_PUBLIC_KEY`, `PAYJP_WEBHOOK_TOKEN`）
  - [ ] Pay.jp 本番ダッシュボードで `pro` プラン作成（¥480/月）
  - [ ] Pay.jp Webhook URL 登録（`https://waggly.jp/api/webhook/payjp`）
- [x] Supabase で `account_deletion_reasons` テーブル作成
- [x] Supabase で CHECK 制約更新（`paused` 追加）
- [x] `DEV_SKIP_AUTH=false` を確認（`.env.local` で設定済み、本番 Vercel でも要確認）
- [x] Cookie ポリシー同意バナー実装

## 公開後すぐ

- [ ] Google AdSense 審査リクエスト
- [x] 広告コンポーネント実装済み（バナー広告・インタースティシャル広告、無料ユーザーのみ表示）
- [ ] AdSense 承認後: 広告有効化
- [ ] AdSense ゲーム系カテゴリブロック設定

## 将来（優先度低）

- [x] ライトプラン（¥100 買い切り、広告非表示）実装済み
- [~] 自前広告枠 — アフィリURL変換（Amazon/楽天）は実装済み、管理画面は未実装
- [ ] メール通知（契約開始・支払い失敗・解約完了）
- [~] グレースピリオド — DB追跡は実装済み（Webhook）、ユーザー向けバナー表示は未実装
- [ ] ネイティブアプリからの決済リターン（Universal Links / App Links）
- [ ] アプリ内課金（RevenueCat）で iOS/Android 対応
