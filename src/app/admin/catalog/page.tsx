"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";

interface CatalogModelAdmin {
  id: string;
  name: string;
  maker: string;
  maker_slug: string;
  category: string;
  slug: string;
  catalog_specs: [{ count: number }];
}

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

export default function AdminCatalogPage() {
  const { data: models = [] } = useSWR<CatalogModelAdmin[]>(
    "/api/admin/catalog/models",
    fetcher
  );

  // Group by maker
  const byMaker = new Map<string, CatalogModelAdmin[]>();
  for (const m of models) {
    if (!byMaker.has(m.maker_slug)) byMaker.set(m.maker_slug, []);
    byMaker.get(m.maker_slug)!.push(m);
  }
  const makers = [...byMaker.entries()].sort((a, b) =>
    (a[1][0]?.maker ?? "").localeCompare(b[1][0]?.maker ?? "", "ja")
  );

  return (
    <div className="space-y-6 p-4">
      <AdminBreadcrumb items={[{ label: "カタログ管理" }]} />
      <h1 className="text-xl font-bold">カタログ管理</h1>
      <p className="text-sm text-[#888]">
        {models.length}モデル / {makers.length}メーカー
      </p>

      {makers.length === 0 ? (
        <p className="text-sm text-[#888]">モデルがありません</p>
      ) : (
        <div className="space-y-4">
          {makers.map(([makerSlug, makerModels]) => (
            <div key={makerSlug} className="rounded-xl border border-[#e0e0e0] bg-white p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-bold text-sm">{makerModels[0].maker}</p>
                  <p className="text-[11px] text-[#aaa] font-mono">{makerSlug}</p>
                </div>
                <Link
                  href={`/catalog/${makerSlug}`}
                  target="_blank"
                  className="shrink-0 text-xs text-[#006728] hover:underline"
                >
                  公開ページ ↗
                </Link>
              </div>
              <div className="flex flex-wrap gap-1">
                {makerModels.map((m) => (
                  <Link
                    key={m.id}
                    href={`/catalog/${m.maker_slug}/${m.slug}`}
                    target="_blank"
                    className="inline-block rounded border border-[#e0e0e0] bg-[#f5f5f5] px-2 py-0.5 text-[11px] text-[#555] hover:bg-[#eee]"
                  >
                    {m.name} ({m.category})
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
