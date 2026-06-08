"use client";

import { useEffect, useState } from "react";
import type { MemoCondition, ClubMemo } from "@/types/database";

interface SummaryData {
  totalBalls: number;
  avgDistance: number | null;
  memoCount: number;
  conditionCounts: Record<MemoCondition, number>;
  topTags: { tag: string; count: number }[];
  recentMemos: ClubMemo[];
}

const conditionEmoji: Record<MemoCondition, string> = {
  good: "😊",
  normal: "😐",
  bad: "😣",
};

interface Props {
  clubId: string;
}

export function ClubUsageSummary({ clubId }: Props) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      const res = await fetch(`/api/clubs/${clubId}/summary`);
      if (res.ok) setData(await res.json());
      setIsLoading(false);
    }
    fetchSummary();
  }, [clubId]);

  if (isLoading) return <div className="py-4 text-center text-xs text-[#8b8b8b]">読み込み中...</div>;
  if (!data || (data.totalBalls === 0 && data.memoCount === 0)) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-bold text-[#006728]">{data.totalBalls}</p>
          <p className="text-[10px] text-[#8b8b8b]">球（3ヶ月）</p>
        </div>
        <div>
          <p className="text-lg font-bold text-[#006728]">{data.avgDistance ?? "—"}</p>
          <p className="text-[10px] text-[#8b8b8b]">平均飛距離(yd)</p>
        </div>
        <div>
          <p className="text-lg font-bold text-[#006728]">{data.memoCount}</p>
          <p className="text-[10px] text-[#8b8b8b]">メモ数</p>
        </div>
      </div>

      {data.topTags.length > 0 && (
        <div>
          <p className="text-xs font-bold mb-1">よく出るキーワード</p>
          <div className="flex flex-wrap gap-1.5">
            {data.topTags.map(({ tag, count }) => (
              <span key={tag} className="rounded-full bg-[#f0f0f0] px-2.5 py-0.5 text-xs text-[#333]">
                {tag} ×{count}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.recentMemos.length > 0 && (
        <div>
          <p className="text-xs font-bold mb-1">直近のメモ</p>
          <div className="flex flex-col gap-1.5">
            {data.recentMemos.slice(0, 3).map((m) => (
              <div
                key={m.id}
                className={`rounded-lg pl-2.5 py-1.5 text-xs ${
                  m.condition === "bad" ? "border-l-2 border-l-[#e74c3c]"
                    : m.condition === "good" ? "border-l-2 border-l-[#27ae60]"
                    : "border-l-2 border-l-[#f39c12]"
                }`}
              >
                <div className="flex items-center gap-1">
                  <span>{m.condition ? conditionEmoji[m.condition] : ""}</span>
                  <span className="text-[#8b8b8b]">
                    {new Date(m.created_at).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                  </span>
                </div>
                {[...(m.symptom_tags ?? []), ...(m.feeling_tags ?? []), ...(m.gear_tags ?? [])].length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {[...(m.symptom_tags ?? []), ...(m.feeling_tags ?? []), ...(m.gear_tags ?? [])].map((tag) => (
                      <span key={tag} className="rounded-full bg-[#f0f0f0] px-2 py-0.5 text-[10px]">{tag}</span>
                    ))}
                  </div>
                )}
                {m.memo && <p className="text-[#666] mt-0.5">{m.memo}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
