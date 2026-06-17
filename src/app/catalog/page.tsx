import Image from "next/image";
import Link from "next/link";
import { getMakers } from "@/lib/catalog";
import { PromoBanner } from "@/components/catalog/promo-banner";

export const revalidate = 86400;

export const metadata = {
  title: "ゴルフクラブカタログ | Waggly",
  description: "メーカー別ゴルフクラブスペックカタログ。ロフト角・ライ角・クラブ長さなど詳細スペックを確認できます。",
};

export default async function CatalogPage() {
  const makers = await getMakers();

  return (
    <div className="relative min-h-screen" style={{ minHeight: "100dvh" }}>
      <div className="flex flex-col items-center w-full">
        {/* Header */}
        <div className="flex flex-col items-center justify-center gap-0.5 py-3 w-full max-w-screen-sm">
          <Image src="/icons/waggly-logo-white.svg" alt="Waggly" width={101} height={32} />
          <p className="text-sm font-bold text-white">ゴルフクラブカタログ</p>
        </div>

        {/* Title bar */}
        <div className="px-5 py-3 w-full max-w-screen-sm bg-black/20">
          <h1 className="text-[15px] font-extrabold text-white">メーカー一覧</h1>
          <p className="text-xs text-white/70 mt-0.5">メーカーを選択してスペックを確認</p>
        </div>

        {/* Banner */}
        <PromoBanner />

        {/* Content */}
        <div className="w-full max-w-screen-sm px-3 py-4">
          {makers.length === 0 ? (
            <p className="text-sm text-white/70">カタログデータがありません</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {makers.map((maker) => (
                <Link
                  key={maker.maker_slug}
                  href={`/catalog/${maker.maker_slug}`}
                  className="flex items-center justify-center rounded-md bg-white px-4 py-4 text-center font-bold text-[#222] hover:bg-[#f5f5f5] transition-colors"
                >
                  {maker.maker}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
