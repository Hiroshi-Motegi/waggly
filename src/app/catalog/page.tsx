import Image from "next/image";
import Link from "next/link";
import { getMakers, getAllModels } from "@/lib/catalog";
import { PromoBanner } from "@/components/catalog/promo-banner";
import { PublicMenuButton } from "@/components/layout/public-menu";
import { CatalogSearch } from "@/components/catalog/catalog-search";
import { FavoriteClubsList } from "@/components/catalog/favorite-clubs-list";

export const revalidate = 86400;

export const metadata = {
  title: "ゴルフクラブカタログ | Waggly",
  description: "メーカー別ゴルフクラブスペックカタログ。ロフト角・ライ角・クラブ長さなど詳細スペックを確認できます。",
};

export default async function CatalogPage() {
  const [makers, allModels] = await Promise.all([getMakers(), getAllModels()]);

  const searchModels = allModels.map((m) => ({
    name: m.name,
    category: m.category,
    makerSlug: m.maker_slug,
    slug: m.slug,
    maker: m.maker,
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Waggly", item: "https://waggly.jp" },
      { "@type": "ListItem", position: 2, name: "ゴルフクラブカタログ", item: "https://waggly.jp/catalog" },
    ],
  };

  return (
    <div className="relative min-h-screen" style={{ minHeight: "100dvh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="flex flex-col items-center w-full">
        {/* Header */}
        <div className="flex items-center w-full max-w-screen-sm py-3 px-3 relative">
          <div className="absolute left-3"><PublicMenuButton /></div>
          <Image src="/icons/waggly-logo-white.svg" alt="Waggly" width={101} height={32} className="mx-auto" />
          <Link href="/login" className="absolute right-3 p-1"><Image src="/icons/user-icon-w.svg" alt="ログイン" width={28} height={28} /></Link>
        </div>

        {/* Page title */}
        <div className="w-full bg-black/40 py-3">
          <h1 className="text-sm font-bold text-white text-center">ゴルフクラブカタログ</h1>
        </div>

        {/* Search */}
        <div className="w-full max-w-screen-sm px-4 pt-4 pb-2">
          <h2 className="text-sm font-bold text-white">クラブを検索</h2>
        </div>
        <CatalogSearch models={searchModels} />

        {/* Content */}
        <div className="w-full max-w-screen-sm px-3 pt-4 pb-4">
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
      </div>
    </div>
  );
}
