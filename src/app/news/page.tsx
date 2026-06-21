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

      {/* Ad banner */}
      <div className="w-full max-w-screen-sm pt-3 flex justify-center">
        <a href="https://px.a8.net/svt/ejp?a8mat=4B5X8H+6G750Q+3OSK+69HA9" rel="nofollow">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img width="320" height="50" alt="" src="https://www27.a8.net/svt/bgt?aid=260616833390&wid=004&eno=01&mid=s00000017210001052000&mc=1" />
        </a>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img width="1" height="1" src="https://www18.a8.net/0.gif?a8mat=4B5X8H+6G750Q+3OSK+69HA9" alt="" className="hidden" />
      </div>

      <div className="w-full max-w-screen-sm pt-3">
        <NewsListInfinite items={news} />
      </div>
      <PromoBanner />
    </PublicPageLayout>
  );
}
