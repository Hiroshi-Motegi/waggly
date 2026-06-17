"use client";

import { useState } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { type SortingState, type ColumnDef } from "@tanstack/react-table";
import { AdminTable } from "@/components/admin/admin-table";
import { useAdminList } from "@/hooks/admin/use-admin-list";
import { apiFetch } from "@/lib/api-client";

/* ── Types ── */

interface ProductLineRef {
  id: string;
  maker: string;
  name: string;
}

interface Series {
  id: string;
  maker: string;
  model: string;
  name: string | null;
  product_line_id: string | null;
  product_line: ProductLineRef | null;
  category: string | null;
  image_url: string | null;
  affiliate_url: string | null;
  verified: boolean;
  source: string;
  spec_count: number;
  specs: { id: string; category: string; club_number: string | null; loft: number | null; verified: boolean }[];
}

const CATEGORY_LABELS: Record<string, string> = {
  driver: "ドライバー",
  fairway_wood: "FW",
  utility: "UT",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};

const CATEGORY_OPTIONS = [
  { value: "driver", label: "ドライバー" },
  { value: "fairway_wood", label: "フェアウェイウッド" },
  { value: "utility", label: "ユーティリティ" },
  { value: "iron", label: "アイアン" },
  { value: "wedge", label: "ウェッジ" },
  { value: "putter", label: "パター" },
];

/* ── Columns ── */

const columns: ColumnDef<Series, any>[] = [
  {
    id: "thumbnail",
    header: "画像",
    enableSorting: false,
    size: 40,
    cell: ({ row }) => (
      <img
        src={row.original.image_url ?? "/no-images/etc.png"}
        alt={row.original.model}
        className="h-10 w-10 rounded object-contain bg-[#f5f5f5]"
      />
    ),
  },
  {
    id: "product_line_maker",
    header: "メーカー",
    enableSorting: false,
    cell: ({ row }) => row.original.product_line?.maker ?? row.original.maker,
  },
  {
    id: "product_line_name",
    header: "モデルライン",
    enableSorting: false,
    cell: ({ row }) => row.original.product_line?.name ?? row.original.model,
  },
  {
    id: "club_name",
    header: "クラブ名",
    enableSorting: false,
    cell: ({ row }) => row.original.name ?? "-",
  },
  {
    accessorKey: "category",
    header: "カテゴリ",
    enableSorting: false,
    cell: ({ getValue }) => {
      const v = getValue() as string | null;
      return v ? CATEGORY_LABELS[v] ?? v : "-";
    },
  },
  {
    accessorKey: "spec_count",
    header: "スペック数",
    enableSorting: false,
    cell: ({ getValue }) => `${getValue() as number}件`,
  },
  {
    id: "verified",
    header: "状態",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.verified ? (
        <span className="inline-block rounded-full bg-[#006728] px-2 py-0.5 text-[11px] font-bold text-white">
          確認済
        </span>
      ) : (
        <span className="text-[11px] text-[#8b8b8b]">未確認</span>
      ),
  },
  {
    id: "actions",
    header: "操作",
    enableSorting: false,
    cell: ({ row }) => (
      <Link
        href={`/admin/series/${row.original.id}`}
        className="text-xs font-bold text-[#006728] hover:underline"
      >
        編集
      </Link>
    ),
  },
];

/* ── Inner list component ── */

interface ProductLineSearchResult {
  id: string;
  maker: string;
  name: string;
}

function SeriesList() {
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("iron");
  const [creating, setCreating] = useState(false);
  const [plQuery, setPlQuery] = useState("");
  const [plResults, setPlResults] = useState<ProductLineSearchResult[]>([]);
  const [plSearching, setPlSearching] = useState(false);
  const [selectedPl, setSelectedPl] = useState<ProductLineSearchResult | null>(null);

  const sort = sorting[0]?.id ?? "";
  const order = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : "";

  const { data, isLoading, mutate } = useAdminList<Series>("series", {
    page,
    pageSize: 20,
    ...(sort ? { sort, order } : {}),
  });

  async function handleSearchPl() {
    const q = plQuery.trim();
    if (!q) return;
    setPlSearching(true);
    try {
      const res = await apiFetch(`/api/admin/product-lines?search=${encodeURIComponent(q)}&pageSize=10`);
      if (res.ok) {
        const json = await res.json();
        setPlResults(json.data ?? []);
      }
    } finally {
      setPlSearching(false);
    }
  }

  async function handleCreate() {
    if (!selectedPl || !newName.trim()) return;
    setCreating(true);
    try {
      const res = await apiFetch("/api/admin/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_line_id: selectedPl.id, name: newName.trim(), category: newCategory }),
      });
      if (res.ok) {
        setNewName("");
        setSelectedPl(null);
        setPlQuery("");
        setPlResults([]);
        await mutate();
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          クラブモデル一覧
          {data && (
            <span className="ml-2 text-base font-normal text-[#888]">
              ({data.total}件)
            </span>
          )}
        </h1>
      </div>

      {/* 新規作成 */}
      <div className="rounded-lg bg-white border border-[#e5e5e5] p-4 space-y-2">
        <p className="text-sm font-bold text-[#006728]">新規作成</p>

        {/* Product line selector */}
        <div className="space-y-1">
          <label className="text-[10px] text-[#8b8b8b]">モデルライン</label>
          {selectedPl ? (
            <div className="flex items-center gap-2">
              <span className="rounded border border-[#006728] bg-[#f0f8f0] px-2 py-1 text-sm font-medium">
                {selectedPl.maker} {selectedPl.name}
              </span>
              <button
                onClick={() => { setSelectedPl(null); setPlQuery(""); setPlResults([]); }}
                className="text-[10px] text-red-400 hover:text-red-600"
              >
                変更
              </button>
            </div>
          ) : (
            <div className="flex gap-1.5">
              <input
                type="text"
                value={plQuery}
                onChange={(e) => setPlQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearchPl(); }}
                placeholder="モデルライン名で検索..."
                className="flex-1 rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
              />
              <button
                onClick={handleSearchPl}
                disabled={plSearching || !plQuery.trim()}
                className="shrink-0 rounded bg-[#006728] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
              >
                {plSearching ? "..." : "検索"}
              </button>
            </div>
          )}
          {!selectedPl && plResults.length > 0 && (
            <div className="space-y-0.5 mt-1">
              {plResults.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => { setSelectedPl(pl); setPlResults([]); }}
                  className="block w-full text-left rounded border border-dashed border-[#ccc] bg-[#fafafa] px-2 py-1 text-sm hover:bg-[#f0f8f0]"
                >
                  {pl.maker} {pl.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 items-end">
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">クラブ名</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="アイアン"
              className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">カテゴリ</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !selectedPl || !newName.trim()}
            className="shrink-0 rounded-full bg-[#006728] px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40"
          >
            {creating ? "作成中..." : "作成"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg bg-white p-8 text-center text-sm text-[#8b8b8b]">
          読み込み中...
        </div>
      ) : (
        <AdminTable<Series>
          data={data?.data ?? []}
          columns={columns}
          total={data?.total ?? 0}
          page={page}
          pageSize={20}
          sorting={sorting}
          onSortingChange={setSorting}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

/* ── Page ── */

export default function AdminSeriesPage() {
  return (
    <Suspense>
      <SeriesList />
    </Suspense>
  );
}
