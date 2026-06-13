"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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
  const [isOpen, setIsOpen] = useState(false);

  if (insights.length === 0) return null;

  return (
    <div className="mt-2 border-t border-[#dfdfdf]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-2.5 text-base text-[#006728] font-bold"
      >
        <span>分析コメント（{insights.length}件）</span>
        {isOpen ? <ChevronUp className="h-4 w-4 text-[#8b8b8b]" /> : <ChevronDown className="h-4 w-4 text-[#8b8b8b]" />}
      </button>
      {isOpen && (
        <div className="flex flex-col gap-1.5 pb-2.5">
          {insights.map((insight, i) => (
            <p key={i} className="text-base text-[#333]">
              {iconMap[insight.type]} {insight.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
