import Link from "next/link";
import Image from "next/image";
import type { CatalogModel } from "@/lib/catalog";

const CATEGORY_LABELS: Record<string, string> = {
  driver: "ドライバー",
  fairway_wood: "フェアウェイウッド",
  utility: "ユーティリティ",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};

interface ModelCardProps {
  model: CatalogModel;
}

export function ModelCard({ model }: ModelCardProps) {
  const href = `/catalog/${model.maker_slug}/${model.slug}`;
  const categoryLabel = CATEGORY_LABELS[model.category] ?? model.category;

  return (
    <Link href={href} className="group block rounded-xl border border-[#e0e0e0] bg-white overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-video relative bg-[#f5f5f5]">
        {(model.alpen_pid || model.image_url) ? (
          <Image
            src={model.alpen_pid
              ? `https://img.alpen-group.jp/Contents/ProductImages/0/${model.alpen_pid}_L.jpg`
              : model.image_url!}
            alt={`${model.maker} ${model.name}`}
            fill
            className="object-contain p-2"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized={!!model.alpen_pid}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[#bbb] text-xs">
            No Image
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-[#888] mb-0.5">{model.maker}</p>
        <p className="font-bold text-sm text-[#222] group-hover:text-[#006728] leading-tight">
          {model.name}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="inline-block rounded-full bg-[#e6f2eb] px-2 py-0.5 text-[11px] font-medium text-[#006728]">
            {categoryLabel}
          </span>
          {model.price !== null && (
            <span className="text-xs text-[#555]">
              ¥{model.price.toLocaleString("ja-JP")}〜
            </span>
          )}
        </div>
        {model.release_year && (
          <p className="mt-1 text-[11px] text-[#aaa]">{model.release_year}年発売</p>
        )}
      </div>
    </Link>
  );
}
