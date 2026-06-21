"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { type ColumnDef, type SortingState } from "@tanstack/react-table";
import { AdminTable } from "@/components/admin/admin-table";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { AdminModal } from "@/components/admin/admin-modal";
import { BulkActionBar } from "@/components/admin/bulk-action-bar";
import { apiFetch } from "@/lib/api-client";

interface Shaft {
  id: string;
  shaft_name: string;
  maker: string | null;
  shaft_type: string | null;
  flex: string | null;
  shaft_weight: number | null;
  torque: number | null;
  kick_point: string | null;
  is_visible: boolean;
  verification_status: string;
}

const verificationLabels: Record<string, string> = {
  verified: "確認済み",
  in_review: "確認中",
  unverified: "未確認",
};

function ShaftList() {
  const [search, setSearch] = useState("");
  const [shaftType, setShaftType] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Shaft> | null>(null);

  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  if (shaftType) qs.set("shaft_type", shaftType);

  const { data: shafts = [], mutate } = useSWR<Shaft[]>(
    `/api/admin/catalog/shafts?${qs}`,
    async (url: string) => {
      const res = await apiFetch(url);
      return res.ok ? res.json() : [];
    }
  );

  async function handleSave() {
    if (!editing) return;
    const method = editing.id ? "PATCH" : "POST";
    await apiFetch("/api/admin/catalog/shafts", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    setModalOpen(false);
    setEditing(null);
    mutate();
  }

  async function handleDelete(id: string) {
    if (!confirm("削除しますか？")) return;
    await apiFetch("/api/admin/catalog/shafts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    mutate();
  }

  async function handleBulkUpdate(updates: Record<string, unknown>) {
    await apiFetch("/api/admin/catalog/shafts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected], ...updates }),
    });
    setSelected(new Set());
    mutate();
  }

  function handleDuplicate(shaft: Shaft) {
    const { id, ...rest } = shaft;
    setEditing({ ...rest, flex: "" });
    setModalOpen(true);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const columns: ColumnDef<Shaft>[] = [
    {
      id: "select",
      header: () => (
        <input
          type="checkbox"
          checked={selected.size === shafts.length && shafts.length > 0}
          onChange={() =>
            setSelected(
              selected.size === shafts.length ? new Set() : new Set(shafts.map((s) => s.id))
            )
          }
        />
      ),
      enableSorting: false,
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selected.has(row.original.id)}
          onChange={() => toggleSelect(row.original.id)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    { accessorKey: "shaft_name", header: "シャフト名", enableSorting: false },
    {
      accessorKey: "maker",
      header: "メーカー",
      enableSorting: false,
      cell: ({ getValue }) => <span className="text-xs text-[#555]">{(getValue() as string) ?? "-"}</span>,
    },
    {
      accessorKey: "shaft_type",
      header: "種類",
      enableSorting: false,
      cell: ({ getValue }) => <span className="text-xs">{(getValue() as string) ?? "-"}</span>,
    },
    {
      accessorKey: "flex",
      header: "フレックス",
      enableSorting: false,
      cell: ({ getValue }) => <span className="text-xs">{(getValue() as string) ?? "-"}</span>,
    },
    {
      accessorKey: "shaft_weight",
      header: "重量(g)",
      enableSorting: false,
      cell: ({ getValue }) => <span className="text-xs">{(getValue() as number) ?? "-"}</span>,
    },
    {
      accessorKey: "torque",
      header: "トルク",
      enableSorting: false,
      cell: ({ getValue }) => <span className="text-xs">{(getValue() as number) ?? "-"}</span>,
    },
    {
      accessorKey: "kick_point",
      header: "キックポイント",
      enableSorting: false,
      cell: ({ getValue }) => <span className="text-xs">{(getValue() as string) ?? "-"}</span>,
    },
    {
      accessorKey: "verification_status",
      header: "確認",
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="text-[11px]">{verificationLabels[getValue() as string] ?? getValue()}</span>
      ),
    },
    {
      accessorKey: "is_visible",
      header: "公開",
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className={`text-[11px] font-bold ${getValue() ? "text-[#006728]" : "text-[#999]"}`}>
          {getValue() ? "公開" : "非公開"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "操作",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex gap-2 text-xs">
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(row.original); setModalOpen(true); }}
            className="text-[#006728] hover:underline font-bold"
          >
            編集
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDuplicate(row.original); }}
            className="text-[#006728] hover:underline"
          >
            複製
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(row.original.id); }}
            className="text-red-600 hover:underline"
          >
            削除
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 p-4">
      <AdminBreadcrumb items={[{ label: "カタログ", href: "/admin/catalog" }, { label: "シャフト管理" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          シャフト管理 <span className="text-base font-normal text-[#888]">({shafts.length}件)</span>
        </h1>
        <Link
          href="/admin/catalog/shafts/new"
          className="rounded bg-[#006728] px-4 py-2 text-sm font-bold text-white hover:bg-[#005520]"
        >
          ＋ 新規追加
        </Link>
      </div>

      <BulkActionBar
        count={selected.size}
        actions={[
          { label: "公開にする", onClick: () => handleBulkUpdate({ is_visible: true }) },
          { label: "非公開にする", onClick: () => handleBulkUpdate({ is_visible: false }) },
          { label: "確認済み", onClick: () => handleBulkUpdate({ verification_status: "verified" }) },
          { label: "確認中", onClick: () => handleBulkUpdate({ verification_status: "in_review" }) },
          { label: "未確認", onClick: () => handleBulkUpdate({ verification_status: "unverified" }) },
        ]}
        onClear={() => setSelected(new Set())}
      />

      <div className="flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="シャフト名で検索..."
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm w-60"
        />
        <select
          value={shaftType}
          onChange={(e) => setShaftType(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="">すべての種類</option>
          <option value="カーボンシャフト">カーボン</option>
          <option value="スチールシャフト">スチール</option>
        </select>
      </div>

      <AdminTable<Shaft>
        data={shafts}
        columns={columns}
        total={shafts.length}
        page={1}
        pageSize={1000}
        sorting={sorting}
        onSortingChange={setSorting}
        onPageChange={() => {}}
      />

      <AdminModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title="シャフト編集">
        {editing && (
          <div className="space-y-3">
            <label className="block text-xs font-bold text-[#555]">
              シャフト名 *
              <input
                value={editing.shaft_name ?? ""}
                onChange={(e) => setEditing({ ...editing, shaft_name: e.target.value })}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-bold text-[#555]">
                メーカー
                <input
                  value={editing.maker ?? ""}
                  onChange={(e) => setEditing({ ...editing, maker: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-bold text-[#555]">
                種類
                <select
                  value={editing.shaft_type ?? ""}
                  onChange={(e) => setEditing({ ...editing, shaft_type: e.target.value || null })}
                  className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
                >
                  <option value="">未設定</option>
                  <option value="カーボンシャフト">カーボンシャフト</option>
                  <option value="スチールシャフト">スチールシャフト</option>
                </select>
              </label>
              <label className="block text-xs font-bold text-[#555]">
                フレックス
                <input
                  value={editing.flex ?? ""}
                  onChange={(e) => setEditing({ ...editing, flex: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-bold text-[#555]">
                重量(g)
                <input
                  type="number"
                  value={editing.shaft_weight ?? ""}
                  onChange={(e) => setEditing({ ...editing, shaft_weight: e.target.value ? Number(e.target.value) : null })}
                  className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-bold text-[#555]">
                トルク(°)
                <input
                  type="number"
                  step="0.1"
                  value={editing.torque ?? ""}
                  onChange={(e) => setEditing({ ...editing, torque: e.target.value ? Number(e.target.value) : null })}
                  className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-bold text-[#555]">
                キックポイント
                <input
                  value={editing.kick_point ?? ""}
                  onChange={(e) => setEditing({ ...editing, kick_point: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                className="rounded bg-[#006728] px-6 py-2 text-sm font-bold text-white hover:bg-[#005520]"
              >
                保存
              </button>
              <button
                onClick={() => { setModalOpen(false); setEditing(null); }}
                className="rounded border border-[#ddd] px-6 py-2 text-sm hover:bg-[#f5f5f5]"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}

export default function ShaftsPage() {
  return (
    <Suspense>
      <ShaftList />
    </Suspense>
  );
}
