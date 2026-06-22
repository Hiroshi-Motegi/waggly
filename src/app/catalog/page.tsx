import Link from "next/link";
import { getMakers } from "@/lib/catalog";
import { PromoBanner } from "@/components/catalog/promo-banner";
import { PublicPageLayout } from "@/components/layout/public-page-layout";
import { FavoriteClubsList } from "@/components/catalog/favorite-clubs-list";

export const revalidate = 86400;

export const metadata = {
  title: "ゴルフクラブカタログ | Waggly",
  description: "メーカー別ゴルフクラブスペックカタログ。ロフト角・ライ角・クラブ長さなど詳細スペックを確認できます。",
};

export default async function CatalogPage() {
  const makers = await getMakers();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Waggly", item: "https://waggly.jp" },
      { "@type": "ListItem", position: 2, name: "ゴルフクラブカタログ", item: "https://waggly.jp/catalog" },
    ],
  };

  return (
    <PublicPageLayout title="ゴルフクラブカタログ">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Search */}
      <div className="w-full max-w-screen-sm pt-4">
        <Link
          href="/catalog/search"
          className="flex items-center gap-2 w-full rounded-md bg-white px-4 py-3 text-sm text-[#aaa]"
        >
          <svg className="w-4 h-4 text-[#aaa]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          メーカー名・モデル名で検索
        </Link>
      </div>

      {/* Ad banner */}
      <div className="w-full max-w-screen-sm pt-4 flex justify-center">
        <a href="https://px.a8.net/svt/ejp?a8mat=4B5X8H+6G750Q+3OSK+69HA9" rel="nofollow">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img width="320" height="50" alt="" src="https://www27.a8.net/svt/bgt?aid=260616833390&wid=004&eno=01&mid=s00000017210001052000&mc=1" />
        </a>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img width="1" height="1" src="https://www18.a8.net/0.gif?a8mat=4B5X8H+6G750Q+3OSK+69HA9" alt="" className="hidden" />
      </div>

      {/* Content */}
      <div className="w-full max-w-screen-sm pt-4 pb-4">
        <h2 className="text-sm font-bold text-white px-1 pb-2">ブランドから選ぶ</h2>
        {makers.length === 0 ? (
          <p className="text-sm text-white/70">カタログデータがありません</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {makers.map((maker) => (
              <Link
                key={maker.slug}
                href={`/catalog/${maker.slug}`}
                className="flex flex-col items-center justify-center rounded-md bg-white px-4 py-3 text-center hover:bg-[#f5f5f5] transition-colors"
              >
                <span className="text-base font-bold text-[#222]">{maker.name_ja ?? maker.name}</span>
                {maker.name_ja && <span className="text-xs text-[#8b8b8b]">{maker.name}</span>}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Favorite clubs */}
      <FavoriteClubsList />

      <PromoBanner />
    </PublicPageLayout>
  );
}
