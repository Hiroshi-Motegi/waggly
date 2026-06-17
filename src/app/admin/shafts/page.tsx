"use client";

import { useState } from "react";
import { Suspense } from "react";
import { type SortingState, type ColumnDef } from "@tanstack/react-table";
import { AdminTable } from "@/components/admin/admin-table";
import { useAdminList } from "@/hooks/admin/use-admin-list";
import { apiFetch } from "@/lib/api-client";

/* ── Types ── */

interface Shaft {
  id: string;
  maker: string;
  name: string;
  type: string | null;
  flex: string | null;
  weight: number | null;
  torque: number | null;
  kick_point: string | null;
  image_url: string | null;
  affiliate_url: string | null;
  source: string;
  verified: boolean;
}

/* ── Columns ── */

const SHAFT_TYPE_LABELS: Record<string, string> = {
  steel: "スチール",
  carbon: "カーボン",
};

const columns: ColumnDef<Shaft, any>[] = [
  {
    accessorKey: "maker",
    header: "メーカー",
    enableSorting: true,
  },
  {
    accessorKey: "name",
    header: "シャフト名",
    enableSorting: true,
  },
  {
    accessorKey: "type",
    header: "素材",
    enableSorting: false,
    cell: ({ getValue }) => {
      const v = getValue() as string | null;
      return v ? (SHAFT_TYPE_LABELS[v] ?? v) : "-";
    },
  },
  {
    accessorKey: "flex",
    header: "フレックス",
    enableSorting: false,
    cell: ({ getValue }) => (getValue() as string | null) ?? "-",
  },
  {
    accessorKey: "weight",
    header: "重量",
    enableSorting: false,
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      return v != null ? `${v}g` : "-";
    },
  },
  {
    accessorKey: "torque",
    header: "トルク",
    enableSorting: false,
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      return v != null ? `${v}°` : "-";
    },
  },
  {
    accessorKey: "kick_point",
    header: "調子",
    enableSorting: false,
    cell: ({ getValue }) => (getValue() as string | null) ?? "-",
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
];

/* ── Inner list component ── */

function ShaftsList() {
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const [newMaker, setNewMaker] = useState("");
  const [newName, setNewName] = useState("");
  const [newFlex, setNewFlex] = useState("");
  const [creating, setCreating] = useState(false);

  const sort = sorting[0]?.id ?? "";
  const order = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : "";

  const { data, isLoading, mutate } = useAdminList<Shaft>("shafts", {
    page,
    pageSize: 20,
    ...(sort ? { sort, order } : {}),
    ...(search ? { search } : {}),
  });

  async function handleCreate() {
    if (!newMaker.trim() || !newName.trim()) return;
    setCreating(true);
    try {
      const res = await apiFetch("/api/admin/shafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maker: newMaker.trim(),
          name: newName.trim(),
          flex: newFlex.trim() || null,
        }),
      });
      if (res.ok) {
        setNewMaker("");
        setNewName("");
        setNewFlex("");
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
          シャフト一覧
          {data && (
            <span className="ml-2 text-base font-normal text-[#888]">
              ({data.total}件)
            </span>
          )}
        </h1>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="メーカー・名前で検索..."
          className="rounded border border-[#dfdfdf] bg-white px-3 py-1.5 text-sm text-black outline-none focus:border-[#006728] w-64"
        />
      </div>

      {/* 新規作成 */}
      <div className="rounded-lg bg-white border border-[#e5e5e5] p-4 space-y-2">
        <p className="text-sm font-bold text-[#006728]">新規作成</p>
        <div className="flex gap-2 items-end">
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">メーカー</label>
            <input
              type="text"
              value={newMaker}
              onChange={(e) => setNewMaker(e.target.value)}
              placeholder="Fujikura"
              className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">シャフト名</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Speeder NX"
              className="rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-[#8b8b8b]">フレックス</label>
            <input
              type="text"
              value={newFlex}
              onChange={(e) => setNewFlex(e.target.value)}
              placeholder="S"
              className="w-20 rounded border border-[#dfdfdf] bg-white px-2 py-1.5 text-sm text-black outline-none focus:border-[#006728]"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !newMaker.trim() || !newName.trim()}
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
        <AdminTable<Shaft>
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

export default function AdminShaftsPage() {
  return (
    <Suspense>
      <ShaftsList />
    </Suspense>
  );
}
