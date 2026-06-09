# Accessory Category Expansion

## Summary

Expand accessory categories from 4 to 9 to cover common golf gear beyond consumables.

## Categories

| Label | Key | Status |
|---|---|---|
| ボール | `ball` | existing |
| グローブ | `glove` | existing |
| ティー | `tee` | existing |
| アパレル | `apparel` | new (covers shoes, rainwear, hats, sunglasses) |
| バッグ | `bag` | new |
| 距離計 | `rangefinder` | new |
| グリップ | `grip` | new |
| シャフト | `shaft` | new |
| その他 | `other` | existing |

## Changes

### 1. TypeScript types (`src/types/database.ts`)
- Add `apparel`, `bag`, `rangefinder`, `grip`, `shaft` to `AccessoryCategory` union type

### 2. DB migration (`supabase/migrations/010_accessory_categories.sql`)
- Drop and recreate CHECK constraint on `accessories.category` to include new values

### 3. UI labels and icons
- Add category labels in items pages (`src/app/items/page.tsx`, `src/app/items/new/page.tsx`, `src/app/items/[id]/page.tsx`)
- Add SVG icons for new categories at `public/icons/cat-{key}.svg`

### 4. No changes to
- Accessory fields (brand, model, rating, memo, image_url)
- Status system (active/past)
- API routes
- Data model
