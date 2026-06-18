import Image from "next/image";
import Link from "next/link";
import { BackButton } from "@/components/layout/back-button";
import { notFound } from "next/navigation";
import { getModelsByMaker } from "@/lib/catalog";
import { PromoBanner } from "@/components/catalog/promo-banner";
import { MakerCategoryTabs } from "@/components/catalog/maker-category-tabs";

export const revalidate = 86400;

export async function generateMetadata({ params }: { params: Promise<{ maker: string }> }) {
  const { maker } = await params;
  const models = await getModelsByMaker(maker);
  if (models.length === 0) return {};
  const makerName = models[0].maker;
  return {
    title: `${makerName}のゴルフクラブカタログ | Waggly`,
    description: `${makerName}の全クラブスペックカタログ。`,
  };
}

export default async function MakerPage({ params }: { params: Promise<{ maker: string }> }) {
  const { maker } = await params;
  const models = await getModelsByMaker(maker);

  if (models.length === 0) {
    notFound();
  }

  const makerName = models[0].maker;

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
        <div className="flex items-center justify-center w-full max-w-screen-sm relative py-3">
          <BackButton fallbackHref="/catalog" />
          <div className="flex flex-col items-center gap-0.5">
            <Image src="/icons/waggly-logo-white.svg" alt="Waggly" width={101} height={32} />
            <h1 className="text-sm font-bold text-white">{makerName} クラブカタログ</h1>
          </div>
        </div>

        {/* Banner */}
        <PromoBanner />

        {/* Category tabs + model list */}
        <MakerCategoryTabs models={allModels} />
      </div>
    </div>
  );
}
