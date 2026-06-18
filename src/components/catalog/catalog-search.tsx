"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

interface ModelOption {
  name: string;
  category: string;
  makerSlug: string;
  slug: string;
  maker: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  driver: "ドライバー",
  fairway_wood: "FW",
  utility: "UT",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};

export function CatalogSearch({ models }: { models: ModelOption[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState(false);

  function fuzzyMatch(label: string, q: string) {
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return false;
    const lower = label.toLowerCase();
    return tokens.every((t) => lower.includes(t));
  }

  const filtered = useMemo(() => {
    if (!query || query.length < 2) return [];
    return models
      .filter((m) => fuzzyMatch(`${m.maker} ${m.name}`, query))
      .slice(0, 10);
  }, [query, models]);

  function handleSubmit() {
    if (query.length >= 2) {
      router.push(`/catalog/search?q=${encodeURIComponent(query)}`);
    }
  }

  return (
    <div className="relative w-full max-w-screen-sm px-3">
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocus(true)}
            onBlur={() => setTimeout(() => setFocus(false), 150)}
            placeholder="モデル名で検索（2文字以上）"
            className="w-full rounded-lg bg-white pl-10 pr-4 py-3.5 text-sm text-[#222] placeholder-[#aaa] focus:outline-none focus:ring-1 focus:ring-[#006728]"
          />
        </div>
      </form>
      {focus && filtered.length > 0 && (
        <div className="absolute z-10 left-3 right-3 mt-1 max-h-64 overflow-y-auto rounded-lg border border-[#ddd] bg-white shadow-lg">
          {filtered.map((m) => (
            <button
              key={`${m.makerSlug}/${m.slug}`}
              type="button"
              onMouseDown={() => {
                router.push(`/catalog/${m.makerSlug}/${m.slug}`);
                setQuery("");
              }}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-[#e6f2eb] border-b border-[#ececec] last:border-0"
            >
              <span className="font-bold text-[#006728]">{m.name}</span>
              <span className="ml-2 text-xs text-[#888]">
                {m.maker} · {CATEGORY_LABELS[m.category] ?? m.category}
              </span>
            </button>
          ))}
          <button
            type="button"
            onMouseDown={handleSubmit}
            className="w-full text-center px-3 py-2.5 text-sm font-bold text-[#006728] hover:bg-[#e6f2eb]"
          >
            「{query}」で検索 →
          </button>
        </div>
      )}
    </div>
  );
}
