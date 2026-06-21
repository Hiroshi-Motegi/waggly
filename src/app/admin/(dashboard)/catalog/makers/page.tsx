"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { type ColumnDef, type SortingState } from "@tanstack/react-table";
import { AdminTable } from "@/components/admin/admin-table";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { BulkActionBar } from "@/components/admin/bulk-action-bar";
import { apiFetch } from "@/lib/api-client";

interface Maker {
  id: string;
  name: string;
  name_ja: string | null;
  slug: string;
  sort_order: number;
  is_visible: boolean;
  image_url: string | null;
  catalog_models: [{ count: number }];
}

function MakerList() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: makers = [], mutate } = useSWR<Maker[]>(
    "/api/admin/catalog/makers",
    async (url: string) => {
      const res = await apiFetch(url);
      return res.ok ? res.json() : [];
    }
  );

  async function handleSortMove(id: string, direction: -1 | 1) {
    const idx = makers.findIndex((m) => m.id === id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= makers.length) return;
    await Promise.all([
      apiFetch("/api/admin/catalog/makers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: makers[idx].id, sort_order: makers[swapIdx].sort_order }),
      }),
      apiFetch("/api/admin/catalog/makers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: makers[swapIdx].id, sort_order: makers[idx].sort_order }),
      }),
    ]);
    mutate();
  }

  async function handleToggleVisible(maker: Maker) {
    await apiFetch("/api/admin/catalog/makers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: maker.id, is_visible: !maker.is_visible }),
    });
    mutate();
  }

  async function handleBulkVisible(isVisible: boolean) {
    await Promise.all([...selected].map((id) =>
      apiFetch("/api/admin/catalog/makers", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_visible: isVisible }),
      })
    ));
    setSelected(new Set()); mutate();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  const columns: ColumnDef<Maker>[] = [
    {
      id: "select",
      header: () => (
        <input type="checkbox"
          checked={selected.size === makers.length && makers.length > 0}
          onChange={() => setSelected(selected.size === makers.length ? new Set() : new Set(makers.map((m) => m.id)))}
        />
      ),
      enableSorting: false,
      cell: ({ row }) => (
        <input type="checkbox" checked={selected.has(row.original.id)}
          onChange={() => toggleSelect(row.original.id)} onClick={(e) => e.stopPropagation()} />
      ),
    },
    {
      id: "sort",
      header: "順",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex gap-1">
          <button onClick={() => handleSortMove(row.original.id, -1)} className="text-xs text-[#888] hover:text-black">↑</button>
          <button onClick={() => handleSortMove(row.original.id, 1)} className="text-xs text-[#888] hover:text-black">↓</button>
        </div>
      ),
    },
    {
      id: "image",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="w-8 h-8 rounded border border-[#e5e5e5] bg-[#f5f5f5] overflow-hidden">
          {row.original.image_url ? (
            <img src={row.original.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="flex items-center justify-center h-full text-[8px] text-[#ccc]">-</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: "名前",
      enableSorting: false,
      cell: ({ row }) => (
        <Link href={`/admin/catalog/makers/${row.original.id}`} className="font-medium text-[#006728] hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "name_ja",
      header: "日本語名",
      enableSorting: false,
      cell: ({ getValue }) => <span className="text-xs text-[#555]">{(getValue() as string) ?? "-"}</span>,
    },
    {
      accessorKey: "slug",
      header: "Slug",
      enableSorting: false,
      cell: ({ getValue }) => <span className="text-xs font-mono text-[#888]">{getValue() as string}</span>,
    },
    {
      id: "model_count",
      header: "モデル数",
      enableSorting: false,
      cell: ({ row }) => <span className="text-xs">{row.original.catalog_models?.[0]?.count ?? 0}</span>,
    },
    {
      accessorKey: "is_visible",
      header: "表示",
      enableSorting: false,
      cell: ({ row }) => (
        <button
          onClick={() => handleToggleVisible(row.original)}
          className={`text-[11px] font-bold ${row.original.is_visible ? "text-[#006728]" : "text-[#999]"}`}
        >
          {row.original.is_visible ? "公開" : "非公開"}
        </button>
      ),
    },
    {
      id: "actions",
      header: "操作",
      enableSorting: false,
      cell: ({ row }) => (
        <Link
          href={`/admin/catalog/makers/${row.original.id}`}
          className="text-xs text-[#006728] hover:underline font-bold"
        >
          編集
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4 p-4">
      <AdminBreadcrumb items={[{ label: "カタログ", href: "/admin/catalog" }, { label: "メーカー管理" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          メーカー管理 <span className="text-base font-normal text-[#888]">({makers.length}件)</span>
        </h1>
        <Link
          href="/admin/catalog/makers/new"
          className="rounded bg-[#006728] px-4 py-2 text-sm font-bold text-white hover:bg-[#005520]"
        >
          ＋ 新規追加
        </Link>
      </div>

      <BulkActionBar count={selected.size} actions={[
        { label: "公開にする", onClick: () => handleBulkVisible(true) },
        { label: "非公開にする", onClick: () => handleBulkVisible(false) },
      ]} onClear={() => setSelected(new Set())} />

      <AdminTable<Maker>
        data={makers}
        columns={columns}
        total={makers.length}
        page={1}
        pageSize={1000}
        sorting={sorting}
        onSortingChange={setSorting}
        onPageChange={() => {}}
      />
    </div>
  );
}

export default function MakersPage() {
  return (
    <Suspense>
      <MakerList />
    </Suspense>
  );
}
