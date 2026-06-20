import { notFound } from "next/navigation";
import { fetchRelatedNews } from "@/lib/catalog-news";
import { PromoBanner } from "@/components/catalog/promo-banner";
import { PublicPageLayout } from "@/components/layout/public-page-layout";
import { NewsTabBar } from "@/components/news/news-tab-bar";
import { NewsListInfinite } from "@/components/news/news-list-infinite";

export const revalidate = 3600;

const CATEGORY_CONFIG: Record<string, { label: string; query: string }> = {
  driver: { label: "ドライバー", query: "ドライバー 新製品" },
  fairway_wood: { label: "フェアウェイウッド", query: "フェアウェイウッド 新製品" },
  utility: { label: "ユーティリティ", query: "ユーティリティ 新製品" },
  iron: { label: "アイアン", query: "アイアン 新製品" },
  wedge: { label: "ウェッジ", query: "ウェッジ 新製品" },
  putter: { label: "パター", query: "パター 新製品" },
};

export function generateStaticParams() {
  return Object.keys(CATEGORY_CONFIG).map((key) => ({ category: key }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const config = CATEGORY_CONFIG[category];
  if (!config) return {};
  return {
    title: `${config.label}の最新ニュース | Waggly`,
    description: `${config.label}に関するゴルフクラブの最新ニュースをまとめてチェック。`,
  };
}

export default async function CategoryNewsPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const config = CATEGORY_CONFIG[category];
  if (!config) notFound();

  const news = await fetchRelatedNews(config.query, 30);

  return (
    <PublicPageLayout title="ゴルフ最新ニュース" backHref="/news">
      <NewsTabBar />
      <div className="w-full max-w-screen-sm pt-3">
        <NewsListInfinite items={news} />
      </div>
      <PromoBanner />
    </PublicPageLayout>
  );
}
