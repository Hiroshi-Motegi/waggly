"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
interface SummaryData {
  totalBalls: number;
  avgDistance: number | null;
  memoCount: number;
  practiceCount?: number;
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
    <div className="rounded-lg bg-white overflow-hidden">
      {/* 2x2 grid with border dividers */}
      <div className="grid grid-cols-2">
        <div className="flex items-center p-3 border-b border-[#dfdfdf]">
          <span className="flex-1 text-sm text-[#9c9c9c]">平均飛距離</span>
          <span className="text-[#006728] font-bold"><span className="text-base">{data.avgDistance ?? "—"}</span><span className="text-sm">yd</span></span>
        </div>
        <div className="flex items-center p-3 border-b border-l border-[#dfdfdf]">
          <span className="flex-1 text-sm text-[#9c9c9c]">練習回数</span>
          <span className="text-[#006728] font-bold"><span className="text-base">{data.practiceCount ?? 0}</span><span className="text-sm">回</span></span>
        </div>
        <div className="flex items-center p-3">
          <span className="flex-1 text-sm text-[#9c9c9c]">メモ</span>
          <span className="text-[#006728] font-bold"><span className="text-base">{data.memoCount}</span><span className="text-sm">件</span></span>
        </div>
        <div className="flex items-center p-3 border-l border-[#dfdfdf]">
          <span className="flex-1 text-sm text-[#9c9c9c]">打数</span>
          <span className="text-[#006728] font-bold"><span className="text-base">{data.totalBalls}</span><span className="text-sm">球</span></span>
        </div>
      </div>

      {/* Tags row */}
      {data.topTags.length > 0 && (
        <div className="flex flex-wrap gap-2.5 p-3 border-t border-[#dfdfdf]">
          {data.topTags.map(({ tag, count }) => (
            <span key={tag} className="rounded-full bg-[#f0f0f0] p-1.5 text-xs font-medium text-black">
              {tag} x {count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
