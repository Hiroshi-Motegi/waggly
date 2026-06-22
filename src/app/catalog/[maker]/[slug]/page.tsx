import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PublicPageLayout } from "@/components/layout/public-page-layout";
import { getModelDetail, getModelsByCategory, compareModelSlug } from "@/lib/catalog";
import { fetchRelatedNews } from "@/lib/catalog-news";
import { SpecTable } from "@/components/catalog/spec-table";
import { ShaftInfoTable } from "@/components/catalog/shaft-info-table";
import { GripInfoTable } from "@/components/catalog/grip-info-table";
import { PromoBanner } from "@/components/catalog/promo-banner";
import { FavoriteClubButton } from "@/components/catalog/favorite-club-button";
import { AlpenAdImage } from "@/components/catalog/alpen-ad-image";
import { AlpenBuyLink } from "@/components/catalog/alpen-buy-link";
import { EventTracker } from "@/components/event-tracker";
import Markdown from "react-markdown";
import { deserializeGrips, deserializeGripNames, isGripAttr } from "@/lib/grip-utils";
import type { CatalogShaft } from "@/lib/catalog";

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
  const compareLinks = otherModels.slice(0, 3).map((other) => {
    const otherSlug = compareModelSlug(other);
    const [slugA, slugB] = [mySlug, otherSlug].sort();
    return {
      href: `/compare/${model.category}/${slugA}-vs-${slugB}`,
      label: `${other.maker} ${other.name}`,
      otherMaker: other.maker,
      otherName: other.name,
    };
  });

  // Shaft info from linked_shafts
  const shaftInfo = model.linked_shafts ?? [];

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
    <PublicPageLayout title="ゴルフクラブカタログ" backFallbackHref={`/catalog/${maker}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <EventTracker event="catalog_viewed" params={{ maker: model.maker, model: model.name, category: model.category }} />

        {/* Model header card */}
        <div className="w-full max-w-screen-sm">
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

            {/* Model images */}
            {model.catalog_model_images?.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {model.catalog_model_images.map((img) => (
                  <div key={img.id} className="relative w-24 h-24 shrink-0 bg-[#f5f5f5] rounded-lg overflow-hidden">
                    <Image
                      src={img.image_url}
                      alt={`${model.maker} ${model.name}`}
                      fill
                      className="object-contain p-1"
                      sizes="96px"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Description */}
            {model.description && (
              <p className="mt-2 text-sm text-[#555] leading-relaxed">{model.description}</p>
            )}

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

            {/* Purchase links */}
            {model.catalog_model_links?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#e5e5e5] flex flex-wrap gap-2">
                {model.catalog_model_links.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-[#006728] px-4 py-2 text-xs font-bold text-white hover:bg-[#005520] transition-colors"
                  >
                    {link.label}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                ))}
              </div>
            )}

          </div>
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

        {/* ── Group: スペック ── */}
        {(model.catalog_specs.length > 0 || deserializeGrips(model.catalog_model_attributes ?? []).length > 0) && (
          <div className="w-full max-w-screen-sm pt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/30" />
            <span className="text-base font-bold text-white tracking-wider">スペック</span>
            <div className="h-px flex-1 bg-white/30" />
          </div>
        )}

        {/* Spec table */}
        {model.catalog_specs.length > 0 && (
          <div className="w-full max-w-screen-sm pt-4">
            <div className="rounded-md overflow-hidden">
              <SpecTable specs={model.catalog_specs} category={model.category} />
            </div>
          </div>
        )}

        {/* Grip info */}
        {(() => {
          const gripData = deserializeGrips(model.catalog_model_attributes ?? []);
          if (gripData.length === 0) return null;
          return (
            <div className="w-full max-w-screen-sm pt-4">
              <div className="rounded-md bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-bold text-white bg-[#006728]">グリップ</th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-white bg-[#006728]">サイズ</th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-white bg-[#006728]">重量(g)</th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-white bg-[#006728]">素材</th>
                      <th className="px-3 py-2 text-center text-xs font-bold text-white bg-[#006728]">BL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gripData.map((grip, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#f5faf7]"}>
                        <td className="px-3 py-2 text-xs text-[#333] font-medium">{grip.name}</td>
                        <td className="px-3 py-2 text-xs text-[#444] text-center">{grip.size || "—"}</td>
                        <td className="px-3 py-2 text-xs text-[#444] text-center">{grip.weight || "—"}</td>
                        <td className="px-3 py-2 text-xs text-[#444] text-center">{grip.material || "—"}</td>
                        <td className="px-3 py-2 text-xs text-[#444] text-center">{grip.backline || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* ── Group: オプション ── */}
        {((model.linked_grips ?? []).length > 0 || shaftInfo.length > 0) && (
          <div className="w-full max-w-screen-sm pt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/30" />
            <span className="text-base font-bold text-white tracking-wider">オプション</span>
            <div className="h-px flex-1 bg-white/30" />
          </div>
        )}

        {/* Shaft info */}
        {shaftInfo.length > 0 && (
          <div className="w-full max-w-screen-sm pt-4">
            <div className="rounded-md overflow-hidden">
              <ShaftInfoTable shafts={shaftInfo} />
            </div>
          </div>
        )}

        {/* Grip info from master */}
        {(model.linked_grips ?? []).length > 0 && (
          <div className="w-full max-w-screen-sm pt-4">
            <div className="rounded-md overflow-hidden">
              <GripInfoTable grips={model.linked_grips} />
            </div>
          </div>
        )}

        {/* Model attributes */}
        {(() => {
          const filteredAttrs = (model.catalog_model_attributes ?? []).filter((a) => !isGripAttr(a.label));
          if (filteredAttrs.length === 0) return null;
          return (
          <>
          <div className="w-full max-w-screen-sm pt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/30" />
            <span className="text-base font-bold text-white tracking-wider">その他</span>
            <div className="h-px flex-1 bg-white/30" />
          </div>
          <div className="w-full max-w-screen-sm pt-4">
            <div className="rounded-md bg-white overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {filteredAttrs.map((attr, i) => (
                    <tr key={attr.id} className={i % 2 === 0 ? "bg-white" : "bg-[#f5faf7]"}>
                      {attr.label ? (
                        <>
                          <td className="px-3 py-2 text-xs font-medium text-[#333] whitespace-nowrap border-r border-[#e0e0e0] w-[120px]">
                            {attr.label}
                          </td>
                          <td className="px-3 py-2 text-xs text-[#444] [&_p]:m-0 [&_a]:text-[#006728] [&_a]:underline [&_h1]:text-xs [&_h1]:font-bold [&_h2]:text-xs [&_h2]:font-bold [&_h3]:text-xs [&_h3]:font-bold [&_ul]:mt-0 [&_ul]:mb-2 [&_ul]:pl-4 [&_ul]:list-disc [&_ol]:mt-0 [&_ol]:mb-2 [&_ol]:pl-4 [&_ol]:list-decimal">
                            <Markdown>{attr.value}</Markdown>
                          </td>
                        </>
                      ) : (
                        <td colSpan={2} className="px-3 py-2 text-xs text-[#444] [&_p]:m-0 [&_a]:text-[#006728] [&_a]:underline [&_h1]:text-xs [&_h1]:font-bold [&_h2]:text-xs [&_h2]:font-bold [&_h3]:text-xs [&_h3]:font-bold [&_ul]:mt-0 [&_ul]:mb-2 [&_ul]:pl-4 [&_ul]:list-disc [&_ol]:mt-0 [&_ol]:mb-2 [&_ol]:pl-4 [&_ol]:list-decimal">
                          <Markdown>{attr.value}</Markdown>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </>
          );
        })()}

        {/* Alpen buy link */}
        {model.alpen_pid && (
          <div className="w-full max-w-screen-sm pt-4">
            <div className="rounded-md bg-white p-4 flex items-center gap-4">
              <AlpenAdImage
                alpenPid={model.alpen_pid}
                alt={`${model.maker} ${model.name}`}
                className="w-20 h-20 shrink-0"
              />
              <div className="flex-1">
                <AlpenBuyLink alpenPid={model.alpen_pid} />
              </div>
            </div>
          </div>
        )}

        {/* Related news */}
        {news.length > 0 && (
          <div className="w-full max-w-screen-sm pt-4">
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
          <>
          <div className="w-full max-w-screen-sm pt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/30" />
            <span className="text-base font-bold text-white tracking-wider">比較</span>
            <div className="h-px flex-1 bg-white/30" />
          </div>
          <p className="w-full max-w-screen-sm pt-2 text-xs text-white text-center">{model.name} と他のクラブを比較してみよう</p>
          <div className="w-full max-w-screen-sm pt-2 px-2">
            <div className="flex flex-col gap-1">
              {compareLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-1.5 py-1.5 group"
                >
                  <div className="flex flex-1 items-center gap-1.5 min-w-0">
                    <div className="flex-1 rounded-md bg-white border border-[#e9e9e9] px-3 py-2 min-w-0">
                      <p className="text-[10px] text-[#6b6b6b] leading-tight">{model.maker}</p>
                      <p className="text-xs font-bold text-[#006728] leading-tight truncate">{model.name}</p>
                    </div>
                    <span className="text-[10px] font-bold text-white shrink-0">VS</span>
                    <div className="flex-1 rounded-md bg-white border border-[#e9e9e9] px-3 py-2 min-w-0">
                      <p className="text-[10px] text-[#6b6b6b] leading-tight">{link.otherMaker}</p>
                      <p className="text-xs font-bold text-[#006728] leading-tight truncate">{link.otherName}</p>
                    </div>
                  </div>
                  <svg className="w-2 h-3 text-white/60 shrink-0 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 8 14"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 1l6 6-6 6" /></svg>
                </Link>
              ))}
            </div>
          </div>
          </>
        )}

        {/* Update date + Disclaimer */}
        <div className="w-full max-w-screen-sm mt-6 rounded-md bg-black/40 px-4 py-6 space-y-3">
          {model.spec_updated_at && (
            <p className="text-sm text-white text-center">
              情報更新日: {new Date(model.spec_updated_at).toLocaleDateString("ja-JP")}
            </p>
          )}
          <p className="text-xs text-white leading-relaxed">
            ※ スペック・関連情報の収集にはAIを利用しており、内容が正確でない場合があります。正確な情報はメーカー公式サイトをご確認ください。
          </p>
        </div>

      <PromoBanner />
    </PublicPageLayout>
  );
}
