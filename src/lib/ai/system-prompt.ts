import type { GapResult } from "@/lib/gap-analysis";

interface ClubSummary {
  club_number: string;
  maker: string | null;
  model: string | null;
  shaft_name: string | null;
  distance: number | null;
  status: string;
}

interface SessionSummary {
  practiced_at: string;
  total_balls: number | null;
  memo: string | null;
  clubs: { club_number: string; balls: number }[];
}

interface PlanSummary {
  title: string;
  status: string;
  created_at: string;
}

interface AccessorySummary {
  category: string;
  brand: string | null;
  model: string | null;
  rating: number | null;
  memo: string | null;
}

interface PromptContext {
  clubs: ClubSummary[];
  recentSessions: SessionSummary[];
  recentPlans: PlanSummary[];
  gapAnalysis: GapResult;
  accessories?: AccessorySummary[];
}

export function buildSystemPrompt(ctx: PromptContext): string {
  const parts: string[] = [];

  parts.push(`あなたはアマチュアゴルファーの練習をサポートするコーチ「Waggly」です。
ユーザーのクラブセットと練習履歴を踏まえて、練習場ですぐ試せる具体的で実践的なアドバイスを提供してください。
プロ向けの高度な理論よりも、アマチュアが理解しやすい言葉で説明してください。
日本語で回答してください。`);

  // Clubs
  if (ctx.clubs.length > 0) {
    parts.push("\n## ユーザーのクラブセット");
    for (const c of ctx.clubs) {
      const name = [c.maker, c.model].filter(Boolean).join(" ") || "不明";
      const dist = c.distance ? `${c.distance}yd` : "飛距離未入力";
      const shaft = c.shaft_name ? ` / ${c.shaft_name}` : "";
      const statusLabel = c.status === "bag" ? "" : c.status === "reserve" ? " [予備]" : " [売却済]";
      parts.push(`- ${c.club_number}: ${name}${shaft} (${dist})${statusLabel}`);
    }
  }

  // Gap analysis
  if (ctx.gapAnalysis.gaps.length > 0 || ctx.gapAnalysis.missingDistance.length > 0) {
    parts.push("\n## ギャップ分析");
    for (const gap of ctx.gapAnalysis.gaps) {
      parts.push(`- ${gap.between[0]} と ${gap.between[1]} の間に ${gap.difference}yd の差があります`);
    }
    if (ctx.gapAnalysis.missingDistance.length > 0) {
      parts.push(`- 飛距離未入力: ${ctx.gapAnalysis.missingDistance.join(", ")}`);
    }
  }

  // Recent sessions
  if (ctx.recentSessions.length > 0) {
    parts.push("\n## 最近の練習記録");
    for (const s of ctx.recentSessions) {
      const clubStr = s.clubs.map((c) => `${c.club_number}: ${c.balls}球`).join(", ");
      parts.push(`- ${s.practiced_at}: ${s.total_balls ?? "?"}球${clubStr ? ` (${clubStr})` : ""}`);
      if (s.memo) parts.push(`  メモ: ${s.memo}`);
    }
  }

  // Recent plans
  if (ctx.recentPlans.length > 0) {
    parts.push("\n## 直近の練習提案");
    for (const p of ctx.recentPlans) {
      parts.push(`- ${p.title} (${p.status === "done" ? "実行済み" : p.status === "skipped" ? "スキップ" : "未実行"}) - ${p.created_at}`);
    }
  }

  // Accessories (consumables)
  if (ctx.accessories && ctx.accessories.length > 0) {
    const categoryLabels: Record<string, string> = {
      ball: "ボール",
      glove: "グローブ",
      tee: "ティー",
      other: "その他",
    };
    parts.push("\n## 使用中のアイテム（消耗品）");
    for (const a of ctx.accessories) {
      const name = [a.brand, a.model].filter(Boolean).join(" ") || "不明";
      const ratingStr = a.rating != null ? ` (評価: ${"★".repeat(a.rating)})` : "";
      const memoStr = a.memo ? ` ${a.memo}` : "";
      const categoryLabel = categoryLabels[a.category] ?? a.category;
      parts.push(`- [${categoryLabel}] ${name}${ratingStr}${memoStr}`);
    }
  }

  return parts.join("\n");
}
