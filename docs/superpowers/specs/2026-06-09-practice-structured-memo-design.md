# 練習記録ページへの構造化メモ統合

## 概要

練習記録（practice session）の作成・編集・詳細画面に、クラブごとの構造化メモ（condition / tags）をインライン入力できるようにする。既存の `club_memos` テーブルに `practice_session_id` を追加し、練習記録とクラブメモを紐づける。

## データモデル

### マイグレーション（009_practice_memo_link.sql）

```sql
ALTER TABLE club_memos
  ADD COLUMN practice_session_id uuid REFERENCES practice_sessions(id) ON DELETE SET NULL;
CREATE INDEX club_memos_practice_session_id_idx ON club_memos(practice_session_id);
```

- 既存メモ: `practice_session_id = NULL`（クラブ詳細画面から作成されたもの）
- 練習記録から作成されたメモ: `practice_session_id` がセットされる
- 練習セッション削除時はメモを残す（`ON DELETE SET NULL`）

### 型定義の拡張

`PracticeSessionWithClubs` の `practice_clubs` に memo を追加:

```typescript
practice_clubs: {
  club_id: string;
  balls: number;
  avg_distance: number | null;
  club: Club | null;
  memo: ClubMemo | null;  // 新規追加
}[]
```

## UI 設計

### 練習セッション作成/編集フォーム（SessionForm）

- 「番手別球数・飛距離」タブでクラブを追加した際、各クラブの行に折りたたみ式メモエリアを追加
- クラブ行に小さな「メモ」ボタン → タップで condition + tags フォームが展開
- 飛距離は `ClubBallsInput` の `avg_distance` を流用し、メモ側の飛距離フィールドは省略
- メモ入力は任意。未入力ならメモは作成しない
- 「総球数のみ」タブ選択時はクラブ別入力がないため、メモ入力エリアも表示しない
- 保存時にメモ入力済みクラブのみ `club_memos` に `practice_session_id` 付きで INSERT

### 練習セッション詳細画面（[sessionId]/page.tsx）

- クラブ別セクションで、メモがあるクラブには condition emoji + tags を表示
- 「メモを追加」ボタンで `StructuredMemoForm` を展開（メモがないクラブ向け）
- 「編集」リンクで既存メモの編集

### 新コンポーネント: InlineClubMemo

既存の `StructuredMemoForm` から入力部分を抜き出した制御コンポーネント:

- Props: `condition`, `symptomTags`, `feelingTags`, `gearTags`, `memo`, `onChange`
- 保存ボタンなし（親の `SessionForm` が submit 時にまとめて送信）
- condition 選択 + 条件別タグ表示 + メモテキスト
- 既存の `StructuredMemoForm` はクラブ詳細画面用にそのまま維持

## API 設計

### POST /api/practice（作成）・PATCH /api/practice/[sessionId]（更新）

clubs データにメモ情報を追加:

```typescript
clubs: {
  club_id: string;
  balls: number;
  avg_distance?: number | null;
  memo?: {
    condition: MemoCondition;
    symptom_tags: string[];
    feeling_tags: string[];
    gear_tags: string[];
    memo: string | null;
  } | null;
}[]
```

API 側の処理:
1. `practice_sessions` + `practice_clubs` を保存
2. memo がある各クラブについて `club_memos` に INSERT（`practice_session_id` + `club_id` + `distance = avg_distance`）
3. 編集時: 既存メモあれば UPDATE、新規なら INSERT、memo が null に変わったら DELETE
4. 上記をトランザクション内で実行

### GET /api/practice/[sessionId]（取得）

- `practice_session_id` で `club_memos` を JOIN し、各 `practice_club` にメモ情報を含める

## 影響範囲

### 変更するファイル

| ファイル | 変更内容 |
|---|---|
| `supabase/migrations/009_practice_memo_link.sql` | 新規マイグレーション |
| `src/types/database.ts` | `PracticeSessionWithClubs` 型拡張 |
| `src/components/club/inline-club-memo.tsx` | 新規コンポーネント |
| `src/components/practice/club-balls-input.tsx` | メモ展開ボタン + InlineClubMemo 統合 |
| `src/components/practice/session-form.tsx` | クラブごとの memo state 管理、submit データ拡張 |
| `src/app/practice/[sessionId]/page.tsx` | メモ表示 + 追加/編集ボタン |
| `src/app/practice/[sessionId]/edit/page.tsx` | 既存メモの初期データ読み込み |
| `src/app/api/practice/route.ts` | POST にメモ保存ロジック追加 |
| `src/app/api/practice/[sessionId]/route.ts` | GET にメモ JOIN、PATCH にメモ更新ロジック追加 |
| `src/hooks/use-practice.ts` | 型定義更新 |

### 変更しないファイル

- `src/components/club/structured-memo-form.tsx` — クラブ詳細画面用、そのまま維持
- `src/app/bag/[clubId]/memos/` — タイムラインは `club_memos` を参照しているので自動的に練習メモも表示される
- メンテナンス関連 — 変更なし
