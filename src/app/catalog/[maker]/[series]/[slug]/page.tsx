import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getModelDetail, getModelsByCategory, compareModelSlug } from "@/lib/catalog";
import { SpecTable } from "@/components/catalog/spec-table";

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
  params: Promise<{ maker: string; series: string; slug: string }>;
}) {
  const { maker, series, slug } = await params;
  const model = await getModelDetail(maker, series, slug);
  if (!model) return {};
  const { catalog_series: s } = model;
  const categoryLabel = CATEGORY_LABELS[model.category] ?? model.category;
  return {
    title: `${s.maker} ${s.name} ${model.name || ""} ${categoryLabel} スペック | Waggly`,
    description: `${s.maker} ${s.name}${model.name ? ` ${model.name}` : ""}の${categoryLabel}スペック詳細。ロフト角・ライ角・クラブ長さなど番手別スペックを掲載。`,
    openGraph: {
      title: `${s.maker} ${s.name} ${categoryLabel} スペック`,
      description: `${s.maker} ${s.name}の${categoryLabel}詳細スペック`,
    },
  };
}

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ maker: string; series: string; slug: string }>;
}) {
  const { maker, series, slug } = await params;
  const model = await getModelDetail(maker, series, slug);

  if (!model) {
    notFound();
  }

  const { catalog_series: catalogSeries } = model;
  const categoryLabel = CATEGORY_LABELS[model.category] ?? model.category;

  // Fetch other models in the same category for compare links
  const categoryModels = await getModelsByCategory(model.category);
  const otherModels = categoryModels.filter((m) => m.id !== model.id);

  // Generate compare links (sort slugs alphabetically)
  const mySlug = compareModelSlug(catalogSeries, model);
  const compareLinks = otherModels.slice(0, 8).map((other) => {
    const otherSlug = compareModelSlug(other.catalog_series, other);
    const [slugA, slugB] = [mySlug, otherSlug].sort();
    return {
      href: `/compare/${model.category}/${slugA}-vs-${slugB}`,
      label: `${other.catalog_series.maker} ${other.catalog_series.name}${other.name ? ` ${other.name}` : ""}`,
    };
  });

  const imageUrl = model.image_url ?? catalogSeries.image_url;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-[#888] mb-4 flex flex-wrap gap-1">
          <Link href="/catalog" className="hover:text-[#006728]">カタログ</Link>
          <span>/</span>
          <Link href={`/catalog/${maker}`} className="hover:text-[#006728]">{catalogSeries.maker}</Link>
          <span>/</span>
          <Link href={`/catalog/${maker}/${series}`} className="hover:text-[#006728]">{catalogSeries.name}</Link>
          <span>/</span>
          <span>{categoryLabel}</span>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-xl border border-[#e0e0e0] p-5 mb-6">
          <div className="flex gap-4">
            {imageUrl && (
              <div className="relative w-24 h-24 shrink-0 bg-[#f5f5f5] rounded-lg overflow-hidden">
                <Image
                  src={imageUrl}
                  alt={`${catalogSeries.maker} ${catalogSeries.name}`}
                  fill
                  className="object-contain p-1"
                  sizes="96px"
                />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs text-[#888] mb-0.5">{catalogSeries.maker}</p>
              <h1 className="text-xl font-bold text-[#222] leading-tight">
                {catalogSeries.name}
                {model.name ? ` ${model.name}` : ""}
              </h1>
              <span className="inline-block mt-1 rounded-full bg-[#e6f2eb] px-2 py-0.5 text-xs font-medium text-[#006728]">
                {categoryLabel}
              </span>
            </div>
          </div>

          {/* Basic info */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {model.release_year && (
              <div>
                <span className="text-xs text-[#888]">発売年</span>
                <p className="font-medium">{model.release_year}年</p>
              </div>
            )}
            {model.price !== null && (
              <div>
                <span className="text-xs text-[#888]">価格</span>
                <p className="font-medium">
                  ¥{model.price.toLocaleString("ja-JP")}〜
                  {model.price_note && <span className="text-xs text-[#888] ml-1">{model.price_note}</span>}
                </p>
              </div>
            )}
            {model.head_material && (
              <div>
                <span className="text-xs text-[#888]">ヘッド素材</span>
                <p className="font-medium">{model.head_material}</p>
              </div>
            )}
            {model.finish && (
              <div>
                <span className="text-xs text-[#888]">フィニッシュ</span>
                <p className="font-medium">{model.finish}</p>
              </div>
            )}
            {model.grip_name && (
              <div>
                <span className="text-xs text-[#888]">グリップ</span>
                <p className="font-medium">{model.grip_name}</p>
              </div>
            )}
          </div>

          {/* Shaft list */}
          {model.shaft_names && model.shaft_names.length > 0 && (
            <div className="mt-4">
              <span className="text-xs text-[#888] block mb-1">シャフト</span>
              <div className="flex flex-wrap gap-1">
                {model.shaft_names.map((shaft) => (
                  <span
                    key={shaft}
                    className="inline-block rounded border border-[#ddd] px-2 py-0.5 text-xs text-[#555]"
                  >
                    {shaft}
                  </span>
                ))}
              </div>
            </div>
          )}

          {model.url && (
            <a
              href={model.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-xs text-[#006728] hover:underline"
            >
              公式ページ ↗
            </a>
          )}
        </div>

        {/* Spec table */}
        {model.catalog_specs.length > 0 && (
          <div className="mb-6">
            <h2 className="text-base font-bold text-[#222] mb-3">スペック詳細</h2>
            <div className="rounded-xl border border-[#e0e0e0] overflow-hidden">
              <SpecTable specs={model.catalog_specs} category={model.category} />
            </div>
          </div>
        )}

        {/* Compare links */}
        {compareLinks.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-[#222] mb-3">他モデルと比較する</h2>
            <div className="flex flex-wrap gap-2">
              {compareLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center rounded-full border border-[#006728] bg-white px-3 py-1.5 text-xs font-medium text-[#006728] hover:bg-[#e6f2eb] transition-colors"
                >
                  {link.label} と比較
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
