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

// --- Chart data types ---

export interface DistanceStaircaseItem {
  club_number: string;
  distance: number | null;
  hasGap: boolean;
}

export interface WeightFlowItem {
  club_number: string;
  weight: number | null;
  isFlowCorrect: boolean;
}

// --- Chart data functions ---

export function getDistanceStaircaseData(clubs: (Club & { latest_avg_distance?: number | null })[]): DistanceStaircaseItem[] {
  const getDistance = (c: Club & { latest_avg_distance?: number | null }) => c.latest_avg_distance ?? c.distance;
  const sorted = [...clubs].sort((a, b) => a.sort_order - b.sort_order);

  return sorted.map((club, i) => {
    const dist = getDistance(club);
    const next = sorted.slice(i + 1).find((c) => getDistance(c) != null);
    const hasGap = dist != null && next != null && dist - getDistance(next)! > GAP_THRESHOLD_YD;
    return {
      club_number: club.club_number,
      distance: dist,
      hasGap,
    };
  });
}

// --- Chart insights (ルールベースの事実指摘) ---

export interface ChartInsight {
  type: "gap" | "overlap" | "weight_reverse" | "missing";
  message: string;
}

const OVERLAP_THRESHOLD_YD = 5;

export function getDistanceInsights(data: DistanceStaircaseItem[]): ChartInsight[] {
  const insights: ChartInsight[] = [];
  const withDist = data.filter((d) => d.distance != null);

  for (let i = 0; i < withDist.length - 1; i++) {
    const curr = withDist[i];
    const next = withDist[i + 1];
    const diff = curr.distance! - next.distance!;

    if (diff > GAP_THRESHOLD_YD) {
      insights.push({
        type: "gap",
        message: `${curr.club_number}と${next.club_number}の間に${diff}ydのギャップがあります`,
      });
    } else if (diff < OVERLAP_THRESHOLD_YD) {
      insights.push({
        type: "overlap",
        message: `${curr.club_number}と${next.club_number}の飛距離が近く（差${diff}yd）、被っています`,
      });
    }
  }

  const missing = data.filter((d) => d.distance == null);
  if (missing.length > 0 && missing.length <= 3) {
    insights.push({
      type: "missing",
      message: `${missing.map((m) => m.club_number).join("・")}の飛距離が未入力です`,
    });
  }

  return insights;
}

export function getWeightInsights(data: WeightFlowItem[]): ChartInsight[] {
  const insights: ChartInsight[] = [];
  const withWeight = data.filter((d) => d.weight != null);

  for (let i = 1; i < withWeight.length; i++) {
    if (!withWeight[i].isFlowCorrect) {
      insights.push({
        type: "weight_reverse",
        message: `${withWeight[i].club_number}(${withWeight[i].weight}g)が${withWeight[i - 1].club_number}(${withWeight[i - 1].weight}g)より軽く、重量フローが逆転しています`,
      });
    }
  }

  return insights;
}

export function getWeightFlowData(clubs: Club[]): WeightFlowItem[] {
  const sorted = [...clubs].sort((a, b) => a.sort_order - b.sort_order);

  let lastWeight: number | null = null;
  return sorted.map((club) => {
    const isFlowCorrect = club.weight == null || lastWeight == null || club.weight >= lastWeight;
    if (club.weight != null) lastWeight = club.weight;
    return {
      club_number: club.club_number,
      weight: club.weight,
      isFlowCorrect,
    };
  });
}
