"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-client";

const CATEGORY_LABELS: Record<string, string> = {
  driver: "ドライバー",
  fairway_wood: "FW",
  utility: "UT",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};

interface FavoriteClub {
  id: string;
  model_id: string;
  catalog_models: {
    name: string;
    category: string;
    slug: string;
    catalog_series: {
      maker: string;
      maker_slug: string;
      name_slug: string;
    };
  };
}

export function FavoriteClubsList() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteClub[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    apiFetch("/api/catalog/favorites")
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setFavorites(data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [user]);

  if (!user || isLoading || favorites.length === 0) return null;

  const display = favorites.slice(0, 10);

  return (
    <div className="w-full max-w-screen-sm px-3 pt-4">
      <div className="flex items-center px-1 mb-2">
        <h2 className="flex-1 text-sm font-bold text-white">お気に入りクラブ</h2>
        {favorites.length > 10 && (
          <Link href="/catalog/favorites" className="rounded-full border border-white px-3 py-0.5 text-xs font-bold text-white">
            すべて見る
          </Link>
        )}
      </div>
      <div className="rounded-lg bg-white overflow-hidden">
        {display.map((fav, i) => {
          const m = fav.catalog_models;
          const s = m.catalog_series;
          return (
            <Link
              key={fav.id}
              href={`/catalog/${s.maker_slug}/${s.name_slug}/${m.slug}`}
              className={`flex items-center justify-between px-4 py-3 ${i < display.length - 1 ? "border-b border-[#ececec]" : ""}`}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-bold text-sm text-[#006728] truncate">{m.name}</span>
                <span className="text-xs text-[#888]">
                  {s.maker} · {CATEGORY_LABELS[m.category] ?? m.category}
                </span>
              </div>
              <ChevronLeft className="h-4 w-4 text-[#bbb] rotate-180 shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
