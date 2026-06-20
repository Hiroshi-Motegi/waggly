import Image from "next/image";
import { fetchRelatedNews } from "@/lib/catalog-news";
import { PromoBanner } from "@/components/catalog/promo-banner";
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
    <div className="relative min-h-screen" style={{ minHeight: "100dvh" }}>
      <div className="flex flex-col items-center w-full">
        {/* Header */}
        <div className="flex items-center w-full max-w-screen-sm py-3 px-3 relative">
          <Link href="/" className="absolute left-3 p-1 text-white/70 hover:text-white transition-colors">
            <svg width="10" height="18" viewBox="0 0 10 18" fill="none"><path d="M9 1L1 9L9 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
          <Image src="/icons/waggly-logo-white.svg" alt="Waggly" width={101} height={32} className="mx-auto" />
          <Link href="/login" className="absolute right-3 text-xs text-white/70 hover:text-white transition-colors">ログイン</Link>
        </div>

        <h1 className="text-sm font-bold text-white mt-1">ゴルフ最新ニュース</h1>

        {/* Tabs */}
        <NewsTabBar />

        {/* News list */}
        <div className="w-full max-w-screen-sm px-3 pt-3">
          <NewsListInfinite items={news} />
        </div>

        <PromoBanner />
      </div>
    </div>
  );
}
