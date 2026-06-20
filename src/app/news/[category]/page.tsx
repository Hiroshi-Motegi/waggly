import Image from "next/image";
import { notFound } from "next/navigation";
import { fetchRelatedNews } from "@/lib/catalog-news";
import { PromoBanner } from "@/components/catalog/promo-banner";
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

  const news = await fetchRelatedNews(config.query, 50);

  return (
    <div className="relative min-h-screen" style={{ minHeight: "100dvh" }}>
      <div className="flex flex-col items-center w-full">
        {/* Header */}
        <div className="flex items-center justify-center w-full max-w-screen-sm relative py-3">
          <div className="flex flex-col items-center gap-0.5">
            <Image src="/icons/waggly-logo-white.svg" alt="Waggly" width={101} height={32} />
            <h1 className="text-sm font-bold text-white">ゴルフ最新ニュース</h1>
          </div>
        </div>

        {/* Banner */}
        <PromoBanner />

        {/* Tabs */}
        <NewsTabBar />

        {/* News list */}
        <div className="w-full max-w-screen-sm px-3 pt-3">
          <NewsListInfinite items={news} />
        </div>

        <div className="pb-8" />
      </div>
    </div>
  );
}
