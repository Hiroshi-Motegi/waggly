"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { AdminFormSection } from "@/components/admin/admin-form-section";
import { apiFetch } from "@/lib/api-client";

function MakerNewForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    name_ja: "" as string | null,
    slug: "",
  });

  async function handleSave() {
    if (!form.name || !form.slug) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/admin/catalog/makers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          name_ja: form.name_ja || null,
        }),
      });
      if (res.ok) {
        router.push("/admin/catalog/makers");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 p-4 max-w-2xl">
      <AdminBreadcrumb items={[
        { label: "カタログ", href: "/admin/catalog" },
        { label: "メーカー管理", href: "/admin/catalog/makers" },
        { label: "新規追加" },
      ]} />
      <h1 className="text-xl font-bold">メーカー新規追加</h1>
      <AdminFormSection title="メーカー情報">
        <div className="space-y-3">
          <label className="block text-xs font-bold text-[#555]">
            名前 *
            <input
              value={form.name}
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
          <label className="block text-xs font-bold text-[#555]">
            Slug *
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm font-mono"
            />
          </label>
        </div>
      </AdminFormSection>
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !form.name || !form.slug}
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

export default function MakerNewPage() {
  return <Suspense><MakerNewForm /></Suspense>;
}
