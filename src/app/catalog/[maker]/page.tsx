import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getSeriesByMaker } from "@/lib/catalog";

export const revalidate = 86400;

export async function generateMetadata({ params }: { params: Promise<{ maker: string }> }) {
  const { maker } = await params;
  const series = await getSeriesByMaker(maker);
  if (series.length === 0) return {};
  const makerName = series[0].maker;
  return {
    title: `${makerName}のゴルフクラブカタログ | Waggly`,
    description: `${makerName}の全シリーズスペックカタログ。`,
  };
}

export default async function MakerPage({ params }: { params: Promise<{ maker: string }> }) {
  const { maker } = await params;
  const series = await getSeriesByMaker(maker);

  if (series.length === 0) {
    notFound();
  }

  const makerName = series[0].maker;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <nav className="text-xs text-[#888] mb-4 flex gap-1">
          <Link href="/catalog" className="hover:text-[#006728]">カタログ</Link>
          <span>/</span>
          <span>{makerName}</span>
        </nav>

        <h1 className="text-2xl font-bold text-[#222] mb-6">{makerName} シリーズ一覧</h1>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {series.map((s) => (
            <Link
              key={s.id}
              href={`/catalog/${s.maker_slug}/${s.name_slug}`}
              className="group block rounded-xl border border-[#e0e0e0] bg-white overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-video relative bg-[#f5f5f5]">
                {s.image_url ? (
                  <Image
                    src={s.image_url}
                    alt={`${s.maker} ${s.name}`}
                    fill
                    className="object-contain p-2"
                    sizes="(max-width: 640px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[#bbb] text-xs">
                    No Image
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="font-bold text-sm text-[#222] group-hover:text-[#006728]">{s.name}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
