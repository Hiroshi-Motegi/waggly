@AGENTS.md

# TypeScript型安全性ルール

- Supabaseの`.map()`コールバックに型注釈を書かない。TypeScriptの推論に任せる（`(c) => ...` ◎ / `(c: any) => ...` ✗）
- `.insert()` / `.update()` には `Database["public"]["Tables"]["テーブル名"]["Insert"]` / `["Update"]` 型を使い、`as any` を避ける
- `request.json()` の結果は必ずZodでパースしてから使う
- DBマイグレーションでカラムやFK追加時は `src/types/supabase.ts` の型定義も更新する（Row/Insert/Update/Relationships）

# テーブル命名規約

- 新規テーブルはドメインプレフィックス + 名詞複数形: `user_clubs`, `catalog_models`
- 子テーブルは親名プレフィックス: `club_images`, `club_memos`
- 既存テーブル（`clubs`, `profiles` 等）はリネームしない（FK/RLS/コード影響大）
