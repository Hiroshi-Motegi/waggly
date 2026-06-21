"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { AdminFormSection } from "@/components/admin/admin-form-section";
import { apiFetch } from "@/lib/api-client";

interface Grip {
  id: string;
  grip_name: string;
  maker: string | null;
  grip_size: string | null;
  weight: number | null;
  material: string | null;
  description: string | null;
  image_url: string | null;
  is_visible: boolean;
  verification_status: string;
}

function GripEditInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  const { data: grips = [] } = useSWR<Grip[]>(
    "/api/admin/catalog/grips",
    async (url: string) => {
      const res = await apiFetch(url);
      return res.ok ? res.json() : [];
    }
  );

  const [form, setForm] = useState<Partial<Grip> | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized || grips.length === 0) return;
    const grip = grips.find((g) => g.id === id);
    if (grip) {
      setForm(grip);
      setInitialized(true);
    }
  }, [grips, id, initialized]);

  async function handleImageUpload(file: File) {
    const formData = new FormData();
    formData.append("model_id", `grip-${id}`);
    formData.append("file", file);
    const res = await apiFetch("/api/admin/catalog/model-images", { method: "POST", body: formData });
    if (res.ok) {
      const data = await res.json();
      setForm((prev) => prev ? { ...prev, image_url: data.image_url } : prev);
      // Also persist image_url via PATCH
      await apiFetch("/api/admin/catalog/grips", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, image_url: data.image_url }),
      });
    }
  }

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    try {
      await apiFetch("/api/admin/catalog/grips", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          grip_name: form.grip_name,
          maker: form.maker || null,
          grip_size: form.grip_size || null,
          weight: form.weight,
          material: form.material || null,
          description: form.description || null,
          image_url: form.image_url || null,
          is_visible: form.is_visible,
          verification_status: form.verification_status,
        }),
      });
      alert("保存しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("このグリップを削除しますか？")) return;
    await apiFetch("/api/admin/catalog/grips", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.push("/admin/catalog/grips");
  }

  if (!initialized) return <div className="p-4 text-sm text-[#888]">読み込み中...</div>;
  if (!form) return <div className="p-4 text-sm text-red-600">グリップが見つかりません</div>;

  return (
    <div className="space-y-4 p-4 max-w-2xl">
      <AdminBreadcrumb items={[
        { label: "カタログ", href: "/admin/catalog" },
        { label: "グリップ管理", href: "/admin/catalog/grips" },
        { label: form.grip_name ?? "" },
      ]} />
      <h1 className="text-xl font-bold">{form.grip_name}</h1>

      <AdminFormSection title="基本情報">
        <div className="flex gap-6">
          <div
            className="w-24 h-24 rounded-lg border border-[#e5e5e5] bg-[#f5f5f5] flex items-center justify-center overflow-hidden cursor-pointer shrink-0 hover:border-[#006728]"
            onClick={() => fileRef.current?.click()}
            title="クリックで画像変更"
          >
            {form.image_url ? (
              <img src={form.image_url} alt="" className="w-full h-full object-cover" />
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
              グリップ名
              <input
                value={form.grip_name ?? ""}
                onChange={(e) => setForm({ ...form, grip_name: e.target.value })}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-bold text-[#555]">
              メーカー
              <input
                value={form.maker ?? ""}
                onChange={(e) => setForm({ ...form, maker: e.target.value })}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-bold text-[#555]">
              サイズ
              <input
                value={form.grip_size ?? ""}
                onChange={(e) => setForm({ ...form, grip_size: e.target.value })}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
                placeholder="M58, M60 等"
              />
            </label>
            <label className="block text-xs font-bold text-[#555]">
              重量(g)
              <input
                type="number"
                value={form.weight ?? ""}
                onChange={(e) => setForm({ ...form, weight: e.target.value ? Number(e.target.value) : null })}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-bold text-[#555]">
              素材
              <input
                value={form.material ?? ""}
                onChange={(e) => setForm({ ...form, material: e.target.value })}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
                placeholder="ラバー, コード 等"
              />
            </label>
          </div>
        </div>

        <label className="block text-xs font-bold text-[#555]">
          説明 (Markdown)
          <textarea
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={6}
            className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm font-mono"
          />
        </label>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-xs font-bold text-[#555]">
            <input
              type="checkbox"
              checked={form.is_visible ?? false}
              onChange={(e) => setForm({ ...form, is_visible: e.target.checked })}
            />
            公開する
          </label>
          <label className="flex items-center gap-2 text-xs font-bold text-[#555]">
            確認状態
            <select
              value={form.verification_status ?? "unverified"}
              onChange={(e) => setForm({ ...form, verification_status: e.target.value })}
              className="rounded-md border border-input px-2 py-1 text-sm"
            >
              <option value="unverified">未確認</option>
              <option value="in_review">確認中</option>
              <option value="verified">確認済み</option>
            </select>
          </label>
        </div>
      </AdminFormSection>

      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
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
        <button
          onClick={handleDelete}
          className="ml-auto rounded border border-red-300 px-6 py-2 text-sm text-red-600 hover:bg-red-50"
        >
          削除
        </button>
      </div>
    </div>
  );
}

export default function GripEditPage() {
  return <Suspense><GripEditInner /></Suspense>;
}
