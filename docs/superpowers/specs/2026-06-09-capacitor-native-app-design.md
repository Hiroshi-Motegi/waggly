# Phase 1e: Capacitorネイティブアプリ化

## Summary

Next.js WebアプリをCapacitorでiOS/Androidネイティブアプリにする。ローカルDB（SQLite）でオフライン動作可能。無料リリース（IAPは後日追加）。

## Architecture

```
[Capacitorアプリ (iOS/Android)]
  ├── ローカルHTML/CSS/JS (Next.js static export)
  ├── SQLite (ローカルDB)
  ├── API Adapter → https://waggly.jp/api/* (オンライン時)
  └── SQLite ↔ Supabase 同期 (オンライン復帰時)

[Vercel] (既存のまま維持)
  ├── Web版LIFF (SSR)
  └── APIルート (/api/*)
```

Web版（LIFF）とアプリ版は同一リポジトリ。ビルド設定で分岐。

## 1. Static Export対応

- `next.config.ts`に`output: "export"`を追加（**アプリビルド用の別configまたは環境変数で切り替え**）
- Web版は現行のSSRのまま維持
- Dynamic routeは`generateStaticParams`を追加するか、クライアントサイドルーティングに統一
- Server ComponentsからClient Componentsへの変換（static exportで動かない箇所のみ）
- `<Image />`コンポーネントを`<img>`に置換（next/imageはexportで使えない）

## 2. APIアダプター層

`src/lib/api-client.ts`を追加:

```typescript
import { Capacitor } from "@capacitor/core";

const API_BASE = Capacitor.isNativePlatform()
  ? "https://waggly.jp"
  : "";

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
```

既存の`fetch("/api/...")`を`fetch(apiUrl("/api/..."))`に置換。

認証トークンの付与:
- Web版: Supabaseクッキー（現行のまま）
- アプリ版: Supabase JWTをAuthorizationヘッダーで送信。APIルート側でcookie/headerの両方を受け付けるよう拡張

## 3. ローカルDB（SQLite）

### プラグイン
- `@capacitor-community/sqlite`

### ミラーするテーブル
- `clubs` — クラブ一覧・詳細
- `club_memos` — クラブ別メモ
- `club_images` — 画像URL（画像ファイル自体はキャッシュしない）
- `accessories` — アクセサリー一覧
- `practice_sessions` — 練習記録
- `practice_clubs` — 練習記録のクラブ別内訳
- `maintenances` — メンテナンス履歴

### ミラーしないテーブル
- `users` — 認証はオンライン必須
- `knowledge_base` — サーバーのみ
- `coaches`/`plans` — AI機能はオンラインのみ

### データアクセス層

`src/lib/data-store.ts`:
- `isOffline()`: ネットワーク状態チェック（Capacitor Network plugin）
- 読み取り: オフライン → SQLite、オンライン → API + SQLiteにキャッシュ
- 書き込み: SQLiteに即書き込み + オンラインならAPIにも送信。オフラインなら`pending_sync`テーブルにキュー

### テーブルスキーマ管理
- SQLiteのテーブル定義はSupabaseのマイグレーションと手動同期
- バージョン番号で管理。アプリ起動時にスキーマバージョンチェック → マイグレーション実行

## 4. 同期

### 方針
- **サーバー優先**: 競合時はサーバーのデータが勝つ
- **タイムスタンプベース**: 各レコードの`updated_at`で比較

### フロー
1. アプリ起動時 or ネットワーク復帰時に同期トリガー
2. `pending_sync`テーブルのキューを順次送信（POST/PATCH/DELETE）
3. サーバーからユーザーの全データをfetch → SQLiteに反映
4. 同期完了後にUIをリフレッシュ

### 初回セットアップ
- ログイン成功後にサーバーからフルデータをダウンロード → SQLiteに格納

## 5. 認証

### Apple Sign In
- `@capacitor-firebase/authentication`または`@codetrix-studio/capacitor-google-auth`
- Supabase Authの`signInWithIdToken`でApple IDトークンを検証

### Google Sign In
- `@codetrix-studio/capacitor-google-auth`
- Supabase Authの`signInWithIdToken`でGoogleトークンを検証

### ユーザー統合
- LINE（Web版）とApple/Google（アプリ版）で同一メールアドレスならSupabase側で自動リンク
- メールが異なる場合は別ユーザーとして扱う（将来的にアカウント連携機能を追加可能）

## 6. ビルド・配信

### ビルドフロー
```
npm run build:app  (next build + next export)
  ↓
npx cap copy        (exportしたHTMLをCapacitorプロジェクトにコピー)
  ↓
npx cap open ios    (Xcode) / npx cap open android (Android Studio)
  ↓
ストアビルド・提出
```

### package.jsonスクリプト
```json
{
  "build:app": "NEXT_OUTPUT=export next build",
  "cap:sync": "npx cap sync",
  "cap:ios": "npx cap open ios",
  "cap:android": "npx cap open android"
}
```

### ストア
- iOS: Apple Developer Program ($99/年) 必要
- Android: Google Play Console ($25一回) 必要

## 7. Phase 1e対象外

- IAP（300円課金）→ ユーザー獲得後に追加
- プッシュ通知 → 後日追加
- WITB画像生成のオフライン化 → オンライン時のみ
- AIチャットのオフライン化 → オンライン時のみ
- 画像ファイルのローカルキャッシュ → URLのみ保持、表示はオンライン時

## 8. 必要なCapacitorプラグイン

| プラグイン | 用途 |
|---|---|
| `@capacitor/core` | コアAPI |
| `@capacitor/app` | アプリライフサイクル |
| `@capacitor/network` | オンライン/オフライン検知 |
| `@capacitor/splash-screen` | スプラッシュ画面 |
| `@capacitor/status-bar` | ステータスバー制御 |
| `@capacitor-community/sqlite` | ローカルDB |
| `@codetrix-studio/capacitor-google-auth` | Google Sign In |
| Apple Sign In | iOS標準（Capacitorプラグイン） |
