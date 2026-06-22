"use client";

import { Suspense, useState } from "react";
import useSWR from "swr";
import { type ColumnDef, type SortingState } from "@tanstack/react-table";
import { AdminTable } from "@/components/admin/admin-table";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { AdminModal } from "@/components/admin/admin-modal";
import { apiFetch } from "@/lib/api-client";

interface Club {
  id: string; maker: string | null; model: string | null; category: string;
  catalog_model_id: string | null;
  users: { profiles: { nickname: string | null } | null } | null;
  catalog_models: { name: string; maker: string } | null;
}

interface CatalogModelOption { id: string; name: string; maker: string; category: string; }

const categories = [
  { value: "driver", label: "ドライバー" }, { value: "fairway", label: "FW" },
  { value: "utility", label: "UT" }, { value: "iron", label: "アイアン" },
  { value: "wedge", label: "ウェッジ" }, { value: "putter", label: "パター" },
];

function ClubList() {
  const [search, setSearch] = useState("");
  const [linked, setLinked] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkingClubId, setLinkingClubId] = useState<string | null>(null);
  const [modelSearch, setModelSearch] = useState("");
  const [modelResults, setModelResults] = useState<CatalogModelOption[]>([]);

  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  if (linked) qs.set("linked", linked);
  if (category) qs.set("category", category);
  qs.set("page", String(page)); qs.set("page_size", "20");

  const { data, mutate } = useSWR<{ items: Club[]; total: number }>(
    `/api/admin/clubs?${qs}`,
    async (url: string) => { const res = await apiFetch(url); return res.ok ? res.json() : { items: [], total: 0 }; }
  );
  const clubs = data?.items ?? [];
  const total = data?.total ?? 0;

  async function searchModels(q: string) {
    setModelSearch(q);
    if (q.length < 2) { setModelResults([]); return; }
    const res = await apiFetch(`/api/admin/catalog/models?search=${encodeURIComponent(q)}&page_size=10`);
    if (res.ok) {
      const { items } = await res.json();
      setModelResults(items);
    }
  }

  async function handleLink(clubId: string, catalogModelId: string | null) {
    await apiFetch(`/api/admin/clubs/${clubId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ catalog_model_id: catalogModelId }),
    });
    setLinkModalOpen(false); setLinkingClubId(null); setModelSearch(""); setModelResults([]);
    mutate();
  }

  const columns: ColumnDef<Club>[] = [
    { id: "user", header: "ユーザー", enableSorting: false, cell: ({ row }) => <span className="text-xs">{row.original.users?.profiles?.nickname ?? "-"}</span> },
    { accessorKey: "maker", header: "メーカー", enableSorting: false, cell: ({ getValue }) => <span className="text-xs">{(getValue() as string) ?? "-"}</span> },
    { accessorKey: "model", header: "モデル名", enableSorting: false, cell: ({ getValue }) => <span className="text-sm font-medium">{(getValue() as string) ?? "-"}</span> },
    { accessorKey: "category", header: "カテゴリ", enableSorting: false, cell: ({ getValue }) => <span className="text-xs">{categories.find((c) => c.value === getValue())?.label ?? (getValue() as string)}</span> },
    { id: "catalog_link", header: "カタログ紐付け", enableSorting: false, cell: ({ row }) => {
      const club = row.original;
      if (club.catalog_model_id && club.catalog_models) {
        return (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#006728] font-medium">{club.catalog_models.maker} {club.catalog_models.name}</span>
            <button onClick={() => handleLink(club.id, null)} className="text-[10px] text-red-500 hover:underline">解除</button>
          </div>
        );
      }
      return <span className="text-xs text-[#999]">未紐付け</span>;
    }},
    { id: "actions", header: "操作", enableSorting: false, cell: ({ row }) => {
      if (row.original.catalog_model_id) return null;
      return (
        <button onClick={() => { setLinkingClubId(row.original.id); setLinkModalOpen(true); }} className="text-xs text-[#006728] hover:underline font-bold">紐付け</button>
      );
    }},
  ];

  return (
    <div className="space-y-4 p-4">
      <AdminBreadcrumb items={[{ label: "登録クラブ" }]} />
      <h1 className="text-xl font-bold">登録クラブ管理 <span className="text-base font-normal text-[#888]">({total}件)</span></h1>
      <div className="flex gap-2 flex-wrap">
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="メーカー・モデル名で検索..." className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm w-52" />
        <select value={linked} onChange={(e) => { setLinked(e.target.value); setPage(1); }} className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
          <option value="">全て</option>
          <option value="true">紐付け済み</option>
          <option value="false">未紐付け</option>
        </select>
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
          <option value="">全カテゴリ</option>
          {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      <AdminTable<Club> data={clubs} columns={columns} total={total} page={page} pageSize={20} sorting={sorting} onSortingChange={setSorting} onPageChange={setPage} />

      <AdminModal open={linkModalOpen} onClose={() => { setLinkModalOpen(false); setLinkingClubId(null); }} title="カタログモデル紐付け">
        <div className="space-y-3">
          <input value={modelSearch} onChange={(e) => searchModels(e.target.value)} placeholder="モデル名で検索..." className="block w-full rounded-md border border-input px-3 py-2 text-sm" autoFocus />
          {modelResults.length > 0 && (
            <div className="max-h-60 overflow-y-auto border border-[#e5e5e5] rounded-md">
              {modelResults.map((m) => (
                <button key={m.id} onClick={() => linkingClubId && handleLink(linkingClubId, m.id)}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-[#f5f5f5] border-b border-[#f0f0f0]">
                  <span className="font-medium">{m.name}</span>
                  <span className="text-xs text-[#888] ml-2">{m.maker} / {categories.find((c) => c.value === m.category)?.label ?? m.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </AdminModal>
    </div>
  );
}

export default function AdminClubsPage() {
  return <Suspense><ClubList /></Suspense>;
}
