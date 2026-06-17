import Link from "next/link";
import { notFound } from "next/navigation";
import { getModelsBySeries } from "@/lib/catalog";
import { ModelCard } from "@/components/catalog/model-card";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ maker: string; series: string }>;
}) {
  const { maker, series } = await params;
  const models = await getModelsBySeries(maker, series);
  if (models.length === 0) return {};
  const { catalog_series: s } = models[0];
  return {
    title: `${s.maker} ${s.name} スペックカタログ | Waggly`,
    description: `${s.maker} ${s.name}のゴルフクラブスペック一覧。`,
  };
}

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ maker: string; series: string }>;
}) {
  const { maker, series } = await params;
  const models = await getModelsBySeries(maker, series);

  if (models.length === 0) {
    notFound();
  }

  const { catalog_series: catalogSeries } = models[0];

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <nav className="text-xs text-[#888] mb-4 flex gap-1">
          <Link href="/catalog" className="hover:text-[#006728]">カタログ</Link>
          <span>/</span>
          <Link href={`/catalog/${maker}`} className="hover:text-[#006728]">{catalogSeries.maker}</Link>
          <span>/</span>
          <span>{catalogSeries.name}</span>
        </nav>

        <h1 className="text-2xl font-bold text-[#222] mb-6">
          {catalogSeries.maker} {catalogSeries.name}
        </h1>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {models.map((model) => (
            <ModelCard key={model.id} model={model} series={catalogSeries} />
          ))}
        </div>
      </div>
    </div>
  );
}
