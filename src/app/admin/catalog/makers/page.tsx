"use client";

import { Suspense, useState } from "react";
import useSWR from "swr";
import { type ColumnDef, type SortingState } from "@tanstack/react-table";
import { AdminTable } from "@/components/admin/admin-table";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { AdminModal } from "@/components/admin/admin-modal";
import { apiFetch } from "@/lib/api-client";

interface Maker {
  id: string;
  name: string;
  name_ja: string | null;
  slug: string;
  sort_order: number;
  is_visible: boolean;
  catalog_models: [{ count: number }];
}

function MakerList() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Maker> | null>(null);

  const { data: makers = [], mutate } = useSWR<Maker[]>(
    "/api/admin/catalog/makers",
    async (url: string) => {
      const res = await apiFetch(url);
      return res.ok ? res.json() : [];
    }
  );

  async function handleSave() {
    if (!editing) return;
    const method = editing.id ? "PATCH" : "POST";
    await apiFetch("/api/admin/catalog/makers", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    setModalOpen(false);
    setEditing(null);
    mutate();
  }

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

  const columns: ColumnDef<Maker>[] = [
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
    { accessorKey: "name", header: "名前", enableSorting: false },
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
        <button
          onClick={() => { setEditing(row.original); setModalOpen(true); }}
          className="text-xs text-[#006728] hover:underline font-bold"
        >
          編集
        </button>
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
        <button
          onClick={() => { setEditing({}); setModalOpen(true); }}
          className="rounded bg-[#006728] px-4 py-2 text-sm font-bold text-white hover:bg-[#005520]"
        >
          ＋ 新規追加
        </button>
      </div>

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

      <AdminModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing?.id ? "メーカー編集" : "メーカー新規追加"}>
        {editing && (
          <div className="space-y-3">
            <label className="block text-xs font-bold text-[#555]">
              名前 *
              <input
                value={editing.name ?? ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-bold text-[#555]">
              日本語名
              <input
                value={editing.name_ja ?? ""}
                onChange={(e) => setEditing({ ...editing, name_ja: e.target.value || null })}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-bold text-[#555]">
              Slug *
              <input
                value={editing.slug ?? ""}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm font-mono"
              />
            </label>
            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} className="rounded bg-[#006728] px-6 py-2 text-sm font-bold text-white hover:bg-[#005520]">保存</button>
              <button onClick={() => { setModalOpen(false); setEditing(null); }} className="rounded border border-[#ddd] px-6 py-2 text-sm hover:bg-[#f5f5f5]">キャンセル</button>
            </div>
          </div>
        )}
      </AdminModal>
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
