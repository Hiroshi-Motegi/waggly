"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { AdminFormSection } from "@/components/admin/admin-form-section";
import { apiFetch } from "@/lib/api-client";

function GripNewForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    grip_name: "",
    maker: "",
    grip_size: "",
    weight: null as number | null,
    material: "",
  });

  async function handleSave() {
    if (!form.grip_name) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/admin/catalog/grips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        router.push("/admin/catalog/grips");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 p-4 max-w-2xl">
      <AdminBreadcrumb items={[
        { label: "カタログ", href: "/admin/catalog" },
        { label: "グリップ管理", href: "/admin/catalog/grips" },
        { label: "新規追加" },
      ]} />
      <h1 className="text-xl font-bold">グリップ新規追加</h1>
      <AdminFormSection title="グリップ情報">
        <div className="space-y-3">
          <label className="block text-xs font-bold text-[#555]">
            グリップ名 *
            <input
              value={form.grip_name}
              onChange={(e) => setForm({ ...form, grip_name: e.target.value })}
              className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-bold text-[#555]">
              メーカー
              <input
                value={form.maker}
                onChange={(e) => setForm({ ...form, maker: e.target.value })}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-bold text-[#555]">
              サイズ
              <input
                value={form.grip_size}
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
                value={form.material}
                onChange={(e) => setForm({ ...form, material: e.target.value })}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
                placeholder="ラバー, コード 等"
              />
            </label>
          </div>
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
