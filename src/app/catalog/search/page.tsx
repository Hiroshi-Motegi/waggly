import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BackButton } from "@/components/layout/back-button";
import { getAllModels } from "@/lib/catalog";

export const revalidate = 86400;

const CATEGORY_LABELS: Record<string, string> = {
  driver: "ドライバー",
  fairway_wood: "FW",
  utility: "UT",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};

function fuzzyMatch(text: string, query: string) {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const lower = text.toLowerCase();
  return tokens.every((t) => lower.includes(t));
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return {
    title: q ? `「${q}」の検索結果 | Waggly` : "検索 | Waggly",
  };
}

export default async function CatalogSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let results: Awaited<ReturnType<typeof getAllModels>> = [];
  if (query.length >= 2) {
    const all = await getAllModels();
    results = all.filter((m) =>
      fuzzyMatch(`${m.maker} ${m.name}`, query)
    );
  }

  return (
    <div className="relative min-h-screen" style={{ minHeight: "100dvh" }}>
      <div className="flex flex-col items-center w-full">
        {/* Header */}
        <div className="flex items-center justify-center w-full max-w-screen-sm relative py-3">
          <BackButton fallbackHref="/catalog" />
          <div className="flex flex-col items-center gap-0.5">
            <Image src="/icons/waggly-logo-white.svg" alt="Waggly" width={101} height={32} />
            <p className="text-sm font-bold text-white">検索結果</p>
          </div>
        </div>

        {/* Query */}
        <div className="w-full max-w-screen-sm px-3 pt-2 pb-1">
          <p className="text-sm text-white">
            「<span className="font-bold">{query}</span>」{results.length > 0 ? `${results.length}件` : ""}
          </p>
        </div>

        {/* Results */}
        <div className="w-full max-w-screen-sm px-3 pt-2 pb-4">
          {results.length === 0 ? (
            <div className="rounded-lg bg-white p-4 text-center">
              <p className="text-sm text-[#8b8b8b]">
                {query.length < 2 ? "2文字以上で検索してください" : "該当するモデルが見つかりませんでした"}
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-white overflow-hidden">
              {results.map((m, i) => (
                <Link
                  key={m.id}
                  href={`/catalog/${m.maker_slug}/${m.slug}`}
                  className={`flex items-center justify-between px-4 py-3 ${i < results.length - 1 ? "border-b border-[#ececec]" : ""}`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-bold text-sm text-[#006728] truncate">{m.name}</span>
                    <span className="text-xs text-[#888]">
                      {m.maker} · {CATEGORY_LABELS[m.category] ?? m.category}
                    </span>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-[#bbb] rotate-180 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
