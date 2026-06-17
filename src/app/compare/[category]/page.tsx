import Link from "next/link";
import { getModelsByCategory, modelSlug } from "@/lib/catalog";

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
      const slugA = modelSlug(a.catalog_series);
      const slugB = modelSlug(b.catalog_series);
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
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <nav className="text-xs text-[#888] mb-4 flex gap-1">
          <span>比較</span>
          <span>/</span>
          <span>{label}</span>
        </nav>

        <h1 className="text-2xl font-bold text-[#222] mb-2">{label} スペック比較</h1>
        <p className="text-sm text-[#666] mb-6">2モデルのスペックを番手別に比較します</p>

        {/* Category nav */}
        <div className="flex flex-wrap gap-2 mb-8">
          {ALL_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/compare/${cat}`}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                cat === category
                  ? "bg-[#006728] text-white"
                  : "bg-white border border-[#e0e0e0] text-[#555] hover:border-[#006728] hover:text-[#006728]"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </Link>
          ))}
        </div>

        {pairs.length === 0 ? (
          <p className="text-sm text-[#888]">比較できるモデルがありません</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {pairs.map((pair) => (
              <Link
                key={pair.href}
                href={pair.href}
                className="flex items-center gap-2 rounded-xl border border-[#e0e0e0] bg-white px-4 py-3 hover:border-[#006728] hover:shadow-sm transition-all"
              >
                <span className="flex-1 text-sm font-medium text-[#222] truncate">{pair.nameA}</span>
                <span className="shrink-0 text-xs font-bold text-[#006728]">VS</span>
                <span className="flex-1 text-sm font-medium text-[#222] truncate text-right">{pair.nameB}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
