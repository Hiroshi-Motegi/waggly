"use client";
import { Loading } from "@/components/loading";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { apiFetch } from "@/lib/api-client";
import { toAffiliateUrl, getUrlPlatform } from "@/lib/affiliate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFormValidation } from "@/hooks/use-form-validation";
import { accessoryValidationSchema } from "@/lib/form-validation";
import { FieldError } from "@/components/ui/field-error";
import { ImagePicker } from "@/components/ui/image-picker";
import { ProcessingOverlay } from "@/components/ui/processing-overlay";
import type { Accessory, AccessoryCategory, AccessoryStatus } from "@/types/database";

const categoryLabels: Record<AccessoryCategory, string> = {
  ball: "ボール",
  glove: "グローブ",
  tee: "ティー",
  apparel: "アパレル",
  bag: "バッグ",
  rangefinder: "距離計",
  grip: "グリップ",
  shaft: "シャフト",
  other: "その他",
};

const categoryIcons: Record<AccessoryCategory, string> = {
  ball: "/no-images/ball.png",
  glove: "/no-images/globe.png",
  tee: "/no-images/tee.png",
  apparel: "/no-images/ware.png",
  bag: "/no-images/bag.png",
  rangefinder: "/no-images/distance.png",
  grip: "/no-images/grip.png",
  shaft: "/no-images/shaft.png",
  other: "/no-images/etc.png",
};

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

function StarRating({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-base text-[#8b8b8b]">未評価</span>;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`text-sm ${i <= rating ? "text-amber-400" : "text-gray-300"}`}>
          ★
        </span>
      ))}
    </div>
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
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deleteImage, setDeleteImage] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const { validateOnChange, validateOnSubmit, fieldError } = useFormValidation(accessoryValidationSchema);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch(`/api/accessories/${id}`);
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
    validateOnChange(field, value);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!validateOnSubmit(editForm as any)) return;
    setIsSubmitting(true);
    try {
      // Handle image delete
      if (deleteImage) {
        await apiFetch(`/api/accessories/${id}/image`, { method: "DELETE" });
      }
      // Handle image upload
      if (pendingFile) {
        const formData = new FormData();
        formData.append("file", pendingFile);
        await apiFetch(`/api/accessories/${id}/image`, { method: "POST", body: formData });
      }
      // Save form data
      const body = {
        category: editForm.category,
        brand: editForm.brand || null,
        model: editForm.model || null,
        memo: editForm.memo || null,
        rating: editForm.rating ?? null,
        status: editForm.status,
        purchase_url: editForm.purchase_url || null,
      };
      const res = await apiFetch(`/api/accessories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update");
      // Reload latest data
      const refetchRes = await apiFetch(`/api/accessories/${id}`);
      const updated = await refetchRes.json();
      setItem(updated);
      setEditForm(updated);
      resetImageState();
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update accessory:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetImageState() {
    setPendingFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setDeleteImage(false);
  }

  async function handleDelete() {
    if (!confirm("このアイテムを削除しますか？")) return;
    const res = await apiFetch(`/api/accessories/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/items");
    }
  }

  async function handleStatusChange(newStatus: AccessoryStatus) {
    const res = await apiFetch(`/api/accessories/${id}`, {
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

  if (isLoading) return <Loading variant="light" />;
  if (!item) return <p className="p-4 text-center text-muted-foreground">アイテムが見つかりません</p>;

  function handleImageDelete() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
    setDeleteImage(true);
  }

  if (isEditing) {
    return (
      <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
        <img src="/images/home-bg.jpg" alt="" className="fixed inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
        {isSubmitting && <ProcessingOverlay />}
        <div className="relative z-10 flex flex-col space-y-2">
        <h2 className="px-1 text-lg font-bold text-white">アイテムを編集</h2>
        <form onSubmit={handleSave} className="flex flex-col rounded-lg bg-white p-3">
          {/* 画像 */}
          <div className="flex flex-col gap-0.5 py-1">
            <span className="text-sm">画像</span>
            {(() => {
              const displayUrl = deleteImage ? null : (previewUrl ?? item?.image_url);
              return (
                <div className="flex flex-col items-center gap-1">
                  {displayUrl ? (
                    <img src={displayUrl} alt="" className="max-h-[229px] rounded object-contain" />
                  ) : (
                    <ImagePicker onPick={(file) => {
                      if (previewUrl) URL.revokeObjectURL(previewUrl);
                      setPendingFile(file);
                      setPreviewUrl(URL.createObjectURL(file));
                      setDeleteImage(false);
                    }}>
                      <button
                        type="button"
                        className="h-32 w-full rounded border-2 border-dashed border-[#c4c4c4] flex items-center justify-center text-base text-[#8b8b8b]"
                      >
                        写真を追加
                      </button>
                    </ImagePicker>
                  )}
                  {displayUrl && (
                    <div className="flex gap-2.5">
                      <ImagePicker onPick={(file) => {
                        if (previewUrl) URL.revokeObjectURL(previewUrl);
                        setPendingFile(file);
                        setPreviewUrl(URL.createObjectURL(file));
                        setDeleteImage(false);
                      }}>
                        <button type="button" className="rounded-full border border-[#006728] px-5 py-1 text-sm font-bold text-[#006728]">
                          変更する
                        </button>
                      </ImagePicker>
                      <button type="button" onClick={handleImageDelete} className="rounded-full border border-[#006728] px-5 py-1 text-sm font-bold text-[#006728]">
                        削除する
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* カテゴリ */}
          <div data-field="category" className="flex flex-col gap-0.5 py-1">
            <span className="text-sm">カテゴリ</span>
            <select
              value={editForm.category ?? ""}
              onChange={(e) => updateEdit("category", e.target.value)}
              className={`w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728] ${fieldError("category") ? "!border-red-400" : ""}`}
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <FieldError message={fieldError("category")} />
          </div>

          {/* ブランド・メーカー */}
          <div data-field="brand" className="flex flex-col gap-0.5 py-1">
            <span className="text-sm">ブランド・メーカー</span>
            <input value={editForm.brand ?? ""} onChange={(e) => updateEdit("brand", e.target.value)} placeholder="メーカー名" className={`w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728] ${fieldError("brand") ? "!border-red-400" : ""}`} />
            <FieldError message={fieldError("brand")} />
          </div>

          {/* 商品名・モデル */}
          <div data-field="model" className="flex flex-col gap-0.5 py-1">
            <span className="text-sm">商品名・モデル</span>
            <input value={editForm.model ?? ""} onChange={(e) => updateEdit("model", e.target.value)} placeholder="モデル名" className={`w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728] ${fieldError("model") ? "!border-red-400" : ""}`} />
            <FieldError message={fieldError("model")} />
          </div>

          {/* メモ */}
          <div data-field="memo" className="flex flex-col gap-0.5 py-1">
            <span className="text-sm">メモ</span>
            <textarea value={editForm.memo ?? ""} onChange={(e) => updateEdit("memo", e.target.value)} placeholder="使用感など..." rows={5} className={`w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728] ${fieldError("memo") ? "!border-red-400" : ""}`} />
            <FieldError message={fieldError("memo")} />
          </div>

          {/* 評価 */}
          <div className="flex flex-col gap-0.5 py-1">
            <span className="text-sm">評価</span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => updateEdit("rating", editForm.rating === star ? null : star)}
                  className={`text-xl transition-colors ${
                    editForm.rating != null && star <= editForm.rating ? "text-amber-400" : "text-gray-300"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* 購入URL */}
          <div data-field="purchase_url" className="flex flex-col gap-0.5 py-1">
            <span className="text-sm">購入URL</span>
            <input type="url" value={editForm.purchase_url ?? ""} onChange={(e) => updateEdit("purchase_url", e.target.value)} placeholder="https://..." className={`w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728] ${fieldError("purchase_url") ? "!border-red-400" : ""}`} />
            <FieldError message={fieldError("purchase_url")} />
          </div>

          {/* ステータス */}
          <div className="flex flex-col gap-0.5 py-1">
            <span className="text-sm">ステータス</span>
            <select
              value={editForm.status ?? "active"}
              onChange={(e) => updateEdit("status", e.target.value)}
              className="w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
            >
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </form>

        {/* Buttons outside card */}
        <div className="flex flex-col items-center gap-2 px-6 pt-4 pb-2">
          <button onClick={(e) => { e.preventDefault(); handleSave(e); }} disabled={isSubmitting} className="w-full max-w-xs rounded-full bg-white py-2.5 text-base font-bold text-[#006728] disabled:opacity-50">
            {isSubmitting ? "保存中..." : "保存する"}
          </button>
          <button type="button" onClick={() => { resetImageState(); setIsEditing(false); }} className="text-base font-bold text-white">
            キャンセル
          </button>
        </div>
        </div>
      </div>
    );
  }

  const statusLabel = item.status === "active" ? "使用中" : "アーカイブ";

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <img src="/images/home-bg.jpg" alt="" className="fixed inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col space-y-2">
      <PageHeader
        title={[item.brand, item.model].filter(Boolean).join(" ") || "—"}
        subtitle={categoryLabels[item.category]}
        variant="dark"
      >
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center justify-center rounded-full bg-white p-2"
          >
            <Pencil className="h-4 w-4 text-[#006728]" />
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center justify-center rounded-full bg-white p-2"
          >
            <Trash2 className="h-4 w-4 text-[#006728]" />
          </button>
        </div>
      </PageHeader>

      {/* Card */}
      <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
        {/* Image */}
        <div className="flex items-center justify-center py-2">
          {item.image_url ? (
            <img src={item.image_url} alt={item.model ?? ""} className="max-h-[229px] rounded object-contain" />
          ) : (
            <img src={categoryIcons[item.category]} alt="" className="h-[100px] opacity-40" />
          )}
        </div>

        {/* Detail rows */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2.5 border-b border-[#dfdfdf] py-2 text-base">
            <span className="shrink-0">ステータス</span>
            <span className="flex-1 text-right">{statusLabel}</span>
          </div>
          {item.brand && (
            <div className="flex items-center gap-2.5 border-b border-[#dfdfdf] py-2 text-base">
              <span className="shrink-0">ブランド・メーカー</span>
              <span className="flex-1 text-right">{item.brand}</span>
            </div>
          )}
          {item.model && (
            <div className="flex items-center gap-2.5 border-b border-[#dfdfdf] py-2 text-base">
              <span className="shrink-0">商品名・モデル</span>
              <span className="flex-1 text-right">{item.model}</span>
            </div>
          )}
          <div className="flex items-center gap-2.5 py-2 text-base">
            <span className="flex-1">評価</span>
            <StarRating rating={item.rating} />
          </div>
        </div>

        {/* Memo */}
        {item.memo && (
          <div className="border-t border-[#dfdfdf] pt-2">
            <p className="text-sm font-medium text-[#8b8b8b] mb-1">メモ</p>
            <p className="text-base whitespace-pre-wrap">{item.memo}</p>
          </div>
        )}
      </div>

      {/* Purchase URL */}
      {item.purchase_url && (() => {
        const affiliateUrl = toAffiliateUrl(item.purchase_url!);
        const platform = getUrlPlatform(item.purchase_url!);
        const platformLabel = platform === "amazon" ? "Amazonで購入" : platform === "rakuten" ? "楽天で購入" : "購入する";
        return (
          <div className="flex flex-col items-center pt-2">
            <a
              href={affiliateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white bg-transparent px-5 py-1 text-base font-bold text-white"
            >
              {platformLabel}
            </a>
          </div>
        );
      })()}

      {/* Archive / Restore */}
      <div className="flex flex-col items-center">
        {item.status === "active" ? (
          <button
            onClick={() => handleStatusChange("past")}
            className="text-base font-bold text-white"
          >
            アーカイブに移動
          </button>
        ) : (
          <button
            onClick={() => handleStatusChange("active")}
            className="text-base font-bold text-white"
          >
            使用中に戻す
          </button>
        )}
      </div>
      </div>
    </div>
  );
}
