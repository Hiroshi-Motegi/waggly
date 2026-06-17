"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";

// --- Types ---

interface SeriesWithModels {
  id: string;
  maker: string;
  name: string;
  maker_slug: string;
  name_slug: string;
  image_url: string | null;
  catalog_models?: Array<{
    id: string;
    name: string;
    category: string;
    category_slug: string;
  }>;
}

// --- Fetcher ---

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

// --- Page ---

export default function AdminCatalogPage() {
  const [maker, setMaker] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: seriesList = [], mutate } = useSWR<SeriesWithModels[]>(
    "/api/admin/catalog/series",
    fetcher
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!maker.trim() || !name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/catalog/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maker: maker.trim(), name: name.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "エラーが発生しました");
        return;
      }
      setMaker("");
      setName("");
      mutate();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 p-4">
      <AdminBreadcrumb items={[{ label: "カタログ管理" }]} />
      <h1 className="text-xl font-bold">カタログ管理</h1>

      {/* Add series form */}
      <div className="rounded-xl border border-[#e0e0e0] bg-white p-5">
        <h2 className="font-bold text-sm mb-4">シリーズ追加</h2>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#888]">メーカー名</label>
            <input
              value={maker}
              onChange={(e) => setMaker(e.target.value)}
              placeholder="例: PING"
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm w-40"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#888]">シリーズ名</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: G430"
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm w-48"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="h-9 rounded-md bg-[#006728] px-4 text-sm font-bold text-white hover:bg-[#005520] disabled:opacity-50"
          >
            {submitting ? "追加中..." : "追加"}
          </button>
        </form>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {/* Series list */}
      <div>
        <h2 className="font-bold text-sm mb-3">シリーズ一覧（{seriesList.length}件）</h2>
        {seriesList.length === 0 ? (
          <p className="text-sm text-[#888]">シリーズがありません</p>
        ) : (
          <div className="space-y-2">
            {seriesList.map((series) => (
              <div
                key={series.id}
                className="rounded-xl border border-[#e0e0e0] bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-[#888]">{series.maker}</p>
                    <p className="font-bold text-sm">{series.name}</p>
                    <p className="text-[11px] text-[#aaa] font-mono mt-0.5">
                      {series.maker_slug}/{series.name_slug}
                    </p>
                  </div>
                  <Link
                    href={`/catalog/${series.maker_slug}/${series.name_slug}`}
                    target="_blank"
                    className="shrink-0 text-xs text-[#006728] hover:underline"
                  >
                    公開ページ ↗
                  </Link>
                </div>
                {series.catalog_models && series.catalog_models.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {series.catalog_models.map((m) => (
                      <span
                        key={m.id}
                        className="inline-block rounded border border-[#e0e0e0] bg-[#f5f5f5] px-2 py-0.5 text-[11px] text-[#555]"
                      >
                        {m.name || m.category}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
