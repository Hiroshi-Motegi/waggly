"use client";

import { Suspense, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { type ColumnDef, type SortingState } from "@tanstack/react-table";
import { AdminTable } from "@/components/admin/admin-table";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { apiFetch } from "@/lib/api-client";

interface Announcement {
  id: string; title: string; category: string;
  published_at: string; is_published: boolean; created_at: string;
}

const categoryLabels: Record<string, { label: string; color: string }> = {
  info: { label: "お知らせ", color: "bg-blue-100 text-blue-800" },
  feature: { label: "機能追加", color: "bg-green-100 text-green-800" },
  maintenance: { label: "メンテナンス", color: "bg-yellow-100 text-yellow-800" },
  campaign: { label: "キャンペーン", color: "bg-purple-100 text-purple-800" },
};

function AnnouncementList() {
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const qs = new URLSearchParams();
  if (filterCategory) qs.set("category", filterCategory);
  if (filterStatus) qs.set("status", filterStatus);

  const { data: items = [] } = useSWR<Announcement[]>(
    `/api/admin/announcements?${qs}`,
    async (url: string) => { const res = await apiFetch(url); return res.ok ? res.json() : []; }
  );

  const columns: ColumnDef<Announcement>[] = [
    { accessorKey: "title", header: "タイトル", enableSorting: false, cell: ({ row }) => (
      <Link href={`/admin/announcements/${row.original.id}`} className="font-medium text-sm text-[#006728] hover:underline">{row.original.title}</Link>
    )},
    { accessorKey: "category", header: "カテゴリ", enableSorting: false, cell: ({ getValue }) => {
      const cat = categoryLabels[getValue() as string];
      return cat ? <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${cat.color}`}>{cat.label}</span> : <span className="text-xs">{getValue() as string}</span>;
    }},
    { accessorKey: "published_at", header: "公開日", enableSorting: false, cell: ({ getValue }) => (
      <span className="text-xs">{new Date(getValue() as string).toLocaleDateString("ja-JP")}</span>
    )},
    { accessorKey: "is_published", header: "状態", enableSorting: false, cell: ({ getValue }) => (
      <span className={`text-[11px] font-bold ${getValue() ? "text-[#006728]" : "text-[#999]"}`}>{getValue() ? "公開中" : "下書き"}</span>
    )},
    { id: "actions", header: "操作", enableSorting: false, cell: ({ row }) => (
      <Link href={`/admin/announcements/${row.original.id}`} className="text-xs text-[#006728] hover:underline font-bold">編集</Link>
    )},
  ];

  return (
    <div className="space-y-4 p-4">
      <AdminBreadcrumb items={[{ label: "お知らせ" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">お知らせ管理 <span className="text-base font-normal text-[#888]">({items.length}件)</span></h1>
        <Link href="/admin/announcements/new" className="rounded bg-[#006728] px-4 py-2 text-sm font-bold text-white hover:bg-[#005520]">＋ 新規作成</Link>
      </div>
      <div className="flex gap-2">
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
          <option value="">すべてのカテゴリ</option>
          {Object.entries(categoryLabels).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
          <option value="">すべて</option>
          <option value="published">公開中</option>
          <option value="draft">下書き</option>
        </select>
      </div>
      <AdminTable<Announcement> data={items} columns={columns} total={items.length} page={1} pageSize={1000} sorting={sorting} onSortingChange={setSorting} onPageChange={() => {}} />
    </div>
  );
}

export default function AnnouncementsPage() {
  return <Suspense><AnnouncementList /></Suspense>;
}
