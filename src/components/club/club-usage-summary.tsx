"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
interface SummaryData {
  totalBalls: number;
  avgDistance: number | null;
  memoCount: number;
  topTags: { tag: string; count: number }[];
}

interface Props {
  clubId: string;
}

export function ClubUsageSummary({ clubId }: Props) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      const res = await apiFetch(`/api/clubs/${clubId}/summary`);
      if (res.ok) setData(await res.json());
      setIsLoading(false);
    }
    fetchSummary();
  }, [clubId]);

  if (isLoading) return (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="h-6 w-10 rounded bg-gray-200" />
            <div className="h-3 w-14 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
  if (!data || (data.totalBalls === 0 && data.memoCount === 0)) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-bold text-[#006728]">{data.totalBalls}</p>
          <p className="text-xs text-[#8b8b8b]">球（3ヶ月）</p>
        </div>
        <div>
          <p className="text-lg font-bold text-[#006728]">{data.avgDistance ?? "—"}</p>
          <p className="text-xs text-[#8b8b8b]">平均飛距離(yd)</p>
        </div>
        <div>
          <p className="text-lg font-bold text-[#006728]">{data.memoCount}</p>
          <p className="text-xs text-[#8b8b8b]">メモ数</p>
        </div>
      </div>

      {data.topTags.length > 0 && (
        <div>
          <p className="text-sm font-bold mb-1">よく出るキーワード</p>
          <div className="flex flex-wrap gap-1.5">
            {data.topTags.map(({ tag, count }) => (
              <span key={tag} className="rounded-full bg-[#f0f0f0] px-2.5 py-0.5 text-sm text-[#333]">
                {tag} ×{count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
