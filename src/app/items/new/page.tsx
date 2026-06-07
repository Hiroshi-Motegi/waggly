"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AccessoryCategory, AccessoryStatus } from "@/types/database";

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

export default function NewItemPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    category: "" as AccessoryCategory | "",
    brand: "",
    model: "",
    memo: "",
    rating: null as number | null,
    status: "active" as AccessoryStatus,
    purchase_url: "",
  });

  function update(field: string, value: string | number | null | undefined) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.category) return;
    setIsSubmitting(true);
    try {
      const body = {
        category: form.category,
        brand: form.brand || null,
        model: form.model || null,
        memo: form.memo || null,
        rating: form.rating,
        status: form.status,
        purchase_url: form.purchase_url || null,
      };
      const res = await fetch("/api/accessories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create");
      router.push("/items");
    } catch (error) {
      console.error("Failed to create accessory:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <h2 className="px-4 pt-4 text-xl font-bold">アイテムを追加</h2>
      <form onSubmit={handleSubmit} className="space-y-6 p-4 pb-8">
        <div className="space-y-2">
          <Label htmlFor="category">カテゴリ</Label>
          <select
            id="category"
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            required
            className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">選択してください</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="brand">ブランド</Label>
          <Input
            id="brand"
            value={form.brand}
            onChange={(e) => update("brand", e.target.value)}
            placeholder="例: Titleist"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">モデル</Label>
          <Input
            id="model"
            value={form.model}
            onChange={(e) => update("model", e.target.value)}
            placeholder="例: Pro V1"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="memo">メモ</Label>
          <Textarea
            id="memo"
            value={form.memo}
            onChange={(e) => update("memo", e.target.value)}
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
                onClick={() => update("rating", form.rating === star ? null : star)}
                className={`text-2xl transition-colors ${
                  form.rating != null && star <= form.rating
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
            value={form.purchase_url}
            onChange={(e) => update("purchase_url", e.target.value)}
            placeholder="https://..."
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">ステータス</Label>
          <select
            id="status"
            value={form.status}
            onChange={(e) => update("status", e.target.value)}
            className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : "保存"}
        </Button>
      </form>
    </div>
  );
}
