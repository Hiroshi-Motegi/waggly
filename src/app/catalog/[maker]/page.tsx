import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeriesByMaker } from "@/lib/catalog";
import { PromoBanner } from "@/components/catalog/promo-banner";

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
    <div className="relative min-h-screen" style={{ minHeight: "100dvh" }}>
      <div className="flex flex-col items-center w-full">
        {/* Header */}
        <div className="flex flex-col items-center justify-center gap-0.5 py-3 w-full max-w-screen-sm">
          <Image src="/icons/waggly-logo-white.svg" alt="Waggly" width={101} height={32} />
          <p className="text-sm font-bold text-white">ゴルフクラブカタログ</p>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center px-3 py-1 w-full max-w-screen-sm bg-black/20 border-b border-white/30 overflow-hidden">
          <p className="text-xs text-white truncate">
            <Link href="/catalog" className="underline">カタログ</Link>
            <span> / {makerName}</span>
          </p>
        </div>

        {/* Title bar */}
        <div className="px-5 py-3 w-full max-w-screen-sm bg-black/20">
          <h1 className="text-[15px] font-extrabold text-white">{makerName} シリーズ一覧</h1>
        </div>

        {/* Banner */}
        <PromoBanner />

        {/* Content */}
        <div className="w-full max-w-screen-sm px-3 py-4">
          <div className="grid grid-cols-2 gap-2">
            {series.map((s) => (
              <Link
                key={s.id}
                href={`/catalog/${s.maker_slug}/${s.name_slug}`}
                className="block rounded-md bg-white overflow-hidden"
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
                <div className="p-2.5">
                  <p className="font-bold text-sm text-[#006728]">{s.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
