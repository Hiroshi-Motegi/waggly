import { notFound } from "next/navigation";
import { getModelsByMaker, getMakerBySlug } from "@/lib/catalog";
import { PromoBanner } from "@/components/catalog/promo-banner";
import { PublicPageLayout } from "@/components/layout/public-page-layout";
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

  const allModels = models.map((m: any) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    slug: m.slug,
    makerSlug: m.maker_slug,
    image_url: m.catalog_model_images?.[0]?.image_url ?? m.image_url,
    alpen_pid: m.alpen_pid,
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
    <PublicPageLayout title={`${makerName}${makerData.name_ja ? ` (${makerData.name})` : ""} クラブカタログ`} backHref="/catalog">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MakerCategoryTabs models={allModels} />
      <PromoBanner />
    </PublicPageLayout>
  );
}
