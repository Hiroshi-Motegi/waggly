"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export interface CompareEntry {
  category: string;
  slug: string;
  nameA: string;
  nameB: string;
  timestamp: number;
}

const STORAGE_KEY = "waggly_recent_compares";
const MAX_ENTRIES = 20;

export function saveCompareVisit(entry: Omit<CompareEntry, "timestamp">) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: CompareEntry[] = raw ? JSON.parse(raw) : [];
    // Remove existing same slug
    const filtered = list.filter((e) => !(e.category === entry.category && e.slug === entry.slug));
    filtered.unshift({ ...entry, timestamp: Date.now() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_ENTRIES)));
  } catch {}
}

export function RecentCompares({ category }: { category: string }) {
  const [entries, setEntries] = useState<CompareEntry[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const list: CompareEntry[] = JSON.parse(raw);
        const candidates = list.filter((e) => e.category === category).slice(0, 10);
        const checked = await Promise.all(
          candidates.map(async (e) => {
            try {
              const res = await fetch(`/compare/${e.category}/${e.slug}`, { method: "HEAD" });
              return res.ok ? e : null;
            } catch {
              return e;
            }
          })
        );
        setEntries(checked.filter(Boolean).slice(0, 5) as CompareEntry[]);
      } catch {}
    }
    load();
  }, [category]);

  if (entries.length === 0) return null;

  return (
    <div className="w-full max-w-screen-sm pt-4">
      <h2 className="text-sm font-bold text-white px-1 pb-1">最近の比較</h2>
      <div className="rounded-lg bg-white overflow-hidden">
        {entries.map((e, i) => (
          <Link
            key={e.slug}
            href={`/compare/${e.category}/${e.slug}`}
            className={`flex items-center justify-between px-4 py-3 ${i < entries.length - 1 ? "border-b border-[#ececec]" : ""}`}
          >
            <span className="text-sm text-[#006728] font-bold truncate">
              {e.nameA} vs {e.nameB}
            </span>
            <ChevronLeft className="h-4 w-4 text-[#bbb] rotate-180 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
