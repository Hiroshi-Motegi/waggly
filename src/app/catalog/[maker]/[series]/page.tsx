import Image from "next/image";
import Link from "next/link";
import { BackButton } from "@/components/layout/back-button";
import { notFound } from "next/navigation";
import { getModelsBySeries } from "@/lib/catalog";
import { PromoBanner } from "@/components/catalog/promo-banner";

export const revalidate = 86400;

const CATEGORY_LABELS: Record<string, string> = {
  driver: "ドライバー",
  fairway_wood: "フェアウェイウッド",
  utility: "ユーティリティ",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ maker: string; series: string }>;
}) {
  const { maker, series } = await params;
  const models = await getModelsBySeries(maker, series);
  if (models.length === 0) return {};
  const { catalog_series: s } = models[0];
  return {
    title: `${s.maker} ${s.name} スペックカタログ | Waggly`,
    description: `${s.maker} ${s.name}のゴルフクラブスペック一覧。`,
  };
}

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ maker: string; series: string }>;
}) {
  const { maker, series } = await params;
  const models = await getModelsBySeries(maker, series);

  if (models.length === 0) {
    notFound();
  }

  const { catalog_series: catalogSeries } = models[0];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Waggly", item: "https://waggly.jp" },
      { "@type": "ListItem", position: 2, name: "ゴルフクラブカタログ", item: "https://waggly.jp/catalog" },
      { "@type": "ListItem", position: 3, name: catalogSeries.maker, item: `https://waggly.jp/catalog/${maker}` },
      { "@type": "ListItem", position: 4, name: catalogSeries.name, item: `https://waggly.jp/catalog/${maker}/${series}` },
    ],
  };

  return (
    <div className="relative min-h-screen" style={{ minHeight: "100dvh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="flex flex-col items-center w-full">
        {/* Header */}
        <div className="flex items-center justify-center w-full max-w-screen-sm relative py-3">
          <BackButton fallbackHref={`/catalog/${maker}`} />
          <div className="flex flex-col items-center gap-0.5">
            <Image src="/icons/waggly-logo-white.svg" alt="Waggly" width={101} height={32} />
            <h1 className="text-sm font-bold text-white">{catalogSeries.maker} {catalogSeries.name}</h1>
          </div>
        </div>

        {/* Banner */}
        <PromoBanner />

        {/* Content */}
        <div className="w-full max-w-screen-sm px-3 py-4">
          <div className="rounded-lg bg-white overflow-hidden">
            {models.map((model, i) => {
              const categoryLabel = CATEGORY_LABELS[model.category] ?? model.category;
              return (
                <Link
                  key={model.id}
                  href={`/catalog/${catalogSeries.maker_slug}/${catalogSeries.name_slug}/${model.slug}`}
                  className={`flex items-center justify-between px-4 py-3 ${i < models.length - 1 ? "border-b border-[#ececec]" : ""}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-sm text-[#006728] truncate">
                      {model.name}
                    </span>
                    <span className="shrink-0 rounded-full bg-[#e6f2eb] px-2 py-0.5 text-[11px] font-medium text-[#006728]">
                      {categoryLabel}
                    </span>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-[#bbb] rotate-180 shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
