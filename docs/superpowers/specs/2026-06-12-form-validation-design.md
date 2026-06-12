# フォームバリデーション設計

## 概要

クラブ追加/編集・アイテム追加/編集フォームにバリデーションを追加する。現状は必須フィールドが未入力でもサイレントにブロックされ、ユーザーがなぜ保存できないかわからない。

## 方針

- 共通バリデーションユーティリティ (`src/lib/form-validation.ts`) を作り、クラブ・アイテム両方で使う
- バリデーションルールは宣言的に定義する
- エラー表示は `useFormValidation` フックで状態管理
- 保存ボタンは常に有効（押したときに初めてエラー表示）

## バリデーション種別とタイミング

| 種別 | タイミング | 例 |
|---|---|---|
| 必須チェック | 保存時 → 以降リアルタイム | カテゴリ未選択 |
| 数値範囲 | リアルタイム（onChange） | ロフト 0〜90、価格 ≥ 0 |
| 文字数上限 | リアルタイム（onChange） | メーカー名 50文字以内 |
| URL形式 | 保存時 → 以降リアルタイム | 購入URL |

### 動作フロー

1. 初回表示時はエラーなし
2. 数値範囲・文字数はリアルタイムで即エラー表示（onChange）
3. 必須・URL形式は保存ボタン押下時にまとめてチェック
4. 保存押下後は、必須・URL形式もリアルタイムで解消表示
5. 保存押下時に最初のエラーフィールドまでスクロール

## 共通ユーティリティ: `src/lib/form-validation.ts`

### ルール定義

```typescript
type ValidationRule = {
  required?: string;             // エラーメッセージ（truthy で必須）
  maxLength?: { value: number; message: string };
  range?: { min: number; max: number; message: string };
  pattern?: { value: RegExp; message: string };
};

type ValidationSchema<T> = Partial<Record<keyof T, ValidationRule>>;
```

### バリデーション関数

```typescript
// 単一フィールドのバリデーション
function validateField(value: any, rule: ValidationRule): string | null;

// フォーム全体のバリデーション（保存時に使用）
function validateForm<T>(form: T, schema: ValidationSchema<T>): Record<string, string>;
```

## フック: `src/hooks/use-form-validation.ts`

```typescript
function useFormValidation<T>(schema: ValidationSchema<T>) {
  // 状態
  // - errors: Record<string, string>   各フィールドのエラーメッセージ
  // - submitted: boolean               保存を試みたか（必須チェック開始のフラグ）
  
  // 関数
  // - validateOnChange(field, value)    リアルタイムバリデーション
  //     数値範囲・文字数は常にチェック
  //     必須・URL形式は submitted=true の場合のみチェック
  // - validateOnSubmit(form)            保存時バリデーション → boolean
  //     submitted=true に設定、全フィールドチェック
  //     エラーがあれば最初のエラーフィールドにスクロール
  // - clearError(field)                 特定フィールドのエラークリア
  // - fieldProps(field)                 エラー状態の className 等を返すヘルパー
}
```

## エラー表示コンポーネント: `src/components/ui/field-error.tsx`

```tsx
function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="text-red-500 text-xs mt-1">{message}</p>;
}
```

フィールドのエラー時スタイル:
- 入力欄: `border-red-400` を追加
- エラー文言: `text-red-500 text-xs mt-1`

## クラブのバリデーションルール

| フィールド | ルール | エラーメッセージ |
|---|---|---|
| category | 必須 | カテゴリを選択してください |
| club_number | 必須 | 番手を選択してください |
| maker | 最大50文字 | 50文字以内で入力してください |
| model | 最大50文字 | 50文字以内で入力してください |
| shaft_name | 最大50文字 | 50文字以内で入力してください |
| loft | 0〜90 | 0〜90の範囲で入力してください |
| lie | 0〜90 | 0〜90の範囲で入力してください |
| length | 0〜60 | 0〜60の範囲で入力してください |
| distance | 0〜400 | 0〜400の範囲で入力してください |
| weight | 0〜1000 | 0〜1000の範囲で入力してください |
| swing_weight | 最大10文字 | 10文字以内で入力してください |
| frequency | 0〜500 | 0〜500の範囲で入力してください |
| kick_point | 最大20文字 | 20文字以内で入力してください |
| head_volume | 0〜600 | 0〜600の範囲で入力してください |
| head_weight | 0〜400 | 0〜400の範囲で入力してください |
| release_year | 1950〜現在+1年 | 1950〜{currentYear+1}の範囲で入力してください |
| purchase_price | 0以上 | 0以上の値を入力してください |
| purchase_shop | 最大100文字 | 100文字以内で入力してください |
| rating | 1〜5 | — (UIで制御されるため不要) |

## アイテムのバリデーションルール

| フィールド | ルール | エラーメッセージ |
|---|---|---|
| category | 必須 | カテゴリを選択してください |
| brand | 最大50文字 | 50文字以内で入力してください |
| model | 最大50文字 | 50文字以内で入力してください |
| memo | 最大500文字 | 500文字以内で入力してください |
| purchase_url | URL形式 | 有効なURLを入力してください |
| rating | 1〜5 | — (UIで制御されるため不要) |

## 対象ファイル

### 新規作成
- `src/lib/form-validation.ts` — バリデーションルール定義 + バリデーション関数
- `src/hooks/use-form-validation.ts` — React フック
- `src/components/ui/field-error.tsx` — エラー表示コンポーネント

### 既存修正
- `src/components/club/club-form.tsx` — クラブフォームにバリデーション統合
- `src/app/items/new/page.tsx` — アイテム新規作成にバリデーション統合
- `src/app/items/[id]/page-client.tsx` — アイテム編集にバリデーション統合

## HTML属性との併用

数値入力フィールドには `min`/`max` HTML属性も設定する（ブラウザネイティブ制御）。ただしJS側のバリデーションが主で、HTML属性は補助。

## テスト

- `__tests__/lib/form-validation.test.ts` — バリデーション関数のユニットテスト
  - 必須チェック: 空文字/null/undefined → エラー、値あり → null
  - 数値範囲: 範囲内 → null、範囲外 → エラー、非数値 → null（空欄は許容）
  - 文字数: 範囲内 → null、超過 → エラー
  - URL形式: 有効URL → null、無効 → エラー、空欄 → null
  - フォーム全体: 複数エラー同時検出
