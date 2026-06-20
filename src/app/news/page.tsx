import Image from "next/image";
import { fetchRelatedNews } from "@/lib/catalog-news";
import { PromoBanner } from "@/components/catalog/promo-banner";
import { NewsTabBar } from "@/components/news/news-tab-bar";

export const revalidate = 3600;

export const metadata = {
  title: "ゴルフ最新ニュース | Waggly",
  description:
    "ドライバー・アイアン・ウェッジなどゴルフクラブの最新ニュースをカテゴリ別にまとめてチェック。",
};

export default async function NewsTopPage() {
  const news = await fetchRelatedNews("クラブ 新製品", 15);

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
          {news.length === 0 ? (
            <div className="rounded-lg bg-white p-4 text-center">
              <p className="text-sm text-[#8b8b8b]">現在ニュースがありません</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {news.map((item, i) => (
                <a
                  key={i}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col gap-1 rounded-md bg-white p-3"
                >
                  <p className="text-sm font-bold text-[#006728] leading-snug">{item.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#888]">{item.source}</span>
                    {item.date && (
                      <span className="text-xs text-[#aaa]">
                        {new Date(item.date).toLocaleDateString("ja-JP")}
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="pb-8" />
      </div>
    </div>
  );
}
