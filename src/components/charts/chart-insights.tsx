import type { ChartInsight } from "@/lib/gap-analysis";

const iconMap: Record<ChartInsight["type"], string> = {
  gap: "⚠️",
  overlap: "🔄",
  weight_reverse: "⚠️",
  missing: "📝",
};

interface Props {
  insights: ChartInsight[];
}

export function ChartInsights({ insights }: Props) {
  if (insights.length === 0) return null;

  return (
    <div className="mt-2 flex flex-col gap-1">
      {insights.map((insight, i) => (
        <p key={i} className="text-xs text-[#666]">
          {iconMap[insight.type]} {insight.message}
        </p>
      ))}
    </div>
  );
}
