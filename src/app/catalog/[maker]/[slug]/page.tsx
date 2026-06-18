import Link from "next/link";
import Image from "next/image";
import { BackButton } from "@/components/layout/back-button";
import { notFound } from "next/navigation";
import { getModelDetail, getModelsByCategory, compareModelSlug } from "@/lib/catalog";
import { fetchRelatedNews } from "@/lib/catalog-news";
import { SpecTable } from "@/components/catalog/spec-table";
import { PromoBanner } from "@/components/catalog/promo-banner";
import { FavoriteClubButton } from "@/components/catalog/favorite-club-button";
import { AlpenAdImage } from "@/components/catalog/alpen-ad-image";
import { AlpenBuyLink } from "@/components/catalog/alpen-buy-link";

export const revalidate = 86400;

const CATEGORY_LABELS: Record<string, string> = {
  driver: "ドライバー",
  fairway_wood: "フェアウェイウッド",
  utility: "ユーティリティ",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ maker: string; slug: string }>;
}) {
  const { maker, slug } = await params;
  const model = await getModelDetail(maker, slug);
  if (!model) return {};
  const categoryLabel = CATEGORY_LABELS[model.category] ?? model.category;
  return {
    title: `${model.maker} ${model.name} スペック`,
    description: `${model.maker} ${model.name}のスペック詳細。ロフト角・ライ角・クラブ長さなど番手別スペックを掲載。`,
    openGraph: {
      title: `${model.maker} ${model.name} スペック`,
      description: `${model.maker} ${model.name}の詳細スペック`,
    },
  };
}

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ maker: string; slug: string }>;
}) {
  const { maker, slug } = await params;
  const model = await getModelDetail(maker, slug);

  if (!model) {
    notFound();
  }

  const categoryLabel = CATEGORY_LABELS[model.category] ?? model.category;

  // Fetch other models in the same category for compare links
  const categoryModels = await getModelsByCategory(model.category);
  const otherModels = categoryModels.filter((m) => m.id !== model.id);

  // Generate compare links (sort slugs alphabetically)
  const mySlug = compareModelSlug(model);
  const compareLinks = otherModels.slice(0, 8).map((other) => {
    const otherSlug = compareModelSlug(other);
    const [slugA, slugB] = [mySlug, otherSlug].sort();
    return {
      href: `/compare/${model.category}/${slugA}-vs-${slugB}`,
      label: `${other.maker} ${other.name}`,
    };
  });

  // Fetch related news
  const news = await fetchRelatedNews(`${model.name} ${categoryLabel}`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Waggly", item: "https://waggly.jp" },
      { "@type": "ListItem", position: 2, name: "ゴルフクラブカタログ", item: "https://waggly.jp/catalog" },
      { "@type": "ListItem", position: 3, name: model.maker, item: `https://waggly.jp/catalog/${maker}` },
      { "@type": "ListItem", position: 4, name: `${model.name} ${categoryLabel}` },
    ],
  };

  return (
    <div className="relative min-h-screen" style={{ minHeight: "100dvh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="flex flex-col items-center w-full">
        {/* Header */}
        <div className="flex items-center justify-center w-full max-w-screen-sm relative py-3">
          <BackButton fallbackHref={`/catalog/${maker}`} />
          <div className="flex flex-col items-center gap-0.5">
            <Image src="/icons/waggly-logo-white.svg" alt="Waggly" width={101} height={32} />
            <p className="text-sm font-bold text-white">ゴルフクラブカタログ</p>
          </div>
        </div>

        {/* Banner */}
        <PromoBanner />

        {/* Model header card */}
        <div className="w-full max-w-screen-sm px-3 pt-4">
          <div className="rounded-md bg-white p-4 relative">
            <div className="absolute top-3 right-3">
              <FavoriteClubButton modelId={model.id} />
            </div>
            <div className="flex gap-4">
              {model.alpen_pid ? (
                <div className="relative w-20 h-20 shrink-0 bg-[#f5f5f5] rounded-lg overflow-hidden">
                  <AlpenAdImage
                    alpenPid={model.alpen_pid}
                    alt={`${model.maker} ${model.name}`}
                    className="w-full h-full"
                  />
                </div>
              ) : model.image_url ? (
                <div className="relative w-20 h-20 shrink-0 bg-[#f5f5f5] rounded-lg overflow-hidden">
                  <Image
                    src={model.image_url}
                    alt={`${model.maker} ${model.name}`}
                    fill
                    className="object-contain p-1"
                    sizes="80px"
                  />
                </div>
              ) : null}
              <div className="min-w-0">
                <p className="text-xs text-[#888] mb-0.5">{model.maker}</p>
                <h1 className="text-lg font-bold text-[#222] leading-tight">
                  {model.name}
                </h1>
                <span className="inline-block mt-1 rounded-full bg-[#e6f2eb] px-2 py-0.5 text-xs font-medium text-[#006728]">
                  {categoryLabel}
                </span>
              </div>
            </div>

            {/* Description */}

            {/* Basic info */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {model.release_year && (
                <div>
                  <span className="text-xs text-[#888]">発売年</span>
                  <p className="font-medium">
                    {model.release_year}年
                    {model.release_month ? `${model.release_month}月` : ""}
                  </p>
                </div>
              )}
              {model.price !== null && (
                <div>
                  <span className="text-xs text-[#888]">価格</span>
                  <p className="font-medium">
                    ¥{model.price.toLocaleString("ja-JP")}〜
                  </p>
                </div>
              )}
              {model.head_finish && (
                <div>
                  <span className="text-xs text-[#888]">フィニッシュ</span>
                  <p className="font-medium">{model.head_finish}</p>
                </div>
              )}
            </div>
            {model.head_material && (
              <div className="mt-2 text-sm">
                <span className="text-xs text-[#888]">ヘッド素材</span>
                <p className="font-medium">{model.head_material}</p>
              </div>
            )}
            {model.sle_rule !== null && (
              <div className="mt-2 text-sm">
                <span className="text-xs text-[#888]">SLEルール</span>
                <p className="font-medium">{model.sle_rule ? "適合" : "非適合"}</p>
              </div>
            )}

            {/* Shaft list */}
            {model.shaft_names && model.shaft_names.length > 0 && (
              <div className="mt-3">
                <span className="text-xs text-[#888] block mb-1">シャフト</span>
                <div className="flex flex-wrap gap-1">
                  {model.shaft_names.map((shaft) => (
                    <span
                      key={shaft}
                      className="inline-block rounded border border-[#ddd] px-2 py-0.5 text-xs text-[#555]"
                    >
                      {shaft}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Spec table */}
        {model.catalog_specs.length > 0 && (
          <div className="w-full max-w-screen-sm px-3 pt-4">
            <h2 className="text-sm font-bold text-white mb-2">スペック詳細</h2>
            <div className="rounded-md overflow-hidden">
              <SpecTable specs={model.catalog_specs} category={model.category} />
            </div>
          </div>
        )}

        {/* Alpen buy link */}
        {model.alpen_pid && (
          <div className="w-full max-w-screen-sm px-3 pt-4">
            <h2 className="text-sm font-bold text-white mb-2">購入する</h2>
            <div className="rounded-md bg-white p-4 flex flex-col items-center gap-3">
              <AlpenAdImage
                alpenPid={model.alpen_pid}
                alt={`${model.maker} ${model.name}`}
                className="w-full max-h-48"
              />
              <AlpenBuyLink alpenPid={model.alpen_pid} />
              <p className="text-xs text-[#888] text-center">アルペングループオンラインストア</p>
            </div>
          </div>
        )}

        {/* Related news */}
        {news.length > 0 && (
          <div className="w-full max-w-screen-sm px-3 pt-4">
            <h2 className="text-sm font-bold text-white mb-2">関連ニュース</h2>
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

        {/* Compare links */}
        {compareLinks.length > 0 && (
          <div className="w-full max-w-screen-sm px-3 pt-4">
            <h2 className="text-sm font-bold text-white mb-2">他モデルと比較する</h2>
            <div className="flex flex-wrap gap-2">
              {compareLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center rounded-full border border-white bg-[#17552f] px-3 py-1.5 text-xs font-medium text-white"
                >
                  {link.label} と比較
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="w-full max-w-screen-sm px-4 py-6 text-left text-xs text-white leading-relaxed">
          ※ スペック・関連情報の収集にはAIを利用しており、内容が正確でない場合があります。正確な情報はメーカー公式サイトをご確認ください。
        </p>
      </div>
    </div>
  );
}
