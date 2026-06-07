"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Accessory, AccessoryCategory, AccessoryStatus } from "@/types/database";

const categoryLabels: Record<AccessoryCategory, string> = {
  ball: "ボール",
  glove: "グローブ",
  tee: "ティー",
  other: "その他",
};

const categories: { value: AccessoryCategory; label: string }[] = [
  { value: "ball", label: "ボール" },
  { value: "glove", label: "グローブ" },
  { value: "tee", label: "ティー" },
  { value: "other", label: "その他" },
];

const statuses: { value: AccessoryStatus; label: string }[] = [
  { value: "active", label: "使用中" },
  { value: "past", label: "過去" },
];

function StarRating({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-muted-foreground text-sm">未評価</span>;
  return (
    <span className="text-amber-500">
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [item, setItem] = useState<Accessory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Accessory>>({});

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/accessories/${id}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setItem(data);
        setEditForm(data);
      } catch {
        setItem(null);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  function updateEdit(field: string, value: string | number | null | undefined) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm.category) return;
    setIsSubmitting(true);
    try {
      const body = {
        category: editForm.category,
        brand: editForm.brand || null,
        model: editForm.model || null,
        memo: editForm.memo || null,
        rating: editForm.rating ?? null,
        status: editForm.status,
        purchase_url: editForm.purchase_url || null,
      };
      const res = await fetch(`/api/accessories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      setItem(updated);
      setEditForm(updated);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update accessory:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("このアイテムを削除しますか？")) return;
    const res = await fetch(`/api/accessories/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/items");
    }
  }

  async function handleStatusChange(newStatus: AccessoryStatus) {
    const res = await fetch(`/api/accessories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setItem(updated);
      setEditForm(updated);
    }
  }

  if (isLoading) return <p className="p-4 text-center text-muted-foreground">読み込み中...</p>;
  if (!item) return <p className="p-4 text-center text-muted-foreground">アイテムが見つかりません</p>;

  if (isEditing) {
    return (
      <div>
        <h2 className="px-4 pt-4 text-xl font-bold">アイテムを編集</h2>
        <form onSubmit={handleSave} className="space-y-6 p-4 pb-8">
          <div className="space-y-2">
            <Label htmlFor="category">カテゴリ</Label>
            <select
              id="category"
              value={editForm.category ?? ""}
              onChange={(e) => updateEdit("category", e.target.value)}
              required
              className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand">ブランド</Label>
            <Input
              id="brand"
              value={editForm.brand ?? ""}
              onChange={(e) => updateEdit("brand", e.target.value)}
              placeholder="例: Titleist"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">モデル</Label>
            <Input
              id="model"
              value={editForm.model ?? ""}
              onChange={(e) => updateEdit("model", e.target.value)}
              placeholder="例: Pro V1"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="memo">メモ</Label>
            <Textarea
              id="memo"
              value={editForm.memo ?? ""}
              onChange={(e) => updateEdit("memo", e.target.value)}
              placeholder="使用感など..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>評価</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => updateEdit("rating", editForm.rating === star ? null : star)}
                  className={`text-2xl transition-colors ${
                    editForm.rating != null && star <= editForm.rating
                      ? "text-amber-500"
                      : "text-muted-foreground"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchase_url">購入URL</Label>
            <Input
              id="purchase_url"
              type="url"
              value={editForm.purchase_url ?? ""}
              onChange={(e) => updateEdit("purchase_url", e.target.value)}
              placeholder="https://..."
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">ステータス</Label>
            <select
              id="status"
              value={editForm.status ?? "active"}
              onChange={(e) => updateEdit("status", e.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
              キャンセル
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "保存中..." : "保存"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{categoryLabels[item.category]}</p>
          <h2 className="text-xl font-bold">
            {[item.brand, item.model].filter(Boolean).join(" ") || "—"}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status change */}
      <div className="flex gap-2">
        {item.status !== "active" && (
          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleStatusChange("active")}>
            使用中にする
          </Button>
        )}
        {item.status !== "past" && (
          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleStatusChange("past")}>
            過去にする
          </Button>
        )}
      </div>

      {/* Details */}
      <Card>
        <CardHeader><CardTitle className="text-base">詳細</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">ステータス</span>
            <span>{item.status === "active" ? "使用中" : "過去"}</span>
          </div>
          {item.brand && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">ブランド</span>
              <span>{item.brand}</span>
            </div>
          )}
          {item.model && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">モデル</span>
              <span>{item.model}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">評価</span>
            <StarRating rating={item.rating} />
          </div>
          {item.memo && (
            <div className="space-y-1">
              <span className="text-muted-foreground">メモ</span>
              <p className="text-sm whitespace-pre-wrap">{item.memo}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase URL */}
      {item.purchase_url && (
        <a
          href={item.purchase_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          購入する
        </a>
      )}
    </div>
  );
}
