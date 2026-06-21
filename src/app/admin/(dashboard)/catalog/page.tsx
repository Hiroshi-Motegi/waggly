"use client";

import { Suspense, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { type ColumnDef, type SortingState } from "@tanstack/react-table";
import { AdminTable } from "@/components/admin/admin-table";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { BulkActionBar } from "@/components/admin/bulk-action-bar";
import { apiFetch } from "@/lib/api-client";

interface CatalogModel {
  id: string;
  name: string;
  maker: string;
  maker_slug: string;
  category: string;
  slug: string;
  release_year: number | null;
  is_visible: boolean;
  verification_status: string;
  catalog_specs: [{ count: number }];
}

interface Maker { id: string; name: string; slug: string; }

const categories = [
  { value: "driver", label: "ドライバー" },
  { value: "fairway", label: "フェアウェイウッド" },
  { value: "utility", label: "ユーティリティ" },
  { value: "iron", label: "アイアン" },
  { value: "wedge", label: "ウェッジ" },
  { value: "putter", label: "パター" },
];

const verificationLabels: Record<string, string> = {
  verified: "確認済み", in_review: "確認中", unverified: "未確認",
};

function ModelList() {
  const [search, setSearch] = useState("");
  const [makerSlug, setMakerSlug] = useState("");
  const [category, setCategory] = useState("");
  const [releaseYear, setReleaseYear] = useState("");
  const [isVisible, setIsVisible] = useState("");
  const [verification, setVerification] = useState("");
  const [noSpecs, setNoSpecs] = useState(false);
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: makers = [] } = useSWR<Maker[]>("/api/admin/catalog/makers", async (url: string) => {
    const res = await apiFetch(url); return res.ok ? res.json() : [];
  });

  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  if (makerSlug) qs.set("maker_slug", makerSlug);
  if (category) qs.set("category", category);
  if (releaseYear) qs.set("release_year", releaseYear);
  if (isVisible) qs.set("is_visible", isVisible);
  if (verification) qs.set("verification_status", verification);
  if (noSpecs) qs.set("no_specs", "true");
  qs.set("page", String(page));
  qs.set("page_size", "20");

  const { data, mutate } = useSWR<{ items: CatalogModel[]; total: number }>(
    `/api/admin/catalog/models?${qs}`,
    async (url: string) => { const res = await apiFetch(url); return res.ok ? res.json() : { items: [], total: 0 }; }
  );
  const models = data?.items ?? [];
  const total = data?.total ?? 0;

  async function handleBulkUpdate(updates: Record<string, unknown>) {
    await apiFetch("/api/admin/catalog/models", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected], ...updates }),
    });
    setSelected(new Set()); mutate();
  }

  async function handleBulkDelete() {
    if (!confirm(`${selected.size}件のモデルを削除しますか？関連するスペック・画像等もすべて削除されます。`)) return;
    await Promise.all([...selected].map((id) =>
      apiFetch("/api/admin/catalog/models", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
    ));
    setSelected(new Set());
    mutate();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  // Generate release year options from data
  const years = [...new Set(models.map((m) => m.release_year).filter(Boolean))].sort((a, b) => (b ?? 0) - (a ?? 0));

  const columns: ColumnDef<CatalogModel>[] = [
    {
      id: "select", header: () => (
        <input type="checkbox" title="ページ内すべて選択" checked={selected.size === models.length && models.length > 0}
          onChange={() => setSelected(selected.size === models.length ? new Set() : new Set(models.map((m) => m.id)))} />
      ), enableSorting: false,
      cell: ({ row }) => <input type="checkbox" checked={selected.has(row.original.id)} onChange={() => toggleSelect(row.original.id)} onClick={(e) => e.stopPropagation()} />,
    },
    {
      accessorKey: "name", header: "モデル名", enableSorting: false,
      cell: ({ row }) => (
        <Link href={`/admin/catalog/models/${row.original.id}`} className="font-medium text-sm text-[#006728] hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    { accessorKey: "maker", header: "メーカー", enableSorting: false, cell: ({ getValue }) => <span className="text-xs text-[#555]">{getValue() as string}</span> },
    {
      accessorKey: "category", header: "カテゴリ", enableSorting: false,
      cell: ({ getValue }) => <span className="text-xs">{categories.find((c) => c.value === getValue())?.label ?? (getValue() as string)}</span>,
    },
    { accessorKey: "release_year", header: "発売年", enableSorting: false, cell: ({ getValue }) => <span className="text-xs">{(getValue() as number) ?? "-"}</span> },
    {
      id: "spec_count", header: "スペック数", enableSorting: false,
      cell: ({ row }) => <span className="text-xs">{row.original.catalog_specs?.[0]?.count ?? 0}</span>,
    },
    {
      accessorKey: "verification_status", header: "確認", enableSorting: false,
      cell: ({ getValue }) => <span className="text-[11px]">{verificationLabels[getValue() as string] ?? (getValue() as string)}</span>,
    },
    {
      accessorKey: "is_visible", header: "公開", enableSorting: false,
      cell: ({ getValue }) => <span className={`text-[11px] font-bold ${getValue() ? "text-[#006728]" : "text-[#999]"}`}>{getValue() ? "公開" : "非公開"}</span>,
    },
    {
      id: "actions", header: "操作", enableSorting: false,
      cell: ({ row }) => (
        <Link href={`/admin/catalog/models/${row.original.id}`} className="text-xs text-[#006728] hover:underline font-bold">編集</Link>
      ),
    },
  ];

  return (
    <div className="space-y-4 p-4">
      <AdminBreadcrumb items={[{ label: "モデル管理" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">モデル管理 <span className="text-base font-normal text-[#888]">({total}件)</span></h1>
        <Link href="/admin/catalog/models/new" className="rounded bg-[#006728] px-4 py-2 text-sm font-bold text-white hover:bg-[#005520]">＋ 新規追加</Link>
      </div>
      <BulkActionBar count={selected.size} actions={[
        { label: "公開にする", onClick: () => handleBulkUpdate({ is_visible: true }) },
        { label: "非公開にする", onClick: () => handleBulkUpdate({ is_visible: false }) },
        { label: "確認済み", onClick: () => handleBulkUpdate({ verification_status: "verified" }) },
        { label: "確認中", onClick: () => handleBulkUpdate({ verification_status: "in_review" }) },
        { label: "未確認", onClick: () => handleBulkUpdate({ verification_status: "unverified" }) },
        { label: "削除", onClick: () => handleBulkDelete(), variant: "danger" },
      ]} onClear={() => setSelected(new Set())} />
      <div className="flex gap-2 flex-wrap">
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="モデル名で検索..." className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm w-52" />
        <select value={makerSlug} onChange={(e) => { setMakerSlug(e.target.value); setPage(1); }} className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
          <option value="">全メーカー</option>
          {makers.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
        </select>
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
          <option value="">全カテゴリ</option>
          {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={releaseYear} onChange={(e) => { setReleaseYear(e.target.value); setPage(1); }} className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
          <option value="">全年</option>
          {years.map((y) => <option key={y} value={String(y)}>{y}年</option>)}
        </select>
        <select value={isVisible} onChange={(e) => { setIsVisible(e.target.value); setPage(1); }} className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
          <option value="">全て</option>
          <option value="true">公開中</option>
          <option value="false">非公開</option>
        </select>
        <select value={verification} onChange={(e) => { setVerification(e.target.value); setPage(1); }} className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
          <option value="">全確認状態</option>
          <option value="verified">確認済み</option>
          <option value="in_review">確認中</option>
          <option value="unverified">未確認</option>
        </select>
        <label className="flex items-center gap-1 text-xs text-[#555]">
          <input type="checkbox" checked={noSpecs} onChange={(e) => { setNoSpecs(e.target.checked); setPage(1); }} />
          スペックなしのみ
        </label>
      </div>
      <AdminTable<CatalogModel> data={models} columns={columns} total={total} page={page} pageSize={20} sorting={sorting} onSortingChange={setSorting} onPageChange={setPage} />
    </div>
  );
}

export default function AdminCatalogPage() {
  return <Suspense><ModelList /></Suspense>;
}
