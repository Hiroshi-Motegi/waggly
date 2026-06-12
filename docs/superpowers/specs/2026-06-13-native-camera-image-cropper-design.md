# ネイティブカメラ + 画像トリミング設計

## 概要

クラブ・アクセサリーの画像撮影/選択にネイティブカメラ対応を追加し、全プラットフォーム（Web/iOS/Android）で1:1トリミングUIを提供する。画像サイズと画角を統一し、表示の一貫性を改善する。

## 背景

- 現状はHTMLの `<input type="file" accept="image/*">` のみ
- スマホブラウザではOS経由でカメラ利用可能だが、ネイティブアプリでは専用カメラ連携がない
- 画像サイズが不揃いで、表示時に見切れが発生している

## アプローチ

**Capacitor Camera + Web用共通cropperライブラリ**

- ネイティブ: `@capacitor/camera` で撮影/選択 → 共通cropperでトリミング
- Web: 従来の file input → 同じcropperでトリミング
- トリミングUIを1つの共通Reactコンポーネントで統一
- cropperライブラリ: `react-cropper`（Cropper.js のReactラッパー）

他の検討案:
- OS標準クロップ（`allowEditing: true`）→ アスペクト比1:1の強制が困難、iOS/Androidで挙動が異なる
- サードパーティCropperプラグイン → メンテナンス不安、Capacitor 8対応不明

## アーキテクチャ

```
ImagePicker (画像取得の統一インターフェース)
├─ ネイティブ: Camera.getPhoto({ source: CameraSource.Prompt })
│  → カメラ or フォトライブラリの選択シートをOSが表示
└─ Web: <input type="file" accept="image/*">

    ↓ 画像取得後
    ↓ プレリサイズ（最大2400px、OOM防止）

ImageCropper (モーダルで1:1トリミング、lazy loaded)
├─ react-cropper (Cropper.js Reactラッパー) 使用
├─ cropperjs/dist/cropper.css のインポート必須
├─ 1:1固定アスペクト比
├─ 確定 → croppedなFileオブジェクトを返す
└─ キャンセル → 元に戻る
```

**データフロー**: ImagePicker → プレリサイズ(max 2400px) → ImageCropper → `File` オブジェクト(max 1200px, WebP) → 既存のアップロードフロー（FormData → API）

既存のアップロードAPI（`/api/clubs/[clubId]/images`, `/api/accessories/[id]/image`）は変更不要。

## 新規ファイル

### `src/components/ui/image-picker.tsx`

画像取得の統一コンポーネント。

```tsx
interface ImagePickerProps {
  onPick: (file: File) => void;  // トリミング済みFileを返す
  children: React.ReactNode;      // トリガーとなるボタン等（既存UIをそのまま渡す）
}
```

- `children`（+ボタンや「写真を追加」など）をクリック → 画像取得 → プレリサイズ → ImageCropperを表示 → 確定後に `onPick` 発火
- 各画面の既存UIボタンをそのまま `children` に渡すので、見た目の変更はゼロ
- CropperのモーダルはImagePicker内部で管理
- `isNative()` でCapacitor Camera / file input を分岐
- **ImageCropperは `React.lazy` + `Suspense` で遅延ロード**（cropperjs ~100KB gzipped ~30KB のバンドルサイズ対策。画像追加ボタンを押すまでロード不要）

### `src/components/ui/image-cropper.tsx`

モーダル形式のトリミングUI。

```tsx
interface ImageCropperProps {
  imageUrl: string;          // トリミング元の画像URL（プレリサイズ済み）
  onCrop: (file: File) => void;
  onRetake: () => void;       // 撮り直す → 画像取得フローを再実行
  onCancel: () => void;
  aspectRatio?: number;      // デフォルト1（1:1）
}
```

- フルスクリーンモーダル（背景暗転）
- `react-cropper` で画像を表示、ピンチズーム/ドラッグで範囲選択
- `cropperjs/dist/cropper.css` をインポート（必須）
- 下部に「撮り直す」「キャンセル」「決定」ボタン
- 「撮り直す」→ cropperを閉じてImagePickerの画像取得フローを再実行（カメラ/ファイル選択に直接戻る）
- 決定 → `canvas.toBlob()` → File化 → `onCrop` 発火
- 出力フォーマット: **WebP (quality 0.85)**、`canvas.toBlob('image/webp')` 非対応ブラウザでは **JPEG fallback**（`toBlob('image/jpeg', 0.85)`）
- 最大出力幅: **1200px**（元画像が小さい場合はそのまま）

### `src/lib/camera.ts`

Capacitor Camera のユーティリティ + 画像プレリサイズ。

```ts
// ネイティブでの画像取得（カメラ撮影 or フォトライブラリ選択） → File変換
export async function pickImageNative(): Promise<File>

// 画像をcropperに渡す前にプレリサイズ（OOM防止）
// スマホカメラは4000-8000px級 → cropperはcanvasにフル解像度ロード → 低スペック端末でOOMリスク
// 最終出力1200pxなので入力に4000px以上は不要
export async function preResizeImage(file: File, maxSize?: number): Promise<string>
// デフォルト maxSize = 2400px
// createImageBitmap + canvas で縮小し、data URL を返す
```

- `@capacitor/camera` を動的import（Web環境ではロードしない）
- `Camera.getPhoto({ source: CameraSource.Prompt, saveToGallery: false })` で撮影/選択シート表示
- `saveToGallery: false` を明示（`true` だとiOSで `NSPhotoLibraryAddUsageDescription` が追加で必要になるため）
- Photo結果（base64/dataUrl）をFileオブジェクトに変換して返す

## 変更対象ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/components/club/club-form.tsx` | file input + handleFileSelect → `ImagePicker` に置換 |
| `src/components/club/club-image-gallery.tsx` | file input + handleFileChange → `ImagePicker` に置換 |
| `src/app/items/new/page.tsx` | file input + handleFileSelect → `ImagePicker` に置換 |
| `src/app/items/[id]/page-client.tsx` | file input + handleImageSelect → `ImagePicker` に置換 |
| `capacitor.config.ts` | Camera プラグイン設定を追加 |
| `ios/App/App/Info.plist` | `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` 追加 |
| `android/app/src/main/AndroidManifest.xml` | `CAMERA`, `READ_EXTERNAL_STORAGE`, `READ_MEDIA_IMAGES` パーミッション追加 |

## ネイティブ設定

### iOS (`ios/App/App/Info.plist`)

```xml
<key>NSCameraUsageDescription</key>
<string>ギアの写真を撮影するためにカメラを使用します</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>ギアの写真を選択するためにフォトライブラリを使用します</string>
```

注: `NSPhotoLibraryAddUsageDescription`（カメラロールへの保存）は `saveToGallery: false` を明示するため不要。

### Android (`android/app/src/main/AndroidManifest.xml`)

```xml
<uses-permission android:name="android.permission.CAMERA" />
<!-- Android 12以下: フォトライブラリ読み取り -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
<!-- Android 13+ (API 33): フォトライブラリ読み取り -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

`@capacitor/camera` v8 がランタイムで権限リクエストを自動的に行うが、マニフェスト宣言は必須。実装時にv8の挙動を確認する。

### `capacitor.config.ts`

```ts
Camera: {
  // 必要に応じて presentationStyle, promptLabelHeader 等を設定
}
```

## 依存追加

- `@capacitor/camera` (v8.x) — ネイティブカメラアクセス
- `react-cropper` — Cropper.js のReactラッパー
- `cropperjs` — react-cropperのpeer dependency

## 画像出力仕様

| 項目 | 値 |
|------|-----|
| フォーマット | WebP（非対応ブラウザはJPEG fallback） |
| 品質 | 0.85 |
| アスペクト比 | 1:1（固定） |
| cropper入力最大幅 | 2400px（プレリサイズ、OOM防止） |
| 最終出力最大幅 | 1200px |
| 想定サイズ | 100-200KB/枚 |

## エラーハンドリング

- **カメラ権限拒否**: `Camera.getPhoto()` のエラーコードで権限拒否を判別し、トーストで「カメラの使用を許可してください」と通知する。ユーザーキャンセルとは区別する。OS設定画面への誘導は今回スコープ外とし、必要に応じて後から追加
- **ユーザーキャンセル**: カメラUI/フォトライブラリで「キャンセル」した場合は何もしない（意図的な操作）
- **画像フォーマット**: cropperがWebP出力（fallback JPEG）するため、既存APIの許可リスト（JPEG/PNG/WebP/GIF）に合致
- **大サイズ画像**: cropper入力前に最大2400pxにプレリサイズ（`createImageBitmap` + canvas）してOOMを防止。cropper確定時にさらに1200pxにリサイズ + WebP 0.85圧縮

## スコープ外

- **既存アップロード済み画像の再トリミング**: 今回は新規アップロード時のみ。既存画像の再トリミングは将来の機能として検討
- **OS設定画面への誘導**: 権限拒否時のトーストは出すが、設定画面への遷移は今回含めない

## テスト方針

- **ImageCropper**: `onCrop` が1:1のFileを返すこと、キャンセルで `onCancel` が発火することのユニットテスト
- **camera.ts**: Capacitor Cameraのモック → File変換が正しいことのユニットテスト
- **preResizeImage**: 大画像（4000px超）が2400px以下にリサイズされること、小画像はそのままであることのユニットテスト
- **WebP fallback**: `canvas.toBlob('image/webp')` 非対応時にJPEGにフォールバックすることのテスト
- **統合テスト**: 実機でカメラ撮影 → トリミング → アップロード → 画像表示の一連フローを手動確認（iOS/Android/Webブラウザ）
