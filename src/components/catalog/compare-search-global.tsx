"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

interface ModelOption {
  slug: string;
  category: string;
  label: string;
  makerSlug: string;
}

interface Props {
  models: ModelOption[];
}

export function CompareSearchGlobal({ models }: Props) {
  const router = useRouter();
  const [queryA, setQueryA] = useState("");
  const [queryB, setQueryB] = useState("");
  const [selectedA, setSelectedA] = useState<ModelOption | null>(null);
  const [selectedB, setSelectedB] = useState<ModelOption | null>(null);
  const [focusA, setFocusA] = useState(false);
  const [focusB, setFocusB] = useState(false);

  // Fuzzy AND search: "PING アイアン" → both "ping" AND "アイアン" must match
  function fuzzyMatch(label: string, query: string) {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return false;
    const lower = label.toLowerCase();
    return tokens.every((t) => lower.includes(t));
  }

  function searchLabel(m: ModelOption) {
    return `${m.label} ${m.makerSlug.replace(/-/g, " ")}`;
  }

  const filteredA = useMemo(() => {
    if (!queryA || queryA.length < 2) return [];
    return models.filter((m) => fuzzyMatch(searchLabel(m), queryA)).slice(0, 30);
  }, [queryA, models]);

  const filteredB = useMemo(() => {
    if (!queryB || queryB.length < 2) return [];
    return models
      .filter((m) => m.slug !== selectedA?.slug)
      .filter((m) => selectedA ? m.category === selectedA.category : true)
      .filter((m) => fuzzyMatch(searchLabel(m), queryB))
      .slice(0, 30);
  }, [queryB, models, selectedA]);

  const canCompare =
    selectedA && selectedB &&
    selectedA.slug !== selectedB.slug &&
    selectedA.category === selectedB.category;

  function handleCompare() {
    if (!canCompare) return;
    const [slugA, slugB] = [selectedA.slug, selectedB.slug].sort();
    router.push(`/compare/${selectedA.category}/${slugA}-vs-${slugB}`);
  }

  return (
    <div className="rounded-md bg-white p-4">
      <div className="flex flex-col gap-3">
        {/* Model A */}
        <div className="relative">
          <label className="text-xs text-[#888] font-bold mb-1 block">モデルA</label>
          <input
            type="text"
            value={selectedA ? selectedA.label : queryA}
            onChange={(e) => {
              setQueryA(e.target.value);
              setSelectedA(null);
            }}
            onFocus={() => setFocusA(true)}
            onBlur={() => setTimeout(() => setFocusA(false), 150)}
            placeholder="メーカー名・モデル名で検索（2文字以上）"
            className="w-full rounded-md border border-[#ddd] px-3 py-2.5 text-sm text-[#222] placeholder-[#aaa] focus:border-[#006728] focus:outline-none"
          />
          {focusA && !selectedA && filteredA.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-[#ddd] bg-white shadow-lg">
              {filteredA.map((m) => (
                <li key={`${m.category}::${m.slug}`}>
                  <button
                    type="button"
                    onMouseDown={() => {
                      setSelectedA(m);
                      setQueryA("");
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-[#222] hover:bg-[#e6f2eb]"
                  >
                    {m.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-center text-sm font-bold text-[#006728]">VS</p>

        {/* Model B */}
        <div className="relative">
          <label className="text-xs text-[#888] font-bold mb-1 block">
            モデルB
            {selectedA && <span className="text-[#006728] ml-1">（同カテゴリのみ）</span>}
          </label>
          <input
            type="text"
            value={selectedB ? selectedB.label : queryB}
            onChange={(e) => {
              setQueryB(e.target.value);
              setSelectedB(null);
            }}
            onFocus={() => setFocusB(true)}
            onBlur={() => setTimeout(() => setFocusB(false), 150)}
            placeholder="メーカー名・モデル名で検索（2文字以上）"
            className="w-full rounded-md border border-[#ddd] px-3 py-2.5 text-sm text-[#222] placeholder-[#aaa] focus:border-[#006728] focus:outline-none"
          />
          {focusB && !selectedB && filteredB.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-[#ddd] bg-white shadow-lg">
              {filteredB.map((m) => (
                <li key={`${m.category}::${m.slug}`}>
                  <button
                    type="button"
                    onMouseDown={() => {
                      setSelectedB(m);
                      setQueryB("");
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-[#222] hover:bg-[#e6f2eb]"
                  >
                    {m.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Compare button */}
        <button
          onClick={handleCompare}
          disabled={!canCompare}
          className={`w-full rounded-full py-3 text-sm font-bold transition-colors ${
            canCompare
              ? "bg-[#006728] text-white"
              : "bg-[#ccc] text-white cursor-not-allowed"
          }`}
        >
          比較する
        </button>
      </div>
    </div>
  );
}
