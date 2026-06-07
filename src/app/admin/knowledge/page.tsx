"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface KnowledgeItem {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[] | null;
  source: string | null;
  is_active: boolean;
  created_at: string;
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

export default function KnowledgePage() {
  const router = useRouter();
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");

  async function fetchItems() {
    setIsLoading(true);
    const params = filterCategory ? `?category=${filterCategory}` : "";
    const res = await fetch(`/api/admin/knowledge${params}`);
    if (res.ok) setItems(await res.json());
    setIsLoading(false);
  }

  useEffect(() => { fetchItems(); }, [filterCategory]);

  async function handleDelete(id: string) {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/admin/knowledge/${id}`, { method: "DELETE" });
    fetchItems();
  }

  async function handleToggle(id: string, isActive: boolean) {
    await fetch(`/api/admin/knowledge/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !isActive }),
    });
    fetchItems();
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">教師データ管理</h1>
      <p className="text-xs text-muted-foreground">このページはアプリからはアクセスできません</p>

      <div className="flex gap-2">
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
        <p className="text-center text-muted-foreground">読み込み中...</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id} className={item.is_active ? "" : "opacity-50"}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">
                    {categories.find((c) => c.value === item.category)?.label ?? item.category}
                  </Badge>
                  <span className="text-sm font-medium">{item.title}</span>
                  {!item.is_active && <Badge variant="outline">無効</Badge>}
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{item.content}</p>
                {item.tags && item.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
                {item.source && <p className="text-xs text-muted-foreground">出典: {item.source}</p>}
                <Separator />
                <div className="flex gap-2 text-xs">
                  <button onClick={() => router.push(`/admin/knowledge/${item.id}`)} className="text-primary hover:underline">編集</button>
                  <button onClick={() => handleToggle(item.id, item.is_active)} className="text-muted-foreground hover:underline">
                    {item.is_active ? "無効化" : "有効化"}
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="text-destructive hover:underline">削除</button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
