"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

const CATEGORY_ORDER = ["driver", "fairway_wood", "utility", "iron", "wedge", "putter"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  driver: "ドライバー",
  fairway_wood: "FW",
  utility: "UT",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};

interface Model {
  id: string;
  name: string;
  category: string;
  slug: string;
  seriesMakerSlug: string;
  seriesNameSlug: string;
}

export function MakerCategoryTabs({ models }: { models: Model[] }) {
  const availableCategories = CATEGORY_ORDER.filter((cat) =>
    models.some((m) => m.category === cat)
  );
  const [active, setActive] = useState(availableCategories[0] ?? "driver");

  const filtered = models.filter((m) => m.category === active);

  return (
    <>
      {/* Category tabs */}
      <div className="flex gap-1 px-3 pt-4 w-full max-w-screen-sm overflow-x-auto scrollbar-hide">
        {availableCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className={`shrink-0 rounded-full px-3 py-2.5 text-sm font-bold whitespace-nowrap transition-colors ${
              active === cat
                ? "bg-[#17552f] border border-white text-white"
                : "text-white"
            }`}
          >
            {CATEGORY_LABELS[cat]} ({models.filter((m) => m.category === cat).length})
          </button>
        ))}
      </div>

      {/* Model list */}
      <div className="w-full max-w-screen-sm px-3 pt-3 pb-4">
        <div className="rounded-lg bg-white overflow-hidden">
          {filtered.map((m, i) => (
            <Link
              key={m.id}
              href={`/catalog/${m.seriesMakerSlug}/${m.seriesNameSlug}/${m.slug}`}
              className={`flex items-center justify-between px-4 py-3 ${i < filtered.length - 1 ? "border-b border-[#ececec]" : ""}`}
            >
              <span className="font-bold text-sm text-[#006728] truncate">{m.name}</span>
              <ChevronLeft className="h-4 w-4 text-[#bbb] rotate-180 shrink-0" />
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="px-4 py-3 text-sm text-[#8b8b8b]">モデルがありません</p>
          )}
        </div>
      </div>
    </>
  );
}
