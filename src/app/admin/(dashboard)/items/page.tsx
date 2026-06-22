"use client";

import { Suspense, useState } from "react";
import useSWR from "swr";
import { type ColumnDef, type SortingState } from "@tanstack/react-table";
import { AdminTable } from "@/components/admin/admin-table";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { apiFetch } from "@/lib/api-client";

interface Item {
  id: string; brand: string | null; model: string | null;
  category: string; created_at: string;
  users: { profiles: { nickname: string | null } | null } | null;
}

function ItemList() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  if (category) qs.set("category", category);

  const { data: items = [] } = useSWR<Item[]>(
    `/api/admin/items?${qs}`,
    async (url: string) => { const res = await apiFetch(url); return res.ok ? res.json() : []; }
  );

  const columns: ColumnDef<Item>[] = [
    { id: "user", header: "ユーザー", enableSorting: false, cell: ({ row }) => <span className="text-xs">{row.original.users?.profiles?.nickname ?? "-"}</span> },
    { id: "name", header: "アイテム名", enableSorting: false, cell: ({ row }) => (
      <span className="text-sm font-medium">{[row.original.brand, row.original.model].filter(Boolean).join(" ") || "-"}</span>
    )},
    { accessorKey: "category", header: "カテゴリ", enableSorting: false, cell: ({ getValue }) => <span className="text-xs">{getValue() as string}</span> },
    { accessorKey: "created_at", header: "登録日", enableSorting: false, cell: ({ getValue }) => (
      <span className="text-xs text-[#888]">{new Date(getValue() as string).toLocaleDateString("ja-JP")}</span>
    )},
  ];

  return (
    <div className="space-y-4 p-4">
      <AdminBreadcrumb items={[{ label: "登録アイテム" }]} />
      <h1 className="text-xl font-bold">登録アイテム一覧 <span className="text-base font-normal text-[#888]">({items.length}件)</span></h1>
      <div className="flex gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="アイテム名で検索..." className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm w-52" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
          <option value="">全カテゴリ</option>
        </select>
      </div>
      <AdminTable<Item> data={items} columns={columns} total={items.length} page={1} pageSize={1000} sorting={sorting} onSortingChange={setSorting} onPageChange={() => {}} />
    </div>
  );
}

export default function AdminItemsPage() {
  return <Suspense><ItemList /></Suspense>;
}
