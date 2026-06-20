import Image from "next/image";
import Link from "next/link";
import { BackButton } from "@/components/layout/back-button";
import { PublicMenuButton } from "@/components/layout/public-menu";
import { getModelsByCategory, compareModelSlug } from "@/lib/catalog";
import { PromoBanner } from "@/components/catalog/promo-banner";
import { CompareSearch } from "@/components/catalog/compare-search";
import { RecentCompares } from "@/components/catalog/recent-compares";

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

  // Model options for search
  const modelOptions = models.map((m) => ({
    slug: compareModelSlug(m),
    label: `${m.maker} ${m.name}`,
    makerSlug: m.maker_slug,
  }));


  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Waggly", item: "https://waggly.jp" },
      { "@type": "ListItem", position: 2, name: "ゴルフクラブ比較", item: "https://waggly.jp/compare" },
      { "@type": "ListItem", position: 3, name: `${label}比較`, item: `https://waggly.jp/compare/${category}` },
    ],
  };

  return (
    <div className="relative min-h-screen" style={{ minHeight: "100dvh" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex flex-col items-center w-full">
        {/* Header */}
        <div className="flex items-center justify-center w-full max-w-screen-sm relative py-3 px-3">
          <BackButton fallbackHref="/compare" />
          <Image src="/icons/waggly-logo-white.svg" alt="Waggly" width={101} height={32} />
          <div className="absolute right-3 flex items-center gap-2">
            <Link href="/login" className="p-1"><Image src="/icons/user-icon-w.svg" alt="ログイン" width={28} height={28} /></Link>
            <PublicMenuButton />
          </div>
        </div>
        <div className="w-full bg-black/40 py-3">
          <h1 className="text-sm font-bold text-white text-center">{label} スペック比較</h1>
        </div>

        {/* Search UI */}
        <div className="w-full max-w-screen-sm px-3 pt-4">
          <CompareSearch category={category} models={modelOptions} />
        </div>

        {/* Recent compares */}
        <RecentCompares category={category} />

        {/* Disclaimer */}
        <p className="w-full max-w-screen-sm px-4 py-6 text-left text-xs text-white leading-relaxed">
          ※ スペック・関連情報の収集にはAIを利用しており、内容が正確でない場合があります。正確な情報はメーカー公式サイトをご確認ください。
        </p>

        <PromoBanner />
      </div>
    </div>
  );
}
