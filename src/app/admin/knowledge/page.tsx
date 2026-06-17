"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { type ColumnDef, type SortingState } from "@tanstack/react-table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminTable } from "@/components/admin/admin-table";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { apiFetch } from "@/lib/api-client";
import { nativeHref } from "@/lib/native-routes";

/* ── Types ── */

interface KnowledgeItem {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[] | null;
  source: string | null;
  status: string;
  analysis_summary: string | null;
  search_sources: string[] | null;
  generated_at: string | null;
  created_at: string;
}

interface AutoRun {
  id: string;
  ran_at: string;
  summary: string;
  topics_generated: number;
  status: string;
  total_sessions: number;
  total_plans: number;
  error_message: string | null;
}

/* ── Constants ── */

const categories = [
  { value: "swing_basics", label: "スイング基礎" },
  { value: "pga_data", label: "PGAデータ" },
  { value: "drill", label: "ドリル" },
  { value: "equipment", label: "用具知識" },
  { value: "mental", label: "メンタル" },
  { value: "course_strategy", label: "コース戦略" },
  { value: "fitness", label: "フィットネス" },
  { value: "rules", label: "ルール" },
];

const statusFilters = [
  { value: "", label: "すべて" },
  { value: "draft", label: "レビュー待ち" },
  { value: "active", label: "有効" },
  { value: "inactive", label: "無効" },
  { value: "rejected", label: "却下" },
];

/* ── Helpers ── */

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "draft":
      return (
        <span className="inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-bold text-yellow-800">
          レビュー待ち
        </span>
      );
    case "active":
      return (
        <span className="inline-block rounded-full bg-[#e6f2eb] px-2 py-0.5 text-[11px] font-bold text-[#006728]">
          有効
        </span>
      );
    case "inactive":
      return (
        <span className="inline-block rounded-full bg-[#f5f5f5] px-2 py-0.5 text-[11px] text-[#8b8b8b]">
          無効
        </span>
      );
    case "rejected":
      return (
        <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
          却下
        </span>
      );
    default:
      return (
        <span className="inline-block rounded-full bg-[#f5f5f5] px-2 py-0.5 text-[11px] text-[#8b8b8b]">
          {status}
        </span>
      );
  }
}

/* ── Inner (uses useRouter → must be inside Suspense) ── */

function KnowledgeList() {
  const router = useRouter();
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isCollecting, setIsCollecting] = useState(false);

  /* SWR for knowledge items */
  const itemsKey = (() => {
    const params = new URLSearchParams();
    if (filterCategory) params.set("category", filterCategory);
    if (filterStatus) params.set("status", filterStatus);
    const qs = params.toString();
    return `/api/admin/knowledge${qs ? `?${qs}` : ""}`;
  })();

  const {
    data: items = [],
    isLoading,
    mutate: mutateItems,
  } = useSWR<KnowledgeItem[]>(itemsKey, async (url: string) => {
    const res = await apiFetch(url);
    if (!res.ok) return [];
    return res.json();
  });

  /* SWR for latest auto-run */
  const { data: latestRun, mutate: mutateRun } = useSWR<AutoRun | null>(
    "/api/admin/knowledge/runs",
    async (url: string) => {
      const res = await apiFetch(url);
      if (!res.ok) return null;
      const runs = await res.json();
      return runs[0] ?? null;
    }
  );

  /* Handlers */
  async function handleStatusChange(id: string, newStatus: string) {
    await apiFetch(`/api/admin/knowledge/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    mutateItems();
  }

  async function handleDelete(id: string) {
    if (!confirm("削除しますか？")) return;
    await apiFetch(`/api/admin/knowledge/${id}`, { method: "DELETE" });
    mutateItems();
  }

  async function handleManualCollect() {
    setIsCollecting(true);
    try {
      await apiFetch("/api/admin/knowledge/auto-collect", { method: "POST" });
      await Promise.all([mutateItems(), mutateRun()]);
    } finally {
      setIsCollecting(false);
    }
  }

  /* Columns */
  const columns: ColumnDef<KnowledgeItem, any>[] = [
    {
      accessorKey: "title",
      header: "タイトル",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-medium text-sm">{row.original.title}</span>
      ),
    },
    {
      accessorKey: "category",
      header: "カテゴリ",
      enableSorting: false,
      cell: ({ getValue }) => {
        const val = getValue() as string;
        return (
          <span className="text-xs text-[#555]">
            {categories.find((c) => c.value === val)?.label ?? val}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "ステータス",
      enableSorting: false,
      cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
    },
    {
      accessorKey: "source",
      header: "ソース",
      enableSorting: false,
      cell: ({ getValue }) => {
        const val = getValue() as string | null;
        if (val === "auto-collected") {
          return (
            <span className="inline-block rounded border border-[#ddd] px-1.5 py-0.5 text-[11px] text-[#888]">
              自動生成
            </span>
          );
        }
        return <span className="text-xs text-[#888]">{val ?? "-"}</span>;
      },
    },
    {
      id: "actions",
      header: "操作",
      enableSorting: false,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex flex-wrap gap-2 text-xs">
            <Link
              href={nativeHref(`/admin/knowledge/${item.id}`)}
              className="font-bold text-[#006728] hover:underline"
            >
              編集
            </Link>
            {item.status === "draft" && (
              <>
                <button
                  onClick={() => handleStatusChange(item.id, "active")}
                  className="text-green-700 hover:underline"
                >
                  承認
                </button>
                <button
                  onClick={() => handleStatusChange(item.id, "rejected")}
                  className="text-orange-600 hover:underline"
                >
                  却下
                </button>
              </>
            )}
            {item.status === "active" && (
              <button
                onClick={() => handleStatusChange(item.id, "inactive")}
                className="text-[#8b8b8b] hover:underline"
              >
                無効化
              </button>
            )}
            {item.status === "inactive" && (
              <button
                onClick={() => handleStatusChange(item.id, "active")}
                className="text-[#8b8b8b] hover:underline"
              >
                有効化
              </button>
            )}
            <button
              onClick={() => handleDelete(item.id)}
              className="text-red-600 hover:underline"
            >
              削除
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4 p-4">
      <AdminBreadcrumb items={[{ label: "ナレッジ" }]} />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          教師データ管理
          {!isLoading && (
            <span className="ml-2 text-base font-normal text-[#888]">
              ({items.length}件)
            </span>
          )}
        </h1>
        <Button size="sm" onClick={() => router.push("/admin/knowledge/new")}>
          ＋ 追加
        </Button>
      </div>

      {/* Latest auto-run summary */}
      {latestRun ? (
        <Card>
          <CardContent className="p-3 text-base">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">最新の自動収集</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(latestRun.ran_at).toLocaleDateString("ja-JP")} —
                  {latestRun.status === "success"
                    ? ` ${latestRun.topics_generated}件生成（${latestRun.total_sessions}練習, ${latestRun.total_plans}プラン分析）`
                    : latestRun.status === "no_data"
                      ? " 対象データなし"
                      : ` エラー: ${latestRun.error_message}`}
                </p>
                {latestRun.status === "success" && (
                  <p className="text-sm mt-1">{latestRun.summary}</p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleManualCollect}
                disabled={isCollecting}
              >
                {isCollecting ? "実行中..." : "今すぐ実行"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={handleManualCollect}
          disabled={isCollecting}
        >
          {isCollecting ? "実行中..." : "自動収集を実行"}
        </Button>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          {statusFilters.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="">すべてのカテゴリ</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-lg bg-white p-8 text-center text-sm text-[#8b8b8b]">
          読み込み中...
        </div>
      ) : (
        <AdminTable<KnowledgeItem>
          data={items}
          columns={columns}
          total={items.length}
          page={1}
          pageSize={1000}
          sorting={sorting}
          onSortingChange={setSorting}
          onPageChange={() => {}}
        />
      )}
    </div>
  );
}

/* ── Page ── */

export default function KnowledgePage() {
  return (
    <Suspense>
      <KnowledgeList />
    </Suspense>
  );
}
