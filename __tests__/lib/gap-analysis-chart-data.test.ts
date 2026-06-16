import { describe, it, expect } from "vitest";
import {
  getDistanceStaircaseData,
  getWeightFlowData,
} from "@/lib/gap-analysis";
import type { Club } from "@/types/database";

function makeClub(overrides: Partial<Club>): Club {
  return {
    id: "1",
    user_id: "u1",
    category: "iron",
    club_number: "7I",
    maker: null,
    model: null,
    shaft_name: null,
    shaft_flex: null,
    loft: null,
    lie: null,
    length: null,
    distance: null,
    release_year: null,
    memo: null,
    purchase_date: null,
    purchase_shop: null,
    purchase_price: null,
    status: "bag",
    bag_number: 1,
    sort_order: 0,
    weight: null,
    swing_weight: null,
    frequency: null,
    kick_point: null,
    head_volume: null,
    head_weight: null,
    rating: null,
    grip_name: null,
    grip_size: null,
    bounce: null,
    sole_shape: null,
    face_angle: null,
    shaft_weight: null,
    hidden_from_profile: false,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("getDistanceStaircaseData", () => {
  it("returns clubs sorted by sort_order with gap flags", () => {
    const clubs = [
      makeClub({ id: "1", club_number: "7I", distance: 150, sort_order: 4 }),
      makeClub({ id: "2", club_number: "Dr", distance: 230, sort_order: 1, category: "driver" }),
      makeClub({ id: "3", club_number: "PW", distance: 120, sort_order: 5, category: "wedge" }),
      makeClub({ id: "4", club_number: "5W", distance: 200, sort_order: 2, category: "fairway_wood" }),
    ];
    const result = getDistanceStaircaseData(clubs);
    expect(result).toHaveLength(4);
    // Sorted by sort_order (club order in bag)
    expect(result[0].club_number).toBe("Dr");
    expect(result[0].distance).toBe(230);
    expect(result[1].club_number).toBe("5W");
    expect(result[1].distance).toBe(200);
    expect(result[2].club_number).toBe("7I");
    expect(result[3].club_number).toBe("PW");
    // Gap: Dr(230) → 5W(200) = 30 > 20
    expect(result[0].hasGap).toBe(true);
    // Gap: 5W(200) → 7I(150) = 50 > 20
    expect(result[1].hasGap).toBe(true);
    // Gap: 7I(150) → PW(120) = 30 > 20
    expect(result[2].hasGap).toBe(true);
    // Last item
    expect(result[3].hasGap).toBe(false);
  });

  it("includes all clubs, distance null for missing", () => {
    const clubs = [
      makeClub({ id: "1", club_number: "7I", distance: 150, sort_order: 1 }),
      makeClub({ id: "2", club_number: "8I", distance: null, sort_order: 2 }),
    ];
    const result = getDistanceStaircaseData(clubs);
    expect(result).toHaveLength(2);
    expect(result[0].distance).toBe(150);
    expect(result[1].distance).toBeNull();
  });

  it("returns empty array for no clubs", () => {
    expect(getDistanceStaircaseData([])).toEqual([]);
  });
});

describe("getWeightFlowData", () => {
  it("returns clubs with weight sorted by sort_order", () => {
    const clubs = [
      makeClub({ id: "1", club_number: "Dr", weight: 310, sort_order: 1, category: "driver" }),
      makeClub({ id: "2", club_number: "5W", weight: 330, sort_order: 2, category: "fairway_wood" }),
      makeClub({ id: "3", club_number: "7I", weight: 420, sort_order: 3 }),
    ];
    const result = getWeightFlowData(clubs);
    expect(result).toHaveLength(3);
    expect(result[0].club_number).toBe("Dr");
    expect(result[0].weight).toBe(310);
    expect(result[2].club_number).toBe("7I");
    expect(result[2].weight).toBe(420);
    expect(result[0].isFlowCorrect).toBe(true);
    expect(result[1].isFlowCorrect).toBe(true);
    expect(result[2].isFlowCorrect).toBe(true);
  });

  it("flags reversed weight flow", () => {
    const clubs = [
      makeClub({ id: "1", club_number: "Dr", weight: 310, sort_order: 1, category: "driver" }),
      makeClub({ id: "2", club_number: "5W", weight: 300, sort_order: 2, category: "fairway_wood" }),
    ];
    const result = getWeightFlowData(clubs);
    expect(result[1].isFlowCorrect).toBe(false);
  });

  it("includes all clubs, weight null for missing", () => {
    const clubs = [
      makeClub({ id: "1", club_number: "Dr", weight: 310, sort_order: 1, category: "driver" }),
      makeClub({ id: "2", club_number: "5W", weight: null, sort_order: 2, category: "fairway_wood" }),
      makeClub({ id: "3", club_number: "7I", weight: 420, sort_order: 3 }),
    ];
    const result = getWeightFlowData(clubs);
    expect(result).toHaveLength(3);
    expect(result[0].weight).toBe(310);
    expect(result[1].weight).toBeNull();
    expect(result[2].weight).toBe(420);
  });

  it("returns all clubs even with no weight data", () => {
    const clubs = [
      makeClub({ id: "1", club_number: "7I", weight: null, sort_order: 1 }),
    ];
    const result = getWeightFlowData(clubs);
    expect(result).toHaveLength(1);
    expect(result[0].weight).toBeNull();
  });
});
