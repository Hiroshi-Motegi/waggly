import Link from "next/link";
import { getMakers } from "@/lib/catalog";

export const revalidate = 86400;

export const metadata = {
  title: "ゴルフクラブカタログ | Waggly",
  description: "メーカー別ゴルフクラブスペックカタログ。ロフト角・ライ角・クラブ長さなど詳細スペックを確認できます。",
};

export default async function CatalogPage() {
  const makers = await getMakers();

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[#222] mb-2">ゴルフクラブカタログ</h1>
        <p className="text-sm text-[#666] mb-8">メーカーを選択してスペックを確認できます</p>

        {makers.length === 0 ? (
          <p className="text-sm text-[#888]">カタログデータがありません</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {makers.map((maker) => (
              <Link
                key={maker.maker_slug}
                href={`/catalog/${maker.maker_slug}`}
                className="flex items-center justify-center rounded-xl border border-[#e0e0e0] bg-white px-4 py-5 text-center font-bold text-[#222] hover:border-[#006728] hover:text-[#006728] hover:shadow-sm transition-all"
              >
                {maker.maker}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
