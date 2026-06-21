"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { AdminFormSection } from "@/components/admin/admin-form-section";
import { apiFetch } from "@/lib/api-client";

function ShaftNewForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    shaft_name: "",
    maker: "",
    shaft_type: "" as string | null,
    flex: "",
    shaft_weight: null as number | null,
    torque: null as number | null,
    kick_point: "",
  });

  async function handleSave() {
    if (!form.shaft_name) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/admin/catalog/shafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          shaft_type: form.shaft_type || null,
        }),
      });
      if (res.ok) {
        router.push("/admin/catalog/shafts");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 p-4 max-w-2xl">
      <AdminBreadcrumb items={[
        { label: "カタログ", href: "/admin/catalog" },
        { label: "シャフト管理", href: "/admin/catalog/shafts" },
        { label: "新規追加" },
      ]} />
      <h1 className="text-xl font-bold">シャフト新規追加</h1>
      <AdminFormSection title="シャフト情報">
        <div className="space-y-3">
          <label className="block text-xs font-bold text-[#555]">
            シャフト名 *
            <input
              value={form.shaft_name}
              onChange={(e) => setForm({ ...form, shaft_name: e.target.value })}
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
              種類
              <select
                value={form.shaft_type ?? ""}
                onChange={(e) => setForm({ ...form, shaft_type: e.target.value || null })}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
              >
                <option value="">未設定</option>
                <option value="カーボンシャフト">カーボンシャフト</option>
                <option value="スチールシャフト">スチールシャフト</option>
              </select>
            </label>
            <label className="block text-xs font-bold text-[#555]">
              フレックス
              <input
                value={form.flex}
                onChange={(e) => setForm({ ...form, flex: e.target.value })}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-bold text-[#555]">
              重量(g)
              <input
                type="number"
                value={form.shaft_weight ?? ""}
                onChange={(e) => setForm({ ...form, shaft_weight: e.target.value ? Number(e.target.value) : null })}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-bold text-[#555]">
              トルク(°)
              <input
                type="number"
                step="0.1"
                value={form.torque ?? ""}
                onChange={(e) => setForm({ ...form, torque: e.target.value ? Number(e.target.value) : null })}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-bold text-[#555]">
              キックポイント
              <input
                value={form.kick_point}
                onChange={(e) => setForm({ ...form, kick_point: e.target.value })}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
              />
            </label>
          </div>
        </div>
      </AdminFormSection>
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !form.shaft_name}
          className="rounded bg-[#006728] px-6 py-2 text-sm font-bold text-white hover:bg-[#005520] disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
        <button
          onClick={() => router.push("/admin/catalog/shafts")}
          className="rounded border border-[#ddd] px-6 py-2 text-sm hover:bg-[#f5f5f5]"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

export default function ShaftNewPage() {
  return <Suspense><ShaftNewForm /></Suspense>;
}
