import { fetchRelatedNews } from "@/lib/catalog-news";
import { PromoBanner } from "@/components/catalog/promo-banner";
import { PublicPageLayout } from "@/components/layout/public-page-layout";
import { NewsTabBar } from "@/components/news/news-tab-bar";
import { NewsListInfinite } from "@/components/news/news-list-infinite";

export const revalidate = 3600;

export const metadata = {
  title: "ゴルフ最新ニュース | Waggly",
  description:
    "ドライバー・アイアン・ウェッジなどゴルフクラブの最新ニュースをカテゴリ別にまとめてチェック。",
};

export default async function NewsTopPage() {
  const news = await fetchRelatedNews("クラブ 新製品", 30);

  return (
    <PublicPageLayout title="ゴルフ最新ニュース">
      <NewsTabBar />
      <div className="w-full max-w-screen-sm pt-3">
        <NewsListInfinite items={news} />
      </div>
      <PromoBanner />
    </PublicPageLayout>
  );
}
