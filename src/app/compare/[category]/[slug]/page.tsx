import Image from "next/image";
import Link from "next/link";
import { BackButton } from "@/components/layout/back-button";
import { notFound } from "next/navigation";
import { getCompareModels } from "@/lib/catalog";
import { fetchRelatedNews } from "@/lib/catalog-news";
import { CompareTable } from "@/components/catalog/compare-table";
import { CompareVisitTracker } from "@/components/catalog/compare-visit-tracker";
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
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const vsIndex = slug.indexOf("-vs-");
  if (vsIndex === -1) return {};
  const slugA = slug.slice(0, vsIndex);
  const slugB = slug.slice(vsIndex + 4);

  const { modelA, modelB } = await getCompareModels(category, slugA, slugB);
  if (!modelA || !modelB) return {};

  const nameA = `${modelA.maker} ${modelA.name}`;
  const nameB = `${modelB.maker} ${modelB.name}`;
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

function ModelCard({ model, label }: { model: any; label: string }) {
  return (
    <Link
      href={`/catalog/${model.maker_slug}/${model.slug}`}
      className="flex items-center gap-2.5 rounded-md bg-white p-2 w-full"
    >
      <div className="flex flex-1 flex-col gap-px min-w-0">
        <p className="text-sm text-[#6b6b6b] font-bold leading-snug">{model.maker}</p>
        <p className="text-base font-bold text-[#006728] leading-snug truncate">
          {model.name}
        </p>
        <p className="text-xs text-[#7c7c7c] font-medium">
          {model.release_year ? `${model.release_year}年発売` : ""}
          {model.release_year && model.price != null ? " | " : ""}
          {model.price != null ? `¥${model.price.toLocaleString("ja-JP")}〜` : ""}
        </p>
      </div>
      <Image src="/icons/chevron-right.svg" alt="" width={9} height={14} className="shrink-0 opacity-40" style={{ width: "auto", height: "auto" }} />
    </Link>
  );
}

export default async function CompareVsPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;

  const vsIndex = slug.indexOf("-vs-");
  if (vsIndex === -1) notFound();
  const slugA = slug.slice(0, vsIndex);
  const slugB = slug.slice(vsIndex + 4);

  const { modelA, modelB } = await getCompareModels(category, slugA, slugB);
  if (!modelA || !modelB) notFound();

  const label = CATEGORY_LABELS[category] ?? category;
  const nameA = `${modelA.maker} ${modelA.name}`;
  const nameB = `${modelB.maker} ${modelB.name}`;

  const news = await fetchRelatedNews(`${modelA.name} ${label}`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Waggly", item: "https://waggly.jp" },
      { "@type": "ListItem", position: 2, name: "ゴルフクラブ比較", item: "https://waggly.jp/compare" },
      { "@type": "ListItem", position: 3, name: `${label}比較`, item: `https://waggly.jp/compare/${category}` },
      { "@type": "ListItem", position: 4, name: `${nameA} vs ${nameB}` },
    ],
  };

  return (
    <div className="relative min-h-screen" style={{ minHeight: "100dvh" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CompareVisitTracker category={category} slug={slug} nameA={nameA} nameB={nameB} />
      <div className="flex flex-col items-center w-full">
        {/* Header */}
        <div className="flex items-center justify-center w-full max-w-screen-sm relative py-3">
          <BackButton fallbackHref={`/compare/${category}`} />
          <div className="flex flex-col items-center gap-0.5">
            <Image src="/icons/waggly-logo-white.svg" alt="Waggly" width={101} height={32} />
            <p className="text-sm font-bold text-white">{label} スペック比較</p>
          </div>
        </div>

        {/* Model cards + VS */}
        <div className="flex flex-col items-center gap-1.5 px-5 py-5 w-full max-w-screen-sm bg-black/20">
          <ModelCard model={modelA} label={label} />
          <p className="text-lg font-bold text-white">VS</p>
          <ModelCard model={modelB} label={label} />
        </div>

        {/* App promo banner (hidden for logged-in users) */}
        <PromoBanner />

        {/* Compare table */}
        <div className="w-full max-w-screen-sm">
          <CompareTable modelA={modelA} modelB={modelB} news={news} />
        </div>

        {/* Disclaimer */}
        <p className="w-full max-w-screen-sm px-4 py-6 text-left text-xs text-white leading-relaxed">
          ※ スペック・関連情報の収集にはAIを利用しており、内容が正確でない場合があります。正確な情報はメーカー公式サイトをご確認ください。
        </p>
      </div>
    </div>
  );
}
