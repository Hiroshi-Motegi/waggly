# Practice Recording Input UX Improvements

## Summary

Improve the per-club practice recording form (`ClubBallsInput`) with two changes:
1. Replace distance number input with slider + number input
2. Wrap each club's input section in an accordion (initially collapsed)

## Scope

**Files to modify:**
- `src/components/practice/club-balls-input.tsx` — main changes
- `src/app/globals.css` — reuse existing `.club-balls-slider` styles

**No changes to:**
- Category grouping (driver, fairway wood, utility, iron, wedge, putter)
- Condition/memo/tag input (`InlineClubMemo`)
- Ball count slider (already a slider)
- Bag/Reserve toggle
- Data model or API (no schema changes)

## Design

### 1. Distance Slider

Replace the current `<input type="number">` for distance with a slider + number input pair, matching the existing ball count row pattern.

- Range: 0-300 yd, step 5
- Layout: `[range slider] [number input] yd`
- Slider and number input stay in sync
- Reuses existing `.club-balls-slider` CSS class
- Initial value: club's registered distance (`club.distance`) or 0

### 2. Club Accordion

Each club becomes a collapsible accordion row within its category group.

**Collapsed state (default for all clubs):**
```
[番手バッジ]  メーカー モデル名          [chevron ▼]
```

**Expanded state (on tap):**
```
[番手バッジ]  メーカー モデル名          [chevron ▲]
  [distance slider]  [number] yd
  [balls slider]     [number] 球
  ▶ 調子を入力  (existing memo toggle)
```

- Initial state: all clubs collapsed
- Multiple clubs can be open simultaneously
- Chevron icon rotates on open/close (use existing `ChevronDown` from lucide-react)
- Open/close has a simple height transition
- Category headers remain as-is (not collapsible)

### 3. Interaction Details

- Tapping anywhere on the collapsed row opens the accordion
- Data entry is preserved when closing/reopening an accordion
- Clubs with entered data (balls > 0 or distance > 0 or memo) show a subtle indicator when collapsed (e.g. green dot or filled badge)
- Total balls display at bottom remains unchanged

## Non-Goals

- No changes to "総球数のみ" tab
- No changes to session-form.tsx structure
- No new components — changes are contained in club-balls-input.tsx
