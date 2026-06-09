"use client";
import { Loading } from "@/components/loading";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { nativeHref } from "@/lib/native-routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api-client";

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

function statusBadge(status: string) {
  switch (status) {
    case "draft": return <Badge variant="default">レビュー待ち</Badge>;
    case "active": return <Badge variant="secondary">有効</Badge>;
    case "inactive": return <Badge variant="outline">無効</Badge>;
    case "rejected": return <Badge variant="destructive">却下</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

export default function KnowledgePage() {
  const router = useRouter();
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [latestRun, setLatestRun] = useState<AutoRun | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);

  async function fetchItems() {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (filterCategory) params.set("category", filterCategory);
    if (filterStatus) params.set("status", filterStatus);
    const qs = params.toString();
    const res = await apiFetch(`/api/admin/knowledge${qs ? `?${qs}` : ""}`);
    if (res.ok) setItems(await res.json());
    setIsLoading(false);
  }

  async function fetchLatestRun() {
    const res = await apiFetch("/api/admin/knowledge/runs");
    if (res.ok) {
      const runs = await res.json();
      setLatestRun(runs[0] ?? null);
    }
  }

  useEffect(() => { fetchItems(); }, [filterCategory, filterStatus]);
  useEffect(() => { fetchLatestRun(); }, []);

  async function handleStatusChange(id: string, newStatus: string) {
    await apiFetch(`/api/admin/knowledge/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchItems();
  }

  async function handleDelete(id: string) {
    if (!confirm("削除しますか？")) return;
    await apiFetch(`/api/admin/knowledge/${id}`, { method: "DELETE" });
    fetchItems();
  }

  async function handleManualCollect() {
    setIsCollecting(true);
    try {
      await apiFetch("/api/admin/knowledge/auto-collect", { method: "POST" });
      await Promise.all([fetchItems(), fetchLatestRun()]);
    } finally {
      setIsCollecting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">教師データ管理</h1>

      {/* Latest run summary */}
      {latestRun && (
        <Card>
          <CardContent className="p-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">最新の自動収集</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(latestRun.ran_at).toLocaleDateString("ja-JP")} —
                  {latestRun.status === "success"
                    ? ` ${latestRun.topics_generated}件生成（${latestRun.total_sessions}練習, ${latestRun.total_plans}プラン分析）`
                    : latestRun.status === "no_data"
                      ? " 対象データなし"
                      : ` エラー: ${latestRun.error_message}`}
                </p>
                {latestRun.status === "success" && (
                  <p className="text-xs mt-1">{latestRun.summary}</p>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={handleManualCollect} disabled={isCollecting}>
                {isCollecting ? "実行中..." : "今すぐ実行"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {!latestRun && (
        <Button size="sm" variant="outline" onClick={handleManualCollect} disabled={isCollecting}>
          {isCollecting ? "実行中..." : "自動収集を実行"}
        </Button>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {statusFilters.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">すべてのカテゴリ</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <Button onClick={() => router.push("/admin/knowledge/new")}>＋ 追加</Button>
      </div>

      <p className="text-sm text-muted-foreground">{items.length}件</p>

      {isLoading ? (
        <Loading />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id} className={item.status === "inactive" || item.status === "rejected" ? "opacity-50" : ""}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">
                    {categories.find((c) => c.value === item.category)?.label ?? item.category}
                  </Badge>
                  <span className="text-sm font-medium">{item.title}</span>
                  {statusBadge(item.status)}
                  {item.source === "auto-collected" && (
                    <Badge variant="outline" className="text-xs">自動生成</Badge>
                  )}
                </div>

                {/* Analysis summary for drafts */}
                {item.status === "draft" && item.analysis_summary && (
                  <p className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400 rounded p-2">
                    分析理由: {item.analysis_summary}
                  </p>
                )}

                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{item.content}</p>

                {item.tags && item.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}

                {/* Search sources for auto-generated */}
                {item.search_sources && item.search_sources.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    参照: {item.search_sources.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mr-2">
                        [{i + 1}]
                      </a>
                    ))}
                  </div>
                )}

                {item.source && item.source !== "auto-collected" && (
                  <p className="text-xs text-muted-foreground">出典: {item.source}</p>
                )}

                <Separator />
                <div className="flex gap-2 text-xs flex-wrap">
                  <button onClick={() => router.push(nativeHref(`/admin/knowledge/${item.id}`))} className="text-primary hover:underline">
                    編集
                  </button>
                  {item.status === "draft" && (
                    <>
                      <button onClick={() => handleStatusChange(item.id, "active")} className="text-green-600 hover:underline">
                        承認
                      </button>
                      <button onClick={() => handleStatusChange(item.id, "rejected")} className="text-orange-600 hover:underline">
                        却下
                      </button>
                    </>
                  )}
                  {item.status === "active" && (
                    <button onClick={() => handleStatusChange(item.id, "inactive")} className="text-muted-foreground hover:underline">
                      無効化
                    </button>
                  )}
                  {item.status === "inactive" && (
                    <button onClick={() => handleStatusChange(item.id, "active")} className="text-muted-foreground hover:underline">
                      有効化
                    </button>
                  )}
                  <button onClick={() => handleDelete(item.id)} className="text-destructive hover:underline">
                    削除
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
