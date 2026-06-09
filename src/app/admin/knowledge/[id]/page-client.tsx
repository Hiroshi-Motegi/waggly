"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";

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

export default function KnowledgeEditPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [meta, setMeta] = useState<{
    status: string;
    analysis_summary: string | null;
    search_sources: string[] | null;
    generated_at: string | null;
  } | null>(null);
  const [form, setForm] = useState({
    category: "swing_basics",
    title: "",
    content: "",
    tags: "",
    source: "",
  });

  useEffect(() => {
    if (isNew) return;
    apiFetch(`/api/admin/knowledge/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setForm({
          category: data.category,
          title: data.title,
          content: data.content,
          tags: data.tags?.join(", ") ?? "",
          source: data.source ?? "",
        });
        setMeta({
          status: data.status,
          analysis_summary: data.analysis_summary,
          search_sources: data.search_sources,
          generated_at: data.generated_at,
        });
      })
      .finally(() => setIsLoading(false));
  }, [id, isNew]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);

    const body = {
      category: form.category,
      title: form.title,
      content: form.content,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      source: form.source || null,
    };

    if (isNew) {
      await apiFetch("/api/admin/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, status: "active" }),
      });
    } else {
      await apiFetch(`/api/admin/knowledge/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    router.push("/admin/knowledge");
  }

  async function handleApprove() {
    await apiFetch(`/api/admin/knowledge/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });
    router.push("/admin/knowledge");
  }

  async function handleReject() {
    await apiFetch(`/api/admin/knowledge/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    router.push("/admin/knowledge");
  }

  if (isLoading) {
    return <p className="text-center text-muted-foreground p-8">読み込み中...</p>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/knowledge")}>
          ← 戻る
        </Button>
        <h1 className="text-xl font-bold">{isNew ? "教師データ追加" : "教師データ編集"}</h1>
      </div>

      {/* Auto-generated metadata */}
      {meta?.status === "draft" && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="default">レビュー待ち</Badge>
              {meta.generated_at && (
                <span className="text-xs text-muted-foreground">
                  {new Date(meta.generated_at).toLocaleDateString("ja-JP")} 自動生成
                </span>
              )}
            </div>
            {meta.analysis_summary && (
              <p className="text-sm"><span className="font-medium">分析理由:</span> {meta.analysis_summary}</p>
            )}
            {meta.search_sources && meta.search_sources.length > 0 && (
              <div className="text-sm">
                <span className="font-medium">参照URL:</span>
                <ul className="list-disc list-inside mt-1">
                  {meta.search_sources.map((url, i) => (
                    <li key={i}>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs break-all">
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleApprove}>承認して有効化</Button>
              <Button size="sm" variant="outline" onClick={handleReject}>却下</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>カテゴリ</Label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label>タイトル</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="例: 正しい軸回転の基本"
                required
              />
            </div>

            <div className="space-y-1">
              <Label>コンテンツ</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="教師データの内容...&#10;&#10;改行で段落を分けて書けます"
                rows={12}
                className="h-auto"
                required
              />
            </div>

            <div className="space-y-1">
              <Label>タグ（カンマ区切り）</Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="例: スイング, 軸, 回転"
              />
            </div>

            <div className="space-y-1">
              <Label>出典</Label>
              <Input
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                placeholder="例: PGA Teaching Manual"
              />
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => router.push("/admin/knowledge")}>
                キャンセル
              </Button>
              <Button type="submit" className="flex-1" disabled={isSaving}>
                {isSaving ? "保存中..." : isNew ? "追加" : "更新"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
