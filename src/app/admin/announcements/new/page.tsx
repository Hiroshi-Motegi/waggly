"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { AdminFormSection } from "@/components/admin/admin-form-section";
import { apiFetch } from "@/lib/api-client";

function AnnouncementNewForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", category: "info", published_at: new Date().toISOString().slice(0, 10),
    body: "", is_published: false,
  });

  async function handleSave() {
    if (!form.title) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/admin/announcements", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) router.push("/admin/announcements");
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4 p-4 max-w-2xl">
      <AdminBreadcrumb items={[{ label: "お知らせ", href: "/admin/announcements" }, { label: "新規作成" }]} />
      <h1 className="text-xl font-bold">お知らせ新規作成</h1>
      <AdminFormSection title="内容">
        <div className="space-y-3">
          <label className="block text-xs font-bold text-[#555]">タイトル *
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-bold text-[#555]">カテゴリ
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm">
                <option value="info">お知らせ</option>
                <option value="feature">機能追加</option>
                <option value="maintenance">メンテナンス</option>
                <option value="campaign">キャンペーン</option>
              </select>
            </label>
            <label className="block text-xs font-bold text-[#555]">公開日
              <input type="date" value={form.published_at} onChange={(e) => setForm({ ...form, published_at: e.target.value })} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm" />
            </label>
          </div>
          <label className="block text-xs font-bold text-[#555]">本文 (Markdown)
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={10} className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm font-mono" />
          </label>
          <label className="flex items-center gap-2 text-xs font-bold text-[#555]">
            <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />
            公開する
          </label>
        </div>
      </AdminFormSection>
      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving || !form.title} className="rounded bg-[#006728] px-6 py-2 text-sm font-bold text-white hover:bg-[#005520] disabled:opacity-50">{saving ? "保存中..." : "保存"}</button>
        <button onClick={() => router.push("/admin/announcements")} className="rounded border border-[#ddd] px-6 py-2 text-sm hover:bg-[#f5f5f5]">キャンセル</button>
      </div>
    </div>
  );
}

export default function AnnouncementNewPage() {
  return <Suspense><AnnouncementNewForm /></Suspense>;
}
