import Image from "next/image";
import Link from "next/link";
import { PromoBanner } from "@/components/catalog/promo-banner";
import { CompareSearchGlobal } from "@/components/catalog/compare-search-global";
import { RecentComparesAll } from "@/components/catalog/recent-compares-all";
import { getModelsByCategory, compareModelSlug } from "@/lib/catalog";

export const revalidate = 86400;

export const metadata = {
  title: "ゴルフクラブ スペック比較 | Waggly",
  description:
    "ドライバー・FW・UT・アイアン・ウェッジ・パターのスペックを2モデル並べて比較。番手別ロフト角・ライ角・長さなどを一目で確認できます。",
};

const CATEGORIES = [
  { key: "driver", label: "ドライバー", img: "/no-images/driver.png" },
  { key: "fairway_wood", label: "フェアウェイウッド", img: "/no-images/fw.png" },
  { key: "utility", label: "ユーティリティ", img: "/no-images/ut.png" },
  { key: "iron", label: "アイアン", img: "/no-images/Iron.png" },
  { key: "wedge", label: "ウェッジ", img: "/no-images/wedge.png" },
  { key: "putter", label: "パター", img: "/no-images/putter.png" },
] as const;

export default async function CompareTopPage() {
  // Get models per category (single pass)
  const categoryData = await Promise.all(
    CATEGORIES.map(async (cat) => {
      const models = await getModelsByCategory(cat.key);
      return { ...cat, models };
    })
  );

  const counts = categoryData.map((c) => ({ ...c, modelCount: c.models.length }));
  const totalModels = counts.reduce((sum, c) => sum + c.modelCount, 0);

  const allModelOptions = categoryData.flatMap((cat) =>
    cat.models.map((m) => ({
      slug: compareModelSlug(m),
      category: cat.key,
      label: `${m.maker} ${m.name}`,
      makerSlug: m.maker_slug,
    }))
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Waggly", item: "https://waggly.jp" },
      { "@type": "ListItem", position: 2, name: "ゴルフクラブ比較", item: "https://waggly.jp/compare" },
    ],
  };

  return (
    <div className="relative min-h-screen" style={{ minHeight: "100dvh" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex flex-col items-center w-full">
        {/* Header */}
        <div className="flex items-center w-full max-w-screen-sm py-3 px-3 relative">
          <Link href="/" className="absolute left-3 p-1 text-white/70 hover:text-white transition-colors">
            <svg width="10" height="18" viewBox="0 0 10 18" fill="none"><path d="M9 1L1 9L9 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
          <Image src="/icons/waggly-logo-white.svg" alt="Waggly" width={101} height={32} className="mx-auto" />
          <Link href="/login" className="absolute right-3 text-xs text-white/70 hover:text-white transition-colors">ログイン</Link>
        </div>

        <div className="w-full bg-black/40 py-3">
          <h1 className="text-sm font-bold text-white text-center">ゴルフクラブ比較</h1>
        </div>

        {/* Search */}
        <div className="w-full max-w-screen-sm px-3 pt-4">
          <CompareSearchGlobal models={allModelOptions} />
        </div>

        {/* Category cards */}
        <div className="w-full max-w-screen-sm px-3 pt-4 pb-2">
          <div className="grid grid-cols-2 gap-3">
            {counts.map((cat) => (
              <Link
                key={cat.key}
                href={`/compare/${cat.key}`}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-5 shadow-sm transition-transform active:scale-[0.97]"
              >
                <Image src={cat.img} alt={cat.label} width={56} height={56} className="object-contain" />
                <span className="text-base font-bold text-[#006728]">{cat.label}</span>
                {cat.modelCount > 0 && (
                  <span className="text-xs text-[#888]">{cat.modelCount}モデル</span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Recent compares */}
        <RecentComparesAll />

        {/* How to use */}
        <div className="w-full max-w-screen-sm px-3 pt-4">
          <div className="rounded-xl bg-white/10 p-4">
            <h2 className="text-base font-bold text-white mb-2">使い方</h2>
            <ol className="text-sm text-white/80 space-y-1.5 list-decimal list-inside">
              <li>カテゴリを選択</li>
              <li>比較したい2モデルを検索・選択</li>
              <li>番手別スペックを並べて比較</li>
            </ol>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="w-full max-w-screen-sm px-4 py-6 text-left text-xs text-white leading-relaxed">
          ※ スペック・関連情報の収集にはAIを利用しており、内容が正確でない場合があります。正確な情報はメーカー公式サイトをご確認ください。
        </p>

        <PromoBanner />
      </div>
    </div>
  );
}
