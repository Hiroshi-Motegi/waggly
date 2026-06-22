"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { AlpenAdImage } from "@/components/catalog/alpen-ad-image";
import { useAuth } from "@/hooks/use-auth";

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
  makerSlug: string;
  image_url: string | null;
  alpen_pid: string | null;
}

export function MakerCategoryTabs({ models }: { models: Model[] }) {
  const { user } = useAuth();
  const mx = user ? "-mx-2" : "-mx-3";
  const mxWidth = user ? "calc(100% + 1rem)" : "calc(100% + 1.5rem)";
  const mt = user ? "mt-0" : "-mt-3";
  const availableCategories = CATEGORY_ORDER.filter((cat) =>
    models.some((m) => m.category === cat)
  );
  const [active, setActive] = useState(availableCategories[0] ?? "driver");

  const filtered = models.filter((m) => m.category === active);

  return (
    <>
      {/* Category tabs */}
      <div className={`${mx} ${mt} overflow-x-auto no-scrollbar`} style={{ width: mxWidth }}>
        <div className={`flex bg-black/20 min-w-max ${!user ? "border-t border-white/30" : ""}`}>
          {availableCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`flex items-center justify-center px-3 py-2.5 text-sm font-semibold whitespace-nowrap text-white border-r border-white/40 last:border-r-0 ${
                active === cat ? "bg-[#17552f]" : ""
              }`}
            >
              {CATEGORY_LABELS[cat]} ({models.filter((m) => m.category === cat).length})
            </button>
          ))}
        </div>
      </div>

      {/* Ad banner */}
      <div className="w-full max-w-screen-sm pt-3 flex justify-center">
        <a href="https://px.a8.net/svt/ejp?a8mat=4B5X8H+6G750Q+3OSK+69HA9" rel="nofollow">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img width="320" height="50" alt="" src="https://www27.a8.net/svt/bgt?aid=260616833390&wid=004&eno=01&mid=s00000017210001052000&mc=1" />
        </a>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img width="1" height="1" src="https://www18.a8.net/0.gif?a8mat=4B5X8H+6G750Q+3OSK+69HA9" alt="" className="hidden" />
      </div>

      {/* Model list */}
      <div className="w-full max-w-screen-sm pt-3 pb-4">
        <div className="rounded-lg bg-white overflow-hidden">
          {filtered.map((m, i) => (
            <Link
              key={m.id}
              href={`/catalog/${m.makerSlug}/${m.slug}`}
              className={`flex items-center gap-3 min-h-[56px] pr-2 ${m.alpen_pid || m.image_url ? "py-1 pl-2" : "py-3 pl-4"} ${i < filtered.length - 1 ? "border-b border-[#ececec]" : ""}`}
            >
              {(m.alpen_pid || m.image_url) && (
                <div className="relative w-12 h-12 shrink-0 bg-[#f5f5f5] rounded overflow-hidden">
                  {m.alpen_pid ? (
                    <AlpenAdImage alpenPid={m.alpen_pid} alt={m.name} className="w-full h-full" />
                  ) : (
                    <Image src={m.image_url!} alt={m.name} fill className="object-contain p-0.5" sizes="40px" />
                  )}
                </div>
              )}
              <span className="font-bold text-sm text-[#006728] truncate flex-1">{m.name}</span>
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
