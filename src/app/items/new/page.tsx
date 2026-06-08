"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AccessoryCategory, AccessoryStatus } from "@/types/database";

const categories: { value: AccessoryCategory; label: string }[] = [
  { value: "ball", label: "ボール" },
  { value: "glove", label: "グローブ" },
  { value: "tee", label: "ティー" },
  { value: "other", label: "その他" },
];

const statuses: { value: AccessoryStatus; label: string }[] = [
  { value: "active", label: "使用中" },
  { value: "past", label: "アーカイブ" },
];

const inputClass = "w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]";

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
    <div className="flex flex-col gap-4 px-2 py-4">
      <h2 className="px-1 text-lg font-bold text-[#006728]">アイテムを追加</h2>
      <form onSubmit={handleSubmit} className="flex flex-col rounded-lg bg-white p-3">
        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-xs">カテゴリ</span>
          <select value={form.category} onChange={(e) => update("category", e.target.value)} required className={inputClass}>
            <option value="">選択してください</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-xs">ブランド</span>
          <input value={form.brand} onChange={(e) => update("brand", e.target.value)} placeholder="例: Titleist" className={inputClass} />
        </div>

        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-xs">モデル</span>
          <input value={form.model} onChange={(e) => update("model", e.target.value)} placeholder="例: Pro V1" className={inputClass} />
        </div>

        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-xs">メモ</span>
          <textarea value={form.memo} onChange={(e) => update("memo", e.target.value)} placeholder="使用感など..." rows={5} className={inputClass} />
        </div>

        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-xs">評価</span>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => update("rating", form.rating === star ? null : star)}
                className={`text-xl transition-colors ${
                  form.rating != null && star <= form.rating ? "text-amber-400" : "text-gray-300"
                }`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-xs">購入URL</span>
          <input type="url" value={form.purchase_url} onChange={(e) => update("purchase_url", e.target.value)} placeholder="https://..." className={inputClass} />
        </div>

        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-xs">ステータス</span>
          <select value={form.status} onChange={(e) => update("status", e.target.value)} className={inputClass}>
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </form>

      <div className="flex flex-col items-center gap-3 pt-3">
        <button onClick={(e) => handleSubmit(e)} disabled={isSubmitting} className="w-full max-w-xs rounded-full bg-[#006728] py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {isSubmitting ? "保存中..." : "保存する"}
        </button>
        <button type="button" onClick={() => router.back()} className="text-sm font-bold text-[#006728]">
          キャンセル
        </button>
      </div>
    </div>
  );
}
