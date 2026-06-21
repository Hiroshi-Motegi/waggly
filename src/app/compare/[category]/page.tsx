import { getModelsByCategory, compareModelSlug } from "@/lib/catalog";
import { PromoBanner } from "@/components/catalog/promo-banner";
import { PublicPageLayout } from "@/components/layout/public-page-layout";
import { CompareSearch } from "@/components/catalog/compare-search";
import { RecentCompares } from "@/components/catalog/recent-compares";

export const revalidate = 86400;

const CATEGORY_LABELS: Record<string, string> = {
  driver: "ドライバー",
  fairway_wood: "フェアウェイウッド",
  utility: "ユーティリティ",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const label = CATEGORY_LABELS[category] ?? category;
  return {
    title: `${label} スペック比較一覧 | Waggly`,
    description: `${label}の2モデル比較。番手別スペックを並べて確認できます。`,
  };
}

export default async function CompareIndexPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const models = await getModelsByCategory(category);
  const label = CATEGORY_LABELS[category] ?? category;

  // Model options for search
  const modelOptions = models.map((m) => ({
    slug: compareModelSlug(m),
    label: `${m.maker} ${m.name}`,
    makerSlug: m.maker_slug,
  }));


  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Waggly", item: "https://waggly.jp" },
      { "@type": "ListItem", position: 2, name: "ゴルフクラブ比較", item: "https://waggly.jp/compare" },
      { "@type": "ListItem", position: 3, name: `${label}比較`, item: `https://waggly.jp/compare/${category}` },
    ],
  };

  return (
    <PublicPageLayout title={`${label} スペック比較`} backHref="/compare">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="w-full max-w-screen-sm pt-4">
        <CompareSearch category={category} models={modelOptions} />
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

      <RecentCompares category={category} />

      <p className="w-full max-w-screen-sm py-6 text-left text-xs text-white leading-relaxed">
        ※ スペック・関連情報の収集にはAIを利用しており、内容が正確でない場合があります。正確な情報はメーカー公式サイトをご確認ください。
      </p>

      <PromoBanner />
    </PublicPageLayout>
  );
}
