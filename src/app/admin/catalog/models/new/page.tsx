"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { AdminFormSection } from "@/components/admin/admin-form-section";
import { apiFetch } from "@/lib/api-client";

interface Maker { id: string; name: string; slug: string; }

const categories = [
  { value: "driver", slug: "driver", label: "ドライバー" },
  { value: "fairway", slug: "fairway", label: "フェアウェイウッド" },
  { value: "utility", slug: "utility", label: "ユーティリティ" },
  { value: "iron", slug: "iron", label: "アイアン" },
  { value: "wedge", slug: "wedge", label: "ウェッジ" },
  { value: "putter", slug: "putter", label: "パター" },
];

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function ModelNewForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", maker_id: "", category: "driver", slug: "",
    release_year: new Date().getFullYear(), release_month: null as number | null,
    price: null as number | null, is_visible: false,
  });

  const { data: makers = [] } = useSWR<Maker[]>("/api/admin/catalog/makers", async (url: string) => {
    const res = await apiFetch(url); return res.ok ? res.json() : [];
  });

  const selectedMaker = makers.find((m) => m.id === form.maker_id);
  const selectedCategory = categories.find((c) => c.value === form.category);

  function handleNameChange(name: string) {
    setForm({ ...form, name, slug: toSlug(name) });
  }

  async function handleSave() {
    if (!form.name || !form.maker_id || !form.category) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/admin/catalog/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          maker_id: form.maker_id,
          maker: selectedMaker?.name ?? "",
          maker_slug: selectedMaker?.slug ?? "",
          category: form.category,
          category_slug: selectedCategory?.slug ?? form.category,
          slug: form.slug || toSlug(form.name),
          release_year: form.release_year,
          release_month: form.release_month,
          price: form.price,
          is_visible: form.is_visible,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/admin/catalog/models/${data.id}`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 p-4 max-w-2xl">
      <AdminBreadcrumb items={[{ label: "モデル管理", href: "/admin/catalog" }, { label: "新規作成" }]} />
      <h1 className="text-xl font-bold">モデル新規作成</h1>
      <AdminFormSection title="基本情報">
        <div className="space-y-3">
          <label className="block text-xs font-bold text-[#555]">モデル名 *
            <input value={form.name} onChange={(e) => handleNameChange(e.target.value)} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-bold text-[#555]">メーカー *
              <select value={form.maker_id} onChange={(e) => setForm({ ...form, maker_id: e.target.value })} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm">
                <option value="">選択...</option>
                {makers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold text-[#555]">カテゴリ *
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm">
                {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold text-[#555]">Slug
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm font-mono" />
            </label>
            <label className="block text-xs font-bold text-[#555]">発売年
              <input type="number" value={form.release_year} onChange={(e) => setForm({ ...form, release_year: Number(e.target.value) })} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-bold text-[#555]">発売月
              <select value={form.release_month ?? ""} onChange={(e) => setForm({ ...form, release_month: e.target.value ? Number(e.target.value) : null })} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm">
                <option value="">未設定</option>
                {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}月</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold text-[#555]">価格(税込)
              <input type="number" value={form.price ?? ""} onChange={(e) => setForm({ ...form, price: e.target.value ? Number(e.target.value) : null })} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-[#555]">
            <input type="checkbox" checked={form.is_visible} onChange={(e) => setForm({ ...form, is_visible: e.target.checked })} />
            公開する
          </label>
        </div>
      </AdminFormSection>
      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving || !form.name || !form.maker_id} className="rounded bg-[#006728] px-6 py-2 text-sm font-bold text-white hover:bg-[#005520] disabled:opacity-50">
          {saving ? "保存中..." : "保存してスペック入力へ"}
        </button>
        <button onClick={() => router.push("/admin/catalog")} className="rounded border border-[#ddd] px-6 py-2 text-sm hover:bg-[#f5f5f5]">キャンセル</button>
      </div>
    </div>
  );
}

export default function ModelNewPage() {
  return <Suspense><ModelNewForm /></Suspense>;
}
