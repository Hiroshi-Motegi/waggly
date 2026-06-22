"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
    const filtered = list.filter((e) => !(e.category === entry.category && e.slug === entry.slug));
    filtered.unshift({ ...entry, timestamp: Date.now() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_ENTRIES)));
  } catch {}
}

function splitName(name: string): { maker: string; model: string } {
  const parts = name.split(" ");
  if (parts.length <= 1) return { maker: "", model: name };
  return { maker: parts[0], model: parts.slice(1).join(" ") };
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
      <h2 className="text-sm font-bold text-white px-1 pb-2">最近の比較</h2>
      <div className="flex flex-col gap-1 px-2">
        {entries.map((e) => {
          const a = splitName(e.nameA);
          const b = splitName(e.nameB);
          return (
            <Link
              key={e.slug}
              href={`/compare/${e.category}/${e.slug}`}
              className="flex items-center gap-1.5 py-1.5 group"
            >
              <div className="flex flex-1 items-center gap-1.5 min-w-0">
                <div className="flex-1 rounded-md bg-white border border-[#e9e9e9] px-3 py-2 min-w-0">
                  <p className="text-[10px] text-[#6b6b6b] leading-tight">{a.maker}</p>
                  <p className="text-xs font-bold text-[#006728] leading-tight truncate">{a.model}</p>
                </div>
                <span className="text-[10px] font-bold text-white shrink-0">VS</span>
                <div className="flex-1 rounded-md bg-white border border-[#e9e9e9] px-3 py-2 min-w-0">
                  <p className="text-[10px] text-[#6b6b6b] leading-tight">{b.maker}</p>
                  <p className="text-xs font-bold text-[#006728] leading-tight truncate">{b.model}</p>
                </div>
              </div>
              <svg className="w-2 h-3 text-white/60 shrink-0 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 8 14"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 1l6 6-6 6" /></svg>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
