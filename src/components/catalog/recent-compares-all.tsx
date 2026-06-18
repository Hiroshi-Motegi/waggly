"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { CompareEntry } from "./recent-compares";

const STORAGE_KEY = "waggly_recent_compares";

const CATEGORY_LABELS: Record<string, string> = {
  driver: "ドライバー",
  fairway_wood: "FW",
  utility: "UT",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};

export function RecentComparesAll() {
  const [entries, setEntries] = useState<CompareEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const list: CompareEntry[] = JSON.parse(raw);
      setEntries(list.slice(0, 5));
    } catch {}
  }, []);

  if (entries.length === 0) return null;

  return (
    <div className="w-full max-w-screen-sm px-3 pt-4">
      <h2 className="text-sm font-bold text-white px-1 pb-1">最近の比較</h2>
      <div className="rounded-lg bg-white overflow-hidden">
        {entries.map((e, i) => (
          <Link
            key={`${e.category}::${e.slug}`}
            href={`/compare/${e.category}/${e.slug}`}
            className={`flex items-center justify-between px-4 py-3 ${i < entries.length - 1 ? "border-b border-[#ececec]" : ""}`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm text-[#006728] font-bold truncate">
                {e.nameA} vs {e.nameB}
              </span>
              <span className="shrink-0 rounded-full bg-[#e6f2eb] px-2 py-0.5 text-[11px] font-medium text-[#006728]">
                {CATEGORY_LABELS[e.category] ?? e.category}
              </span>
            </div>
            <ChevronLeft className="h-4 w-4 text-[#bbb] rotate-180 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
