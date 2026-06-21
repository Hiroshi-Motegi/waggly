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

interface Grip {
  id: string;
  grip_name: string;
  maker: string | null;
  grip_size: string | null;
  weight: number | null;
  material: string | null;
  is_visible: boolean;
  verification_status: string;
}

const verificationLabels: Record<string, string> = {
  verified: "確認済み", in_review: "確認中", unverified: "未確認",
};

function GripList() {
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Grip> | null>(null);

  const qs = new URLSearchParams();
  if (search) qs.set("search", search);

  const { data: grips = [], mutate } = useSWR<Grip[]>(
    `/api/admin/catalog/grips?${qs}`,
    async (url: string) => { const res = await apiFetch(url); return res.ok ? res.json() : []; }
  );

  async function handleSave() {
    if (!editing) return;
    const method = editing.id ? "PATCH" : "POST";
    await apiFetch("/api/admin/catalog/grips", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing),
    });
    setModalOpen(false); setEditing(null); mutate();
  }

  async function handleDelete(id: string) {
    if (!confirm("削除しますか？")) return;
    await apiFetch("/api/admin/catalog/grips", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    mutate();
  }

  async function handleBulkUpdate(updates: Record<string, unknown>) {
    await apiFetch("/api/admin/catalog/grips", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected], ...updates }),
    });
    setSelected(new Set()); mutate();
  }

  function handleDuplicate(grip: Grip) {
    const { id, ...rest } = grip;
    setEditing({ ...rest, grip_size: "" });
    setModalOpen(true);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  const columns: ColumnDef<Grip>[] = [
    {
      id: "select", header: () => (
        <input type="checkbox"
          checked={selected.size === grips.length && grips.length > 0}
          onChange={() => setSelected(selected.size === grips.length ? new Set() : new Set(grips.map((g) => g.id)))}
        />
      ), enableSorting: false,
      cell: ({ row }) => <input type="checkbox" checked={selected.has(row.original.id)} onChange={() => toggleSelect(row.original.id)} onClick={(e) => e.stopPropagation()} />,
    },
    { accessorKey: "grip_name", header: "グリップ名", enableSorting: false },
    { accessorKey: "maker", header: "メーカー", enableSorting: false, cell: ({ getValue }) => <span className="text-xs text-[#555]">{(getValue() as string) ?? "-"}</span> },
    { accessorKey: "grip_size", header: "サイズ", enableSorting: false, cell: ({ getValue }) => <span className="text-xs">{(getValue() as string) ?? "-"}</span> },
    { accessorKey: "weight", header: "重量(g)", enableSorting: false, cell: ({ getValue }) => <span className="text-xs">{(getValue() as number) ?? "-"}</span> },
    { accessorKey: "material", header: "素材", enableSorting: false, cell: ({ getValue }) => <span className="text-xs">{(getValue() as string) ?? "-"}</span> },
    { accessorKey: "verification_status", header: "確認", enableSorting: false, cell: ({ getValue }) => <span className="text-[11px]">{verificationLabels[getValue() as string] ?? getValue()}</span> },
    { accessorKey: "is_visible", header: "公開", enableSorting: false, cell: ({ getValue }) => <span className={`text-[11px] font-bold ${getValue() ? "text-[#006728]" : "text-[#999]"}`}>{getValue() ? "公開" : "非公開"}</span> },
    {
      id: "actions", header: "操作", enableSorting: false,
      cell: ({ row }) => (
        <div className="flex gap-2 text-xs">
          <button onClick={(e) => { e.stopPropagation(); setEditing(row.original); setModalOpen(true); }} className="text-[#006728] hover:underline font-bold">編集</button>
          <button onClick={(e) => { e.stopPropagation(); handleDuplicate(row.original); }} className="text-[#006728] hover:underline">複製</button>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(row.original.id); }} className="text-red-600 hover:underline">削除</button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 p-4">
      <AdminBreadcrumb items={[{ label: "カタログ", href: "/admin/catalog" }, { label: "グリップ管理" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">グリップ管理 <span className="text-base font-normal text-[#888]">({grips.length}件)</span></h1>
        <Link href="/admin/catalog/grips/new" className="rounded bg-[#006728] px-4 py-2 text-sm font-bold text-white hover:bg-[#005520]">＋ 新規追加</Link>
      </div>
      <BulkActionBar count={selected.size} actions={[
        { label: "公開にする", onClick: () => handleBulkUpdate({ is_visible: true }) },
        { label: "非公開にする", onClick: () => handleBulkUpdate({ is_visible: false }) },
        { label: "確認済み", onClick: () => handleBulkUpdate({ verification_status: "verified" }) },
        { label: "確認中", onClick: () => handleBulkUpdate({ verification_status: "in_review" }) },
        { label: "未確認", onClick: () => handleBulkUpdate({ verification_status: "unverified" }) },
      ]} onClear={() => setSelected(new Set())} />
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="グリップ名で検索..." className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm w-60" />
      <AdminTable<Grip> data={grips} columns={columns} total={grips.length} page={1} pageSize={1000} sorting={sorting} onSortingChange={setSorting} onPageChange={() => {}} />
      <AdminModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title="グリップ編集">
        {editing && (
          <div className="space-y-3">
            <label className="block text-xs font-bold text-[#555]">グリップ名 *<input value={editing.grip_name ?? ""} onChange={(e) => setEditing({ ...editing, grip_name: e.target.value })} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-bold text-[#555]">メーカー<input value={editing.maker ?? ""} onChange={(e) => setEditing({ ...editing, maker: e.target.value })} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm" /></label>
              <label className="block text-xs font-bold text-[#555]">サイズ<input value={editing.grip_size ?? ""} onChange={(e) => setEditing({ ...editing, grip_size: e.target.value })} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm" placeholder="M58, M60 等" /></label>
              <label className="block text-xs font-bold text-[#555]">重量(g)<input type="number" value={editing.weight ?? ""} onChange={(e) => setEditing({ ...editing, weight: e.target.value ? Number(e.target.value) : null })} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm" /></label>
              <label className="block text-xs font-bold text-[#555]">素材<input value={editing.material ?? ""} onChange={(e) => setEditing({ ...editing, material: e.target.value })} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm" placeholder="ラバー, コード 等" /></label>
            </div>
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

export default function GripsPage() {
  return <Suspense><GripList /></Suspense>;
}
