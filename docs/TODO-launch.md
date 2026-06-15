# Waggly 公開 TODO

## ブロッカー（公開前に必須）

- [ ] 開業届の控え受領（屋号: cocoroe）
- [ ] Pay.jp 本番申請完了（開業届アップロード → 承認待ち）
- [ ] Pay.jp 本番承認後:
  - [ ] 本番 API キー取得（`sk_live_`, `pk_live_`）
  - [ ] Vercel 環境変数を本番キーに差し替え（`PAYJP_SECRET_KEY`, `NEXT_PUBLIC_PAYJP_PUBLIC_KEY`, `PAYJP_WEBHOOK_TOKEN`）
  - [ ] Pay.jp 本番ダッシュボードで `pro` プラン作成（¥480/月）
  - [ ] Pay.jp Webhook URL 登録（`https://waggly.jp/api/webhook/payjp`）
- [ ] Supabase で `account_deletion_reasons` テーブル作成
- [ ] Supabase で CHECK 制約更新（`paused` 追加）
- [ ] `DEV_SKIP_AUTH=false` を確認（本番 Vercel）

## 公開後すぐ

- [ ] Google AdSense 審査リクエスト
- [ ] AdSense 承認後: 広告実装（無料ユーザーのみ表示、Pro は非表示）
- [ ] AdSense ゲーム系カテゴリブロック設定

## 将来（優先度低）

- [ ] ライトプラン（¥100/月、広告非表示のみ）検討
- [ ] 自前広告枠（ゴルフ系アフィリ案件管理）
- [ ] メール通知（契約開始・支払い失敗・解約完了）
- [ ] グレースピリオドのバナー表示（支払い失敗時）
- [ ] ネイティブアプリからの決済リターン（Universal Links / App Links）
- [ ] アプリ内課金（RevenueCat）で iOS/Android 対応
