import Image from "next/image";
import Link from "next/link";
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

  return (
    <div className="relative min-h-screen" style={{ minHeight: "100dvh" }}>
      <div className="flex flex-col items-center w-full">
        {/* Header */}
        <div className="flex flex-col items-center justify-center gap-0.5 py-3 w-full max-w-screen-sm">
          <Image src="/icons/waggly-logo-white.svg" alt="Waggly" width={101} height={32} />
          <p className="text-sm font-bold text-white">ゴルフクラブカタログ</p>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center px-3 py-1 w-full max-w-screen-sm bg-black/20 border-b border-white/30 overflow-hidden">
          <p className="text-xs text-white truncate">
            <Link href="/catalog" className="underline">カタログ</Link>
            <span> / </span>
            <Link href={`/catalog/${maker}`} className="underline">{catalogSeries.maker}</Link>
            <span> / {catalogSeries.name}</span>
          </p>
        </div>

        {/* Title bar */}
        <div className="px-5 py-3 w-full max-w-screen-sm bg-black/20">
          <h1 className="text-[15px] font-extrabold text-white">
            {catalogSeries.maker} {catalogSeries.name}
          </h1>
        </div>

        {/* Banner */}
        <PromoBanner />

        {/* Content */}
        <div className="w-full max-w-screen-sm px-3 py-4">
          <div className="grid grid-cols-2 gap-2">
            {models.map((model) => {
              const imageUrl = model.image_url ?? catalogSeries.image_url;
              const categoryLabel = CATEGORY_LABELS[model.category] ?? model.category;
              return (
                <Link
                  key={model.id}
                  href={`/catalog/${catalogSeries.maker_slug}/${catalogSeries.name_slug}/${model.slug}`}
                  className="block rounded-md bg-white overflow-hidden"
                >
                  <div className="aspect-video relative bg-[#f5f5f5]">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={`${catalogSeries.maker} ${catalogSeries.name} ${model.name}`}
                        fill
                        className="object-contain p-2"
                        sizes="(max-width: 640px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[#bbb] text-xs">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="font-bold text-sm text-[#006728] leading-tight">
                      {catalogSeries.name}{model.name ? ` ${model.name}` : ""}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-block rounded-full bg-[#e6f2eb] px-2 py-0.5 text-[11px] font-medium text-[#006728]">
                        {categoryLabel}
                      </span>
                      {model.price !== null && (
                        <span className="text-xs text-[#7c7c7c]">
                          ¥{model.price.toLocaleString("ja-JP")}〜
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
