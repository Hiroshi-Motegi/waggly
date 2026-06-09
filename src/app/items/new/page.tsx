"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { isNative } from "@/lib/platform";
import type { AccessoryCategory, AccessoryStatus } from "@/types/database";

const categories: { value: AccessoryCategory; label: string }[] = [
  { value: "ball", label: "ボール" },
  { value: "glove", label: "グローブ" },
  { value: "tee", label: "ティー" },
  { value: "apparel", label: "アパレル" },
  { value: "bag", label: "バッグ" },
  { value: "rangefinder", label: "距離計" },
  { value: "grip", label: "グリップ" },
  { value: "shaft", label: "シャフト" },
  { value: "other", label: "その他" },
];

const statuses: { value: AccessoryStatus; label: string }[] = [
  { value: "active", label: "使用中" },
  { value: "past", label: "アーカイブ" },
];

const inputClass = "w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]";

export default function NewItemPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
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
      const res = await apiFetch("/api/accessories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create");
      const created = await res.json();

      // Upload image if selected
      if (pendingFile) {
        const formData = new FormData();
        formData.append("file", pendingFile);
        await apiFetch(`/api/accessories/${created.id}/image`, {
          method: "POST",
          body: formData,
        });
      }

      router.push("/items");
    } catch (error) {
      console.error("Failed to create accessory:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col space-y-2">
      <h2 className="px-1 text-lg font-bold text-white">アイテムを追加</h2>
      <form onSubmit={handleSubmit} className="flex flex-col rounded-lg bg-white p-3">
        {/* 画像 */}
        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-sm">画像</span>
          <div className="flex gap-2">
            {previewUrl && (
              <div className="relative h-20 w-20 shrink-0">
                <img src={previewUrl} alt="Preview" className="h-20 w-20 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {!previewUrl && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-[#c4c4c4] text-[#8b8b8b]"
              >
                <Plus className="h-6 w-6" />
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-sm">カテゴリ</span>
          <select value={form.category} onChange={(e) => update("category", e.target.value)} required className={inputClass}>
            <option value="">選択してください</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-sm">ブランド・メーカー</span>
          <input value={form.brand} onChange={(e) => update("brand", e.target.value)} placeholder="例: Titleist" className={inputClass} />
        </div>

        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-sm">商品名・モデル</span>
          <input value={form.model} onChange={(e) => update("model", e.target.value)} placeholder="例: Pro V1" className={inputClass} />
        </div>

        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-sm">メモ</span>
          <textarea value={form.memo} onChange={(e) => update("memo", e.target.value)} placeholder="使用感など..." rows={5} className={inputClass} />
        </div>

        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-sm">評価</span>
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
          <span className="text-sm">購入URL</span>
          <input type="url" value={form.purchase_url} onChange={(e) => update("purchase_url", e.target.value)} placeholder="https://..." className={inputClass} />
        </div>

        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-sm">ステータス</span>
          <select value={form.status} onChange={(e) => update("status", e.target.value)} className={inputClass}>
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </form>

      <div className="flex flex-col items-center gap-2 px-6 pt-4 pb-2">
        <button onClick={(e) => handleSubmit(e)} disabled={isSubmitting} className="w-full max-w-xs rounded-full bg-white py-2.5 text-base font-bold text-[#006728] disabled:opacity-50">
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              保存中...
            </span>
          ) : "保存する"}
        </button>
        <button type="button" onClick={() => router.back()} className="text-base font-bold text-white">
          キャンセル
        </button>
      </div>
      </div>
    </div>
  );
}
