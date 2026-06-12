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

ImageCropper (モーダルで1:1トリミング)
├─ react-cropper (Cropper.js Reactラッパー) 使用
├─ 1:1固定アスペクト比
├─ 確定 → croppedなFileオブジェクトを返す
└─ キャンセル → 元に戻る
```

**データフロー**: ImagePicker → ImageCropper → `File` オブジェクト → 既存のアップロードフロー（FormData → API）

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

- `children`（+ボタンや「写真を追加」など）をクリック → 画像取得 → ImageCropperを表示 → 確定後に `onPick` 発火
- 各画面の既存UIボタンをそのまま `children` に渡すので、見た目の変更はゼロ
- CropperのモーダルはImagePicker内部で管理
- `isNative()` でCapacitor Camera / file input を分岐

### `src/components/ui/image-cropper.tsx`

モーダル形式のトリミングUI。

```tsx
interface ImageCropperProps {
  imageUrl: string;          // トリミング元の画像URL
  onCrop: (file: File) => void;
  onCancel: () => void;
  aspectRatio?: number;      // デフォルト1（1:1）
}
```

- フルスクリーンモーダル（背景暗転）
- `react-cropper` で画像を表示、ピンチズーム/ドラッグで範囲選択
- 下部に「キャンセル」「決定」ボタン
- 決定 → `canvas.toBlob()` → File化 → `onCrop` 発火
- 出力フォーマット: **WebP (quality 0.85)**
- 最大出力幅: **1200px**（元画像が小さい場合はそのまま）

### `src/lib/camera.ts`

Capacitor Camera のユーティリティ。

```ts
// ネイティブでの画像取得（カメラ撮影 or フォトライブラリ選択） → File変換
export async function pickImageNative(): Promise<File>
```

- `@capacitor/camera` を動的import（Web環境ではロードしない）
- `Camera.getPhoto({ source: CameraSource.Prompt })` で撮影/選択シート表示
- Photo結果（base64/dataUrl）をFileオブジェクトに変換して返す

## 変更対象ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/components/club/club-form.tsx` | file input + handleFileSelect → `ImagePicker` に置換 |
| `src/components/club/club-image-gallery.tsx` | file input + handleFileChange → `ImagePicker` に置換 |
| `src/app/items/new/page.tsx` | file input + handleFileSelect → `ImagePicker` に置換 |
| `src/app/items/[id]/page-client.tsx` | file input + handleImageSelect → `ImagePicker` に置換 |
| `ios/App/App/Info.plist` | `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` 追加 |
| `android/app/src/main/AndroidManifest.xml` | `CAMERA` パーミッション追加 |

## ネイティブ設定

### iOS (`ios/App/App/Info.plist`)

```xml
<key>NSCameraUsageDescription</key>
<string>ギアの写真を撮影するためにカメラを使用します</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>ギアの写真を選択するためにフォトライブラリを使用します</string>
```

### Android (`android/app/src/main/AndroidManifest.xml`)

```xml
<uses-permission android:name="android.permission.CAMERA" />
```

## 依存追加

- `@capacitor/camera` (v8.x) — ネイティブカメラアクセス
- `react-cropper` — Cropper.js のReactラッパー
- `cropperjs` — react-cropperのpeer dependency

## 画像出力仕様

| 項目 | 値 |
|------|-----|
| フォーマット | WebP |
| 品質 | 0.85 |
| アスペクト比 | 1:1（固定） |
| 最大幅 | 1200px |
| 想定サイズ | 100-200KB/枚 |

## エラーハンドリング

- **カメラ権限拒否**: `Camera.getPhoto()` がエラーをthrow → 何もせず静かに閉じる（ユーザーの意図的な操作）
- **ユーザーキャンセル**: カメラUI/フォトライブラリでキャンセルした場合も同様に何もしない
- **画像フォーマット**: cropperがWebP出力するため、既存APIの許可リスト（JPEG/PNG/WebP/GIF）に合致
- **大サイズ画像**: cropper確定時に最大1200px幅にリサイズ + WebP 0.85圧縮で対処

## テスト方針

- **ImageCropper**: `onCrop` が1:1のFileを返すこと、キャンセルで `onCancel` が発火することのユニットテスト
- **camera.ts**: Capacitor Cameraのモック → File変換が正しいことのユニットテスト
- **統合テスト**: 実機でカメラ撮影 → トリミング → アップロード → 画像表示の一連フローを手動確認（iOS/Android/Webブラウザ）
