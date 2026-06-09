export interface TagCategory {
  label: string;
  tags: string[];
}

export const SYMPTOM_TAGS: TagCategory[] = [
  { label: "球筋", tags: ["右に出る", "左に出る", "スライス", "フック", "バラつく"] },
  { label: "弾道", tags: ["高すぎ", "低すぎ", "吹き上がる", "ドロップ"] },
  { label: "ミス", tags: ["トップ", "ダフリ", "シャンク", "テンプラ", "飛距離不足"] },
];

export const FEELING_TAGS = [
  "力んだ", "芯に当たらない", "リズム悪い", "疲れ", "振り切れない", "手打ち感",
];

export const GEAR_TAGS = [
  "硬い", "柔い", "重い", "軽い", "グリップ滑る", "構えにくい",
];

export const GOOD_TAGS = [
  "距離感", "方向性", "打感", "高さ", "安定性", "スピン",
];

export function getTagsByCondition(condition: "good" | "normal" | "bad"): {
  symptomTags?: TagCategory[];
  feelingTags?: string[];
  gearTags?: string[];
  goodTags?: string[];
} {
  if (condition === "good") {
    return { goodTags: GOOD_TAGS };
  }
  if (condition === "bad") {
    return { symptomTags: SYMPTOM_TAGS, feelingTags: FEELING_TAGS, gearTags: GEAR_TAGS };
  }
  return { symptomTags: SYMPTOM_TAGS, feelingTags: FEELING_TAGS, gearTags: GEAR_TAGS, goodTags: GOOD_TAGS };
}
