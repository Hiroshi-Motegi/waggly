# ギャラリー/リストビュー切り替え設計

## 概要

アイテム (`/items`) とマイバッグ (`/bag`) ページに、ギャラリービューとリストビューの切り替え機能を追加する。現在はリストビューのみ。

Figma: https://www.figma.com/design/thCsjskQb7stnOqr2uglTZ/waggly?node-id=67-7067

## 決定事項

- デフォルトはリストビュー（現状維持）
- マイバッグの並替モード時はギャラリーでも自動でリストに切り替え、完了/キャンセル後に元のビューに戻る

## ビュー切り替えトグル

### デザイン

ヘッダー右側、「追加」ボタンの左にピル型トグルを配置。

- 白背景 (`bg-white`) の丸い枠 (`rounded-full`) 内にリストアイコンとグリッドアイコン
- アクティブ側: グリーン背景 (`#006728`) + 白アイコン、`rounded-full`
- 非アクティブ側: 白背景 + ダークアイコン
- アイコンサイズ: 28x28px

### 共通コンポーネント

`src/components/ui/view-mode-toggle.tsx` に `ViewModeToggle` を作成:

```tsx
type ViewMode = "list" | "gallery"
interface ViewModeToggleProps {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}
```

リストアイコンには `List` (lucide)、グリッドアイコンには `LayoutGrid` (lucide) を使用。

### 状態管理

練習記録ページの既存パターンを踏襲:

- `useState` + `localStorage` で永続化
- SSR セーフな初期化 (`typeof window !== "undefined"`)

| ページ | localStorage キー | デフォルト |
|--------|-------------------|------------|
| アイテム (`/items`) | `items-view-mode` | `list` |
| マイバッグ (`/bag`) | `bag-view-mode` | `list` |

## ギャラリービューのレイアウト

2カラムグリッド、gap 12px (`grid grid-cols-2 gap-3`)。

### アクセサリカード (アイテムページ)

各カードは `Link` でラップし、詳細ページへ遷移:

- 画像サムネイル: 高さ 132px、`rounded-md`、`object-cover`
  - 画像なし: カテゴリアイコンを中央配置 (現在のリストビューと同じアイコン)
- カテゴリ名: グレー (`text-muted-foreground`)、12px
- ブランド + モデル名: Bold、14px
- 星評価: 既存の星コンポーネントを再利用 (12px サイズ)
- アーカイブバッジ: カード左上にオーバーレイ表示

### クラブカード (マイバッグページ)

各カードは `Link` でラップし、詳細ページへ遷移:

- 画像サムネイル: 高さ 132px、`rounded-md`、`object-cover`
  - 画像なし: カテゴリアイコンを中央配置
  - プライマリ画像 (`is_primary`) を使用
- クラブ番号バッジ (緑背景 `#005c24`、白文字、`rounded-md`) + モデル名: Bold、14px
- メーカー名: グレー (`text-muted-foreground`)、12px
- 最新飛距離: 表示する場合は `XXX yd` をメーカー名の右に

## マイバッグ特有の挙動

### チャートセクション

飛距離階段/重量フロー チャートはビューモードに関係なく、クラブリストの下にそのまま表示。

### 並替モード

1. ギャラリービュー中に「並替」ボタンを押す → 自動でリストビューに切り替え
2. 並替完了 (保存) またはキャンセル → 元のビューモード (ギャラリー) に復帰
3. 実装: `isReordering` 状態が true の間は `viewMode` に関わらずリスト表示を強制

### クラブ本数表示

"X / 14本" はどちらのビューでもタブ行の右端に表示（変更なし）。

## リストビュー

既存のレイアウトをそのまま維持。変更なし。

## 変更対象ファイル

1. `src/components/ui/view-mode-toggle.tsx` — 新規: 共通トグルコンポーネント
2. `src/app/items/page.tsx` — トグル追加 + ギャラリービュー条件分岐
3. `src/app/bag/page.tsx` — トグル追加 + ギャラリービュー条件分岐 + 並替連動
