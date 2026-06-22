"use client";

import { Suspense, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { AdminFormSection } from "@/components/admin/admin-form-section";
import { apiFetch } from "@/lib/api-client";

// バックライン情報をmaterialフィールドに埋め込む（PostgRESTスキーマキャッシュ問題の回避策）
function encodeMaterial(material: string, backline: boolean | null): string | null {
  const parts: string[] = [];
  if (material) parts.push(material);
  if (backline === true) parts.push("[BL:有]");
  if (backline === false) parts.push("[BL:無]");
  return parts.length > 0 ? parts.join(" ") : null;
}

interface Variant {
  grip_size: string;
  weight: string;
}

function GripNewForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    grip_name: "",
    maker: "",
    material: "",
    backline: null as boolean | null,
    description: "",
  });

  const [variants, setVariants] = useState<Variant[]>([{ grip_size: "", weight: "" }]);

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("model_id", `grip-new-${Date.now()}`);
      fd.append("file", file);
      const res = await apiFetch("/api/admin/catalog/model-images", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        setImageUrl(data.image_url);
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form.grip_name) return;
    setSaving(true);
    try {
      // Create one grip per variant (or one if no variants)
      const rows = variants.filter((v) => v.grip_size || v.weight).length > 0
        ? variants.filter((v) => v.grip_size || v.weight)
        : [{ grip_size: "", weight: "" }];

      for (const v of rows) {
        await apiFetch("/api/admin/catalog/grips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grip_name: form.grip_name,
            maker: form.maker || null,
            grip_size: v.grip_size || null,
            weight: v.weight ? Number(v.weight) : null,
            material: encodeMaterial(form.material, form.backline),
            image_url: imageUrl,
          }),
        });
      }
      router.push("/admin/catalog/grips");
    } finally {
      setSaving(false);
    }
  }

  function addVariant() {
    setVariants([...variants, { grip_size: "", weight: "" }]);
  }

  function removeVariant(idx: number) {
    setVariants(variants.filter((_, i) => i !== idx));
  }

  function updateVariant(idx: number, field: keyof Variant, value: string) {
    setVariants(variants.map((v, i) => i === idx ? { ...v, [field]: value } : v));
  }

  return (
    <div className="space-y-4 p-4 max-w-2xl">
      <AdminBreadcrumb items={[
        { label: "カタログ", href: "/admin/catalog" },
        { label: "グリップ管理", href: "/admin/catalog/grips" },
        { label: "新規追加" },
      ]} />
      <h1 className="text-xl font-bold">グリップ新規追加</h1>

      <AdminFormSection title="基本情報">
        <div className="flex gap-6">
          <div
            className="w-24 h-24 rounded-lg border border-[#e5e5e5] bg-[#f5f5f5] flex items-center justify-center overflow-hidden cursor-pointer shrink-0 hover:border-[#006728]"
            onClick={() => fileRef.current?.click()}
            title="クリックで画像追加"
          >
            {uploading ? (
              <span className="text-xs text-[#888]">アップロード中...</span>
            ) : imageUrl ? (
              <img src={imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-[#bbb]">写真を追加</span>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }}
          />
          <div className="grid grid-cols-2 gap-3 flex-1">
            <label className="block text-xs font-bold text-[#555] col-span-2">
              グリップ名 *
              <input
                value={form.grip_name}
                onChange={(e) => setForm({ ...form, grip_name: e.target.value })}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-bold text-[#555]">
              メーカー
              <input
                value={form.maker}
                onChange={(e) => setForm({ ...form, maker: e.target.value })}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-bold text-[#555]">
              素材
              <input
                value={form.material}
                onChange={(e) => setForm({ ...form, material: e.target.value })}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
                placeholder="ラバー, コード 等"
              />
            </label>
            <label className="block text-xs font-bold text-[#555]">
              バックライン
              <select
                value={form.backline === null ? "" : form.backline ? "true" : "false"}
                onChange={(e) => setForm({ ...form, backline: e.target.value === "" ? null : e.target.value === "true" })}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
              >
                <option value="">未設定</option>
                <option value="true">有</option>
                <option value="false">無</option>
              </select>
            </label>
          </div>
        </div>
      </AdminFormSection>

      <AdminFormSection title="サイズ・重量バリエーション">
        <div className="space-y-2">
          {variants.map((v, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={v.grip_size}
                onChange={(e) => updateVariant(i, "grip_size", e.target.value)}
                placeholder="サイズ（M58, M60 等）"
                className="h-8 w-40 rounded border border-input px-2 text-xs"
              />
              <input
                value={v.weight}
                onChange={(e) => updateVariant(i, "weight", e.target.value)}
                placeholder="重量(g)"
                className="h-8 w-24 rounded border border-input px-2 text-xs"
              />
              {variants.length > 1 && (
                <button onClick={() => removeVariant(i)} className="text-[#ccc] hover:text-red-600 text-xs">&times;</button>
              )}
            </div>
          ))}
          <button onClick={addVariant} className="text-xs font-bold text-[#006728] hover:underline">
            ＋ バリエーション追加
          </button>
        </div>
      </AdminFormSection>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !form.grip_name}
          className="rounded bg-[#006728] px-6 py-2 text-sm font-bold text-white hover:bg-[#005520] disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
        <button
          onClick={() => router.push("/admin/catalog/grips")}
          className="rounded border border-[#ddd] px-6 py-2 text-sm hover:bg-[#f5f5f5]"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

export default function GripNewPage() {
  return <Suspense><GripNewForm /></Suspense>;
}
