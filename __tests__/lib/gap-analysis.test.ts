import { describe, it, expect } from "vitest";
import { analyzeGaps, type GapResult } from "@/lib/gap-analysis";
import type { Club } from "@/types/database";

function makeClub(overrides: Partial<Club>): Club {
  return {
    id: "1", user_id: "u1", category: "iron", club_number: "7I",
    maker: null, model: null, shaft_name: null, shaft_flex: null,
    loft: null, lie: null, length: null, distance: null,
    purchase_date: null, purchase_shop: null, purchase_price: null,
    status: "bag", sort_order: 0, created_at: "2026-01-01",
    release_year: null, memo: null, bag_number: 1,
    weight: null, swing_weight: null, frequency: null,
    kick_point: null, head_volume: null, head_weight: null,
    ...overrides,
  };
}

describe("analyzeGaps", () => {
  it("detects gap when distance difference exceeds 20yd", () => {
    const clubs = [
      makeClub({ id: "1", club_number: "5I", distance: 180, sort_order: 0 }),
      makeClub({ id: "2", club_number: "7I", distance: 150, sort_order: 1 }),
    ];

    const result = analyzeGaps(clubs);

    expect(result.gaps).toHaveLength(1);
    expect(result.gaps[0].between).toEqual(["5I", "7I"]);
    expect(result.gaps[0].difference).toBe(30);
  });

  it("returns no gaps when differences are within 20yd", () => {
    const clubs = [
      makeClub({ id: "1", club_number: "7I", distance: 150, sort_order: 0 }),
      makeClub({ id: "2", club_number: "8I", distance: 140, sort_order: 1 }),
    ];

    const result = analyzeGaps(clubs);
    expect(result.gaps).toHaveLength(0);
  });

  it("lists clubs missing distance data", () => {
    const clubs = [
      makeClub({ id: "1", club_number: "7I", distance: 150, sort_order: 0 }),
      makeClub({ id: "2", club_number: "8I", distance: null, sort_order: 1 }),
    ];

    const result = analyzeGaps(clubs);
    expect(result.missingDistance).toEqual(["8I"]);
  });

  it("skips clubs without distance in gap calculation", () => {
    const clubs = [
      makeClub({ id: "1", club_number: "5I", distance: 180, sort_order: 0 }),
      makeClub({ id: "2", club_number: "6I", distance: null, sort_order: 1 }),
      makeClub({ id: "3", club_number: "7I", distance: 150, sort_order: 2 }),
    ];

    const result = analyzeGaps(clubs);
    expect(result.gaps).toHaveLength(1);
    expect(result.gaps[0].between).toEqual(["5I", "7I"]);
  });
});
