import Image from "next/image";
import Link from "next/link";
import { getModelsByCategory, compareModelSlug } from "@/lib/catalog";
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

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const label = CATEGORY_LABELS[category] ?? category;
  return {
    title: `${label} スペック比較一覧 | Waggly`,
    description: `${label}の2モデル比較。番手別スペックを並べて確認できます。`,
  };
}

export default async function CompareIndexPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const models = await getModelsByCategory(category);
  const label = CATEGORY_LABELS[category] ?? category;

  // Generate all combinations
  const pairs: Array<{ slugA: string; slugB: string; nameA: string; nameB: string; href: string }> = [];
  for (let i = 0; i < models.length; i++) {
    for (let j = i + 1; j < models.length; j++) {
      const a = models[i];
      const b = models[j];
      const slugA = compareModelSlug(a.catalog_series, a);
      const slugB = compareModelSlug(b.catalog_series, b);
      const [sortedA, sortedB] = [slugA, slugB].sort();
      const nameA = `${a.catalog_series.maker} ${a.catalog_series.name}${a.name ? ` ${a.name}` : ""}`;
      const nameB = `${b.catalog_series.maker} ${b.catalog_series.name}${b.name ? ` ${b.name}` : ""}`;
      pairs.push({
        slugA: sortedA,
        slugB: sortedB,
        nameA: sortedA === slugA ? nameA : nameB,
        nameB: sortedA === slugA ? nameB : nameA,
        href: `/compare/${category}/${sortedA}-vs-${sortedB}`,
      });
    }
  }

  return (
    <div className="relative min-h-screen" style={{ minHeight: "100dvh" }}>
      <div className="flex flex-col items-center w-full">
        {/* Header */}
        <div className="flex flex-col items-center justify-center gap-0.5 py-3 w-full max-w-screen-sm">
          <Image src="/icons/waggly-logo-white.svg" alt="Waggly" width={101} height={32} />
          <p className="text-sm font-bold text-white">{label} スペック比較</p>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center px-3 py-1 w-full max-w-screen-sm bg-black/20 border-b border-white/30 overflow-hidden">
          <p className="text-xs text-white truncate">
            <span>比較</span>
            <span> / {label}</span>
          </p>
        </div>

        {/* Title bar */}
        <div className="px-5 py-3 w-full max-w-screen-sm bg-black/20">
          <h1 className="text-[15px] font-extrabold text-white">{label} スペック比較</h1>
          <p className="text-xs text-white/70 mt-0.5">2モデルのスペックを番手別に比較</p>
        </div>

        {/* Banner */}
        <PromoBanner />

        {/* Category nav */}
        <div className="flex flex-wrap gap-2 px-3 pt-4 w-full max-w-screen-sm">
          {ALL_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/compare/${cat}`}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                cat === category
                  ? "bg-[#17552f] border border-white text-white"
                  : "bg-white text-[#006728]"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </Link>
          ))}
        </div>

        {/* Content */}
        <div className="w-full max-w-screen-sm px-3 py-4">
          {pairs.length === 0 ? (
            <p className="text-sm text-white/70">比較できるモデルがありません</p>
          ) : (
            <div className="flex flex-col gap-2">
              {pairs.map((pair) => (
                <Link
                  key={pair.href}
                  href={pair.href}
                  className="flex items-center gap-2 rounded-md bg-white px-4 py-3"
                >
                  <span className="flex-1 text-sm font-medium text-[#222] truncate">{pair.nameA}</span>
                  <span className="shrink-0 text-xs font-bold text-[#006728]">VS</span>
                  <span className="flex-1 text-sm font-medium text-[#222] truncate text-right">{pair.nameB}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <p className="w-full max-w-screen-sm px-4 py-6 text-left text-xs text-white leading-relaxed">
          ※ スペック・関連情報の収集にはAIを利用しており、内容が正確でない場合があります。正確な情報はメーカー公式サイトをご確認ください。
        </p>
      </div>
    </div>
  );
}
