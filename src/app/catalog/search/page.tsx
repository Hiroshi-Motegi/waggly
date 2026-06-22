import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { searchModels } from "@/lib/catalog";
import { PublicPageLayout } from "@/components/layout/public-page-layout";
import { EventTracker } from "@/components/event-tracker";
import { CatalogSearchBar } from "@/components/catalog/catalog-search-bar";

export const revalidate = 86400;

const CATEGORY_LABELS: Record<string, string> = {
  driver: "ドライバー",
  fairway_wood: "FW",
  utility: "UT",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return {
    title: q ? `「${q}」の検索結果 | Waggly` : "検索 | Waggly",
  };
}

export default async function CatalogSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const results = query.length >= 2 ? await searchModels(query) : [];

  return (
    <PublicPageLayout title="検索結果" backHref="/catalog">
      {query.length >= 2 && <EventTracker event="catalog_searched" params={{ query, results_count: results.length }} />}

        {/* Search bar */}
        <div className="w-full max-w-screen-sm pt-4">
          <CatalogSearchBar defaultValue={query} />
        </div>

        {/* Query result count */}
        {query.length >= 2 && (
          <div className="w-full max-w-screen-sm pt-2 pb-1">
            <p className="text-sm text-white">
              「<span className="font-bold">{query}</span>」{results.length}件
            </p>
          </div>
        )}

        {/* Results */}
        <div className="w-full max-w-screen-sm pt-2 pb-4">
          {results.length === 0 ? (
            <div className="rounded-lg bg-white p-4 text-center">
              <p className="text-sm text-[#8b8b8b]">
                {query.length < 2 ? "2文字以上で検索してください" : "該当するモデルが見つかりませんでした"}
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-white overflow-hidden">
              {results.map((m, i) => (
                <Link
                  key={m.id}
                  href={`/catalog/${m.maker_slug}/${m.slug}`}
                  className={`flex items-center justify-between px-4 py-3 ${i < results.length - 1 ? "border-b border-[#ececec]" : ""}`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-bold text-sm text-[#006728] truncate">{m.name}</span>
                    <span className="text-xs text-[#888]">
                      {m.maker} · {CATEGORY_LABELS[m.category] ?? m.category}
                    </span>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-[#bbb] rotate-180 shrink-0" />
                </Link>
              ))}
            </div>
            {results.length >= 200 && (
              <p className="pt-2 text-xs text-white/70 text-center">結果が多いため200件まで表示しています。キーワードを追加して絞り込んでください。</p>
            )}
          )}
        </div>
    </PublicPageLayout>
  );
}
