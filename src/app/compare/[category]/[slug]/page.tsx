import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompareModels } from "@/lib/catalog";
import { CompareTable } from "@/components/catalog/compare-table";

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
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const vsIndex = slug.indexOf("-vs-");
  if (vsIndex === -1) return {};
  const slugA = slug.slice(0, vsIndex);
  const slugB = slug.slice(vsIndex + 4);

  const { modelA, modelB } = await getCompareModels(category, slugA, slugB);
  if (!modelA || !modelB) return {};

  const nameA = `${modelA.catalog_series.maker} ${modelA.catalog_series.name}${modelA.name ? ` ${modelA.name}` : ""}`;
  const nameB = `${modelB.catalog_series.maker} ${modelB.catalog_series.name}${modelB.name ? ` ${modelB.name}` : ""}`;
  const label = CATEGORY_LABELS[category] ?? category;

  return {
    title: `${nameA} vs ${nameB} ${label}スペック比較 | Waggly`,
    description: `${nameA}と${nameB}の${label}スペックを番手別に詳細比較。ロフト角・ライ角・クラブ長さなど。`,
    openGraph: {
      title: `${nameA} vs ${nameB}`,
      description: `${label}スペック比較`,
    },
  };
}

export default async function CompareVsPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;

  // Parse "slugA-vs-slugB"
  const vsIndex = slug.indexOf("-vs-");
  if (vsIndex === -1) {
    notFound();
  }
  const slugA = slug.slice(0, vsIndex);
  const slugB = slug.slice(vsIndex + 4);

  const { modelA, modelB } = await getCompareModels(category, slugA, slugB);

  if (!modelA || !modelB) {
    notFound();
  }

  const label = CATEGORY_LABELS[category] ?? category;
  const nameA = `${modelA.catalog_series.maker} ${modelA.catalog_series.name}${modelA.name ? ` ${modelA.name}` : ""}`;
  const nameB = `${modelB.catalog_series.maker} ${modelB.catalog_series.name}${modelB.name ? ` ${modelB.name}` : ""}`;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-[#888] mb-4 flex flex-wrap gap-1">
          <Link href={`/compare/${category}`} className="hover:text-[#006728]">{label}比較</Link>
          <span>/</span>
          <span className="truncate">{nameA} vs {nameB}</span>
        </nav>

        {/* Title */}
        <h1 className="text-xl font-bold text-[#222] mb-1 leading-tight">
          {nameA}
          <span className="mx-2 text-[#006728] font-black">VS</span>
          {nameB}
        </h1>
        <p className="text-sm text-[#666] mb-6">{label} スペック比較</p>

        {/* Model info cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[modelA, modelB].map((model, idx) => (
            <div key={idx} className="rounded-xl border border-[#e0e0e0] bg-white p-4">
              <p className="text-xs text-[#888] mb-0.5">{model.catalog_series.maker}</p>
              <p className="font-bold text-sm text-[#222] leading-tight">
                {model.catalog_series.name}
                {model.name ? ` ${model.name}` : ""}
              </p>
              {model.release_year && (
                <p className="text-xs text-[#aaa] mt-1">{model.release_year}年発売</p>
              )}
              {model.price !== null && (
                <p className="text-xs text-[#555] mt-1">¥{model.price.toLocaleString("ja-JP")}〜</p>
              )}
              <Link
                href={`/catalog/${model.catalog_series.maker_slug}/${model.catalog_series.name_slug}/${model.slug}`}
                className="mt-2 inline-block text-xs text-[#006728] hover:underline"
              >
                詳細を見る →
              </Link>
            </div>
          ))}
        </div>

        {/* Compare table */}
        <div className="rounded-xl border border-[#e0e0e0] overflow-hidden">
          <CompareTable modelA={modelA} modelB={modelB} />
        </div>
      </div>
    </div>
  );
}
