import Image from "next/image";
import Link from "next/link";
import { BackButton } from "@/components/layout/back-button";
import { notFound } from "next/navigation";
import { getModelsByMaker, getMakerBySlug } from "@/lib/catalog";
import { PromoBanner } from "@/components/catalog/promo-banner";
import { MakerCategoryTabs } from "@/components/catalog/maker-category-tabs";

export const revalidate = 86400;

export async function generateMetadata({ params }: { params: Promise<{ maker: string }> }) {
  const { maker } = await params;
  const makerData = await getMakerBySlug(maker);
  if (!makerData) return {};
  const displayName = makerData.name_ja ? `${makerData.name_ja}（${makerData.name}）` : makerData.name;
  return {
    title: `${displayName}のゴルフクラブカタログ | Waggly`,
    description: `${displayName}の全クラブスペックカタログ。ロフト角・ライ角・クラブ長さなど詳細スペックを確認。`,
  };
}

export default async function MakerPage({ params }: { params: Promise<{ maker: string }> }) {
  const { maker } = await params;
  const [makerData, models] = await Promise.all([
    getMakerBySlug(maker),
    getModelsByMaker(maker),
  ]);

  if (!makerData || models.length === 0) {
    notFound();
  }

  const makerName = makerData.name_ja ?? makerData.name;

  const allModels = models.map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    slug: m.slug,
    makerSlug: m.maker_slug,
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Waggly", item: "https://waggly.jp" },
      { "@type": "ListItem", position: 2, name: "ゴルフクラブカタログ", item: "https://waggly.jp/catalog" },
      { "@type": "ListItem", position: 3, name: makerName, item: `https://waggly.jp/catalog/${maker}` },
    ],
  };

  return (
    <div className="relative min-h-screen" style={{ minHeight: "100dvh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="flex flex-col items-center w-full">
        {/* Header */}
        <div className="flex items-center justify-center w-full max-w-screen-sm relative py-3 px-3">
          <BackButton fallbackHref="/catalog" />
          <Image src="/icons/waggly-logo-white.svg" alt="Waggly" width={101} height={32} />
          <Link href="/login" className="absolute right-3 p-1 text-white/70 hover:text-white transition-colors"><Image src="/icons/user-icon-w.svg" alt="ログイン" width={22} height={22} /></Link>
        </div>
        <div className="w-full bg-black/40 py-3">
          <h1 className="text-sm font-bold text-white text-center">{makerName}{makerData.name_ja ? ` (${makerData.name})` : ""} クラブカタログ</h1>
        </div>

        {/* Category tabs + model list */}
        <MakerCategoryTabs models={allModels} />
      </div>
    </div>
  );
}
