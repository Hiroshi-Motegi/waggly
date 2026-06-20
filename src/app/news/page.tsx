import Image from "next/image";
import Link from "next/link";
import { fetchRelatedNews } from "@/lib/catalog-news";
import { PromoBanner } from "@/components/catalog/promo-banner";
import { PublicMenuButton } from "@/components/layout/public-menu";
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
          <div className="absolute left-3"><PublicMenuButton /></div>
          <Image src="/icons/waggly-logo-white.svg" alt="Waggly" width={101} height={32} className="mx-auto" />
          <Link href="/login" className="absolute right-3 p-1"><Image src="/icons/user-icon-w.svg" alt="ログイン" width={28} height={28} /></Link>
        </div>

        <div className="w-full bg-black/40 py-3">
          <h1 className="text-sm font-bold text-white text-center">ゴルフ最新ニュース</h1>
        </div>

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
