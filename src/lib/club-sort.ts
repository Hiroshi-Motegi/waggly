/**
 * Standard golf club sort order:
 * DR(1W) → FW(2W-9W) → UT(2U-7U) → Iron(3I-9I) → Wedge(PW,AW,SW,LW) → Putter
 */

export const categoryOrder: Record<string, number> = {
  driver: 100,
  fairway_wood: 200,
  utility: 300,
  iron: 400,
  wedge: 500,
  putter: 600,
};

export const wedgeOrder: Record<string, number> = {
  PW: 1,
  AW: 2,
  SW: 3,
  LW: 4,
};

export function computeSortOrder(category: string, clubNumber: string): number {
  const base = categoryOrder[category] ?? 900;

  if (category === "wedge" && wedgeOrder[clubNumber]) {
    return base + wedgeOrder[clubNumber];
  }
  if (category === "driver") return base;
  if (category === "putter") return base;

  const num = parseInt(clubNumber, 10);
  return base + (isNaN(num) ? 50 : num);
}
