"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Heart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-client";
import { PublicPageLayout } from "@/components/layout/public-page-layout";

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
    maker: string;
    maker_slug: string;
  };
}

export default function CatalogFavoritesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteClub[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsLoading(false);
      return;
    }
    apiFetch("/api/catalog/favorites")
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setFavorites(data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [user, authLoading]);

  return (
    <PublicPageLayout title="お気に入りクラブ" backHref="/catalog">
      <div className="w-full max-w-screen-sm py-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        ) : !user ? (
          <div className="rounded-lg bg-white p-6 text-center">
            <p className="text-sm text-[#666] mb-4">ログインするとお気に入りクラブを保存できます。</p>
            <a
              href="/auth/login?redirect=/catalog/favorites"
              className="inline-block rounded-full bg-[#006728] px-6 py-2.5 text-sm font-bold text-white"
            >
              ログイン
            </a>
          </div>
        ) : favorites.length === 0 ? (
          <div className="rounded-lg bg-white p-6 text-center">
            <Heart className="mx-auto mb-3 h-8 w-8 text-[#ccc]" />
            <p className="text-sm text-[#888] mb-4">お気に入りクラブはまだありません。</p>
            <Link
              href="/catalog"
              className="inline-block rounded-full border border-[#006728] px-6 py-2.5 text-sm font-bold text-[#006728]"
            >
              カタログを見る
            </Link>
          </div>
        ) : (
          <div className="rounded-lg bg-white overflow-hidden">
            {favorites.map((fav, i) => {
              const m = fav.catalog_models;
              return (
                <Link
                  key={fav.id}
                  href={`/catalog/${m.maker_slug}/${m.slug}`}
                  className={`flex items-center justify-between px-4 py-3 ${i < favorites.length - 1 ? "border-b border-[#ececec]" : ""}`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-bold text-sm text-[#006728] truncate">{m.name}</span>
                    <span className="text-xs text-[#888]">
                      {m.maker} · {CATEGORY_LABELS[m.category] ?? m.category}
                    </span>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-[#bbb] rotate-180 shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PublicPageLayout>
  );
}
