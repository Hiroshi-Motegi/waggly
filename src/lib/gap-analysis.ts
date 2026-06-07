import type { Club } from "@/types/database";

const GAP_THRESHOLD_YD = 20;

export interface Gap {
  between: [string, string];
  difference: number;
}

export interface GapResult {
  gaps: Gap[];
  missingDistance: string[];
}

export function analyzeGaps(clubs: Club[]): GapResult {
  const sorted = [...clubs].sort((a, b) => a.sort_order - b.sort_order);

  const missingDistance = sorted
    .filter((c) => c.distance == null)
    .map((c) => c.club_number);

  const withDistance = sorted.filter((c) => c.distance != null);

  // Sort by distance descending (longest first)
  withDistance.sort((a, b) => b.distance! - a.distance!);

  const gaps: Gap[] = [];

  for (let i = 0; i < withDistance.length - 1; i++) {
    const diff = withDistance[i].distance! - withDistance[i + 1].distance!;
    if (diff > GAP_THRESHOLD_YD) {
      gaps.push({
        between: [withDistance[i].club_number, withDistance[i + 1].club_number],
        difference: diff,
      });
    }
  }

  return { gaps, missingDistance };
}
