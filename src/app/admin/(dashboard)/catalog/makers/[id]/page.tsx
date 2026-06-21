"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { AdminFormSection } from "@/components/admin/admin-form-section";
import { apiFetch } from "@/lib/api-client";

interface Maker {
  id: string;
  name: string;
  name_ja: string | null;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_visible: boolean;
  sort_order: number;
}

function MakerEditInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  const { data: makers = [] } = useSWR<Maker[]>(
    "/api/admin/catalog/makers",
    async (url: string) => {
      const res = await apiFetch(url);
      return res.ok ? res.json() : [];
    }
  );

  const [form, setForm] = useState<Partial<Maker> | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized || makers.length === 0) return;
    const maker = makers.find((m) => m.id === id);
    if (maker) {
      setForm(maker);
      setInitialized(true);
    }
  }, [makers, id, initialized]);

  async function handleImageUpload(file: File) {
    const formData = new FormData();
    formData.append("model_id", `maker-${id}`);
    formData.append("file", file);
    const res = await apiFetch("/api/admin/catalog/model-images", { method: "POST", body: formData });
    if (res.ok) {
      const data = await res.json();
      setForm((prev) => prev ? { ...prev, image_url: data.image_url } : prev);
      await apiFetch("/api/admin/catalog/makers", {
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
      await apiFetch("/api/admin/catalog/makers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: form.name,
          name_ja: form.name_ja || null,
          slug: form.slug,
          description: form.description || null,
          image_url: form.image_url || null,
          is_visible: form.is_visible,
        }),
      });
      alert("保存しました");
    } finally {
      setSaving(false);
    }
  }

  if (!initialized) return <div className="p-4 text-sm text-[#888]">読み込み中...</div>;
  if (!form) return <div className="p-4 text-sm text-red-600">メーカーが見つかりません</div>;

  return (
    <div className="space-y-4 p-4 max-w-2xl">
      <AdminBreadcrumb items={[
        { label: "カタログ", href: "/admin/catalog" },
        { label: "メーカー管理", href: "/admin/catalog/makers" },
        { label: form.name ?? "" },
      ]} />
      <h1 className="text-xl font-bold">{form.name}</h1>

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
            <label className="block text-xs font-bold text-[#555]">
              名前 *
              <input
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-bold text-[#555]">
              日本語名
              <input
                value={form.name_ja ?? ""}
                onChange={(e) => setForm({ ...form, name_ja: e.target.value || null })}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-bold text-[#555] col-span-2">
              Slug *
              <input
                value={form.slug ?? ""}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm font-mono"
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

        <label className="flex items-center gap-2 text-xs font-bold text-[#555]">
          <input
            type="checkbox"
            checked={form.is_visible ?? false}
            onChange={(e) => setForm({ ...form, is_visible: e.target.checked })}
          />
          公開する
        </label>
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
          onClick={() => router.push("/admin/catalog/makers")}
          className="rounded border border-[#ddd] px-6 py-2 text-sm hover:bg-[#f5f5f5]"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

export default function MakerEditPage() {
  return <Suspense><MakerEditInner /></Suspense>;
}
