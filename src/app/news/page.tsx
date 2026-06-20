import Image from "next/image";
import Link from "next/link";
import { BackButton } from "@/components/layout/back-button";
import { fetchRelatedNews } from "@/lib/catalog-news";
import { PromoBanner } from "@/components/catalog/promo-banner";
import { ChevronLeft } from "lucide-react";

export const revalidate = 3600;

export const metadata = {
  title: "ゴルフ最新ニュース | Waggly",
  description:
    "ドライバー・アイアン・ウェッジなどゴルフクラブの最新ニュースをカテゴリ別にまとめてチェック。",
};

const CATEGORIES = [
  { key: "driver", label: "ドライバー", query: "ドライバー 新製品" },
  { key: "fairway_wood", label: "フェアウェイウッド", query: "フェアウェイウッド 新製品" },
  { key: "utility", label: "ユーティリティ", query: "ユーティリティ 新製品" },
  { key: "iron", label: "アイアン", query: "アイアン 新製品" },
  { key: "wedge", label: "ウェッジ", query: "ウェッジ 新製品" },
  { key: "putter", label: "パター", query: "パター 新製品" },
] as const;

export default async function NewsTopPage() {
  const news = await fetchRelatedNews("クラブ 新製品", 8);

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

        {/* Latest news */}
        {news.length > 0 && (
          <div className="w-full max-w-screen-sm px-3 pt-4">
            <h2 className="text-sm font-bold text-white px-1 pb-1">最新ニュース</h2>
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
          </div>
        )}

        {/* Category news links */}
        <div className="w-full max-w-screen-sm px-3 pt-4">
          <h2 className="text-sm font-bold text-white px-1 pb-1">カテゴリ別ニュース</h2>
          <div className="rounded-lg bg-white overflow-hidden">
            {CATEGORIES.map((cat, i) => (
              <Link
                key={cat.key}
                href={`/news/${cat.key}`}
                className={`flex items-center justify-between px-4 py-3 ${i < CATEGORIES.length - 1 ? "border-b border-[#ececec]" : ""}`}
              >
                <span className="text-sm font-bold text-[#006728]">{cat.label}</span>
                <ChevronLeft className="h-4 w-4 text-[#bbb] rotate-180 shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        <div className="pb-8" />
      </div>
    </div>
  );
}
